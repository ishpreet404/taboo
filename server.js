// Standalone Express + Socket.IO server for local development
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
	cors: {
		origin: [
			"*",
			"http://localhost:3001",
			"https://taboo-inferno.vercel.app",
			"https://discord.com",
			"https://*.discord.com",
		],
		methods: ["GET", "POST"],
		credentials: true,
	},
});

app.use(cors());
app.use(express.static("public"));

// Game rooms storage
const gameRooms = new Map();

// Word database for bonus words
const fs = require('fs');
const wordList = fs.readFileSync(path.join(__dirname, 'wordlist.txt'), 'utf8')
	.split('\n')
	.filter(w => w.trim() && !w.startsWith('TABOO') && !w.startsWith('//'))
	.map(w => w.trim());

// Helper function to generate bonus words
function generateBonusWords(count) {
	const words = [];
	const difficulties = ['easy', 'medium', 'hard'];
	const usedIndices = new Set();

	for (let i = 0; i < count; i++) {
		let randomIndex;
		do {
			randomIndex = Math.floor(Math.random() * wordList.length);
		} while (usedIndices.has(randomIndex));

		usedIndices.add(randomIndex);
		const word = wordList[randomIndex].trim().toUpperCase();
		const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
		const points = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;

		words.push({ word, difficulty, points });
	}

	return words;
}

// Helper function to generate room code
function generateRoomCode() {
	return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on("connection", (socket) => {
	console.log("User connected:", socket.id);

	// Create a new room
	socket.on("create-room", (data) => {
		const roomCode = generateRoomCode();
		const room = {
			code: roomCode,
			host: socket.id,
			players: [
				{
					id: socket.id,
					name: data.playerName,
					team: null,
				},
			],
			gameState: null,
			started: false,
		};

		gameRooms.set(roomCode, room);
		socket.join(roomCode);
		socket.emit("room-created", { roomCode, room });
		console.log(`Room created: ${roomCode}`);
	});

	// Join existing room
	socket.on("join-room", (data) => {
		const { roomCode, playerName } = data;
		const room = gameRooms.get(roomCode);

		if (!room) {
			socket.emit("error", { message: "Room not found" });
			return;
		}

		// Check if player already exists (reconnection)
		const existingPlayer = room.players.find((p) => p.name === playerName);

		if (existingPlayer) {
			// Reconnection - update socket ID
			existingPlayer.id = socket.id;
			socket.join(roomCode);

			if (room.started) {
				socket.emit("room-rejoined", {
					roomCode,
					room,
					gameState: room.gameState,
				});
				io.to(roomCode).emit("player-reconnected", {
					playerName,
					room,
				});
			} else {
				socket.emit("room-joined", { roomCode, room });
				io.to(roomCode).emit("player-joined", {
					player: existingPlayer,
					room,
				});
			}
			console.log(`Player ${playerName} reconnected to room: ${roomCode}`);
			return;
		}

		// New player joining
		const newPlayer = {
			id: socket.id,
			name: playerName,
			team: null,
		};

		room.players.push(newPlayer);
		socket.join(roomCode);

		if (room.started) {
			// Mid-game join - allow them to join and assign to a team later
			socket.emit("room-joined-midgame", {
				roomCode,
				room,
				gameState: room.gameState,
			});
			io.to(roomCode).emit("player-joined-midgame", {
				player: newPlayer,
				room,
			});
			console.log(`Player ${playerName} joined mid-game in room: ${roomCode}`);
		} else {
			// Normal join before game starts
			socket.emit("room-joined", { roomCode, room });
			io.to(roomCode).emit("player-joined", {
				player: newPlayer,
				room,
			});
			console.log(`Player ${playerName} joined room: ${roomCode}`);
		}
	});

	// Assign player to team
	socket.on("join-team", (data) => {
		const { roomCode, teamIndex } = data;
		const room = gameRooms.get(roomCode);

		if (room) {
			const player = room.players.find((p) => p.id === socket.id);
			if (player) {
				player.team = teamIndex;

				// If game is in progress, also update player in the game state teams
				if (room.started && room.gameState) {
					const teamName = room.gameState.teams[teamIndex].name;

					// First, remove player from all teams
					room.gameState.teams.forEach((team) => {
						const playerIndex = team.players.indexOf(player.name);
						if (playerIndex !== -1) {
							team.players.splice(playerIndex, 1);
						}
					});

					// Then add to the new team
					if (!room.gameState.teams[teamIndex].players.includes(player.name)) {
						room.gameState.teams[teamIndex].players.push(player.name);

						// Initialize describer index if needed
						if (room.gameState.currentDescriberIndex[teamIndex] === undefined) {
							room.gameState.currentDescriberIndex[teamIndex] = 0;
						}

						// Check if there's an active turn and send current turn state to the new player
						const turnInProgress = room.gameState.currentWords && room.gameState.currentWords.length > 0;

						io.to(roomCode).emit("team-updated-midgame", {
							room,
							gameState: room.gameState,
							joinedPlayer: player.name,
							joinedTeam: teamName,
							turnInProgress: turnInProgress,
							currentWords: turnInProgress ? room.gameState.currentWords : null,
							timeRemaining: turnInProgress ? room.gameState.timeRemaining : null,
							currentTurnGuessedWords: room.gameState.currentTurnGuessedWords || [],
							currentTurnWrongGuesses: room.gameState.currentTurnWrongGuesses || [],
							guessedByPlayer: room.gameState.guessedByPlayer || [],
						});
						console.log(`Player ${player.name} switched to ${teamName} mid-game`);
						return;
					}
				}

				io.to(roomCode).emit("team-updated", { room });
			}
		}
	});

	// Start game
	socket.on("start-game", (data) => {
		const { roomCode, gameState } = data;
		const room = gameRooms.get(roomCode);

		if (room && room.host === socket.id) {
			room.started = true;

			// Reset game state completely for new game
			room.gameState = {
				...gameState,
				gameStarted: true, // Add this flag for disconnect handler to check
				turnCount: {}, // Reset turn counter
				round: 1,
				currentTeamIndex: 0,
				currentDescriberIndex: [0, 0],
				teams: gameState.teams.map((team) => ({
					...team,
					score: 0,
				})),
				guessedWords: [],
				skippedWords: [],
				currentWords: [],
				currentTurnGuessedWords: [],
				currentTurnWrongGuesses: [],
				playerContributions: {}, // { playerName: { points: 0, guessedWords: [], describedWords: [] } }
			};

			io.to(roomCode).emit("game-started", { gameState: room.gameState });
			console.log(`Game started in room: ${roomCode}`);
		}
	});

	// Sync game state
	socket.on("sync-game-state", (data) => {
		const { roomCode, gameState } = data;
		const room = gameRooms.get(roomCode);

		if (room) {
			room.gameState = gameState;
			io.to(roomCode).emit("game-state-updated", { gameState });
		}
	});

	// Start turn
	socket.on("start-turn", (data) => {
		const { roomCode, words } = data;
		const room = gameRooms.get(roomCode);

		if (room && room.gameState) {
			const gs = room.gameState;

			// Mark that this turn has started for the current team
			if (!gs.turnCount) {
				gs.turnCount = {};
			}
			if (!gs.turnCount[gs.currentTeamIndex]) {
				gs.turnCount[gs.currentTeamIndex] = 0;
			}

			// Clear guessed words for new turn and store current words
			gs.currentTurnGuessedWords = [];
			gs.currentTurnWrongGuesses = [];
			gs.guessedByPlayer = []; // Initialize tracking for who guessed what
			gs.currentWords = words; // Store words in game state for mid-game joins
			gs.timeRemaining = gs.turnTime || 60; // Store initial time

			// Broadcast turn started with words to all players
			io.to(roomCode).emit("turn-started", {
				gameState: gs,
				words: words,
			});
		}
	});

	// Word guessed
	socket.on("word-guessed", (data) => {
		const { roomCode, word, wordObj, guesser, points } = data;
		const room = gameRooms.get(roomCode);

		if (room && room.gameState) {
			const gs = room.gameState;

			// Initialize guessed words tracking if not exists
			if (!gs.currentTurnGuessedWords) {
				gs.currentTurnGuessedWords = [];
			}

			// Initialize guessedByPlayer tracking if not exists
			if (!gs.guessedByPlayer) {
				gs.guessedByPlayer = [];
			}

			// Check if word was already guessed this turn
			const isDuplicate = gs.currentTurnGuessedWords.includes(word);
			const actualPoints = isDuplicate ? 0 : points;

			if (!isDuplicate) {
				// Add to guessed words list only if not duplicate
				gs.currentTurnGuessedWords.push(word);
			} else {
				console.log(`Word "${word}" already guessed by someone else, ${guesser} gets 0 points`);
			}

			// Track who guessed this word (with actual points - 0 if duplicate)
			gs.guessedByPlayer.push({ word, guesser, points: actualPoints, isDuplicate });

			// Update team score (only if not duplicate)
			if (!isDuplicate) {
				const teamIndex = gs.currentTeamIndex;
				gs.teams[teamIndex].score += points;

				// Track player contribution
				if (!gs.playerContributions[guesser]) {
					gs.playerContributions[guesser] = { points: 0, guessedWords: [], describedWords: [] };
				}
				gs.playerContributions[guesser].points += points;
				gs.playerContributions[guesser].guessedWords.push(word);

				// Track describer's success
				const currentDescriber = gs.teams[teamIndex].players[gs.currentDescriberIndex[teamIndex]];
				if (currentDescriber) {
					if (!gs.playerContributions[currentDescriber]) {
						gs.playerContributions[currentDescriber] = { points: 0, guessedWords: [], describedWords: [] };
					}
					gs.playerContributions[currentDescriber].describedWords.push(word);
				}

				// Check for bonus milestones (6, 10, 14, 18, 22...)
				const milestones = [6, 10, 14, 18, 22, 26, 30];
				const currentCount = gs.currentTurnGuessedWords.length;

				if (milestones.includes(currentCount)) {
					// Generate bonus words on server
					const bonusCount = 3 + Math.floor(milestones.indexOf(currentCount) / 2);
					const bonusWords = generateBonusWords(bonusCount);

					// Add to current words
					if (!gs.currentWords) {
						gs.currentWords = [];
					}
					gs.currentWords.push(...bonusWords);

					// Broadcast bonus words to all players
					io.to(roomCode).emit("bonus-words-sync", { words: bonusWords, count: bonusCount });
				}
			}

			// Ensure wordObj has valid points
			const syncWordObj = {
				...wordObj,
				points: typeof wordObj.points === 'number' ? wordObj.points : actualPoints
			};

			io.to(roomCode).emit("word-guessed-sync", {
				word,
				wordObj: syncWordObj,
				guesser,
				points: actualPoints,
				isDuplicate: isDuplicate,
				gameState: gs,
			});
		}
	});

	// Wrong guess
	socket.on("wrong-guess", (data) => {
		const { roomCode, word, guesser } = data;
		const room = gameRooms.get(roomCode);

		if (room && room.gameState) {
			const gs = room.gameState;

			// Initialize wrong guesses tracking if not exists
			if (!gs.currentTurnWrongGuesses) {
				gs.currentTurnWrongGuesses = [];
			}

			// Add to wrong guesses list
			gs.currentTurnWrongGuesses.push({ word, guesser });

			// Broadcast to all players
			io.to(roomCode).emit("wrong-guess-sync", {
				word,
				guesser,
				wrongGuesses: gs.currentTurnWrongGuesses,
			});
		}
	});

	// End turn
	socket.on("end-turn", (data) => {
		const {
			roomCode,
			guessedCount,
			skippedCount,
			totalPoints,
			guessedWords,
			guessedByPlayer,
			allWords,
		} = data;
		const room = gameRooms.get(roomCode);

		if (room && room.gameState) {
			const gs = room.gameState;

			// Clear current words and turn state since turn has ended
			gs.currentWords = [];
			gs.timeRemaining = 0;
			gs.guessedByPlayer = [];

			// Just broadcast the turn ended event
			// Don't rotate describer here - it will be done when next-turn is called
			io.to(roomCode).emit("turn-ended", {
				guessedCount,
				skippedCount,
				totalPoints,
				guessedWords,
				guessedByPlayer,
				allWords, // Send all words to everyone for display
				gameState: gs,
			});
		}
	});

	// Skip turn - describer wants to skip, pass to next teammate
	socket.on("skip-turn", (data) => {
		const { roomCode, playerName } = data;
		const room = gameRooms.get(roomCode);

		if (room && room.gameState) {
			const gs = room.gameState;

			// Increment turn count for this team
			if (!gs.turnCount) {
				gs.turnCount = {};
			}
			if (!gs.turnCount[gs.currentTeamIndex]) {
				gs.turnCount[gs.currentTeamIndex] = 0;
			}
			gs.turnCount[gs.currentTeamIndex]++;

			// Move to next describer in the SAME team (don't skip team's turn)
			const currentTeam = gs.currentTeamIndex;
			const teamSize = gs.teams[currentTeam].players.length;
			if (teamSize > 0) {
				gs.currentDescriberIndex[currentTeam] =
					gs.turnCount[gs.currentTeamIndex] % teamSize;
			}

			// Notify all players
			io.to(roomCode).emit("describer-skipped", {
				playerName: playerName,
				message: `${playerName} skipped describing. Next teammate is now the describer.`,
				gameState: gs,
			});
		}
	});

	// Skip guesser turn
	socket.on("skip-guesser-turn", (data) => {
		const { roomCode, playerName } = data;
		const room = gameRooms.get(roomCode);

		if (room && room.gameState) {
			const gs = room.gameState;

			// Move to next describer in the current team
			const currentTeam = gs.currentTeamIndex;
			gs.currentDescriberIndex[currentTeam] =
				(gs.currentDescriberIndex[currentTeam] + 1) %
				gs.teams[currentTeam].players.length;

			// Notify all players that someone skipped and send updated game state
			io.to(roomCode).emit("describer-skipped", {
				playerName: playerName,
				message: `${playerName} skipped their turn`,
				gameState: gs,
			});
		}
	});

	// Next turn
	socket.on("next-turn", (data) => {
		const { roomCode } = data;
		const room = gameRooms.get(roomCode);

		if (room && room.gameState) {
			const gs = room.gameState;

			// Initialize turnCount if needed
			if (!gs.turnCount) {
				gs.turnCount = {};
			}

			// Mark that the CURRENT team has completed a turn (before switching)
			if (gs.turnCount[gs.currentTeamIndex] === undefined) {
				gs.turnCount[gs.currentTeamIndex] = 0;
			}
			gs.turnCount[gs.currentTeamIndex]++;

			// Move to next team
			gs.currentTeamIndex = (gs.currentTeamIndex + 1) % gs.teams.length;

			// If we've cycled back to team 0 after all teams played, increment round
			if (gs.currentTeamIndex === 0) {
				gs.round++;
			}

			// Check if game is over
			if (gs.round > gs.maxRounds) {
				io.to(roomCode).emit("game-over", { gameState: gs });
				return;
			}

			// Set describer for the NEW current team based on their turn count
			if (gs.turnCount[gs.currentTeamIndex] === undefined) {
				gs.turnCount[gs.currentTeamIndex] = 0;
			}

			const teamSize = gs.teams[gs.currentTeamIndex].players.length;
			if (teamSize > 0) {
				// Describer rotates based on how many turns this team has completed
				gs.currentDescriberIndex[gs.currentTeamIndex] =
					gs.turnCount[gs.currentTeamIndex] % teamSize;
			}

			// Ensure describer index exists for all teams
			gs.teams.forEach((team, idx) => {
				if (gs.currentDescriberIndex[idx] === undefined) {
					gs.currentDescriberIndex[idx] = 0;
				}
				// Validate and fix describer indices
				if (team.players.length > 0) {
					if (gs.currentDescriberIndex[idx] >= team.players.length) {
						gs.currentDescriberIndex[idx] = 0;
					}
				}
			});

			io.to(roomCode).emit("next-turn-sync", { gameState: gs });
		}
	});

	// Leave game / return to lobby (for individual player, not ending the entire game)
	socket.on("leave-game", (data) => {
		const { roomCode } = data;
		const room = gameRooms.get(roomCode);

		if (room) {
			const playerIndex = room.players.findIndex((p) => p.id === socket.id);
			if (playerIndex !== -1) {
				const wasHost = room.host === socket.id;
				const leavingPlayer = room.players[playerIndex];

				// Remove player from room
				room.players.splice(playerIndex, 1);

				// Transfer host if needed
				if (wasHost && room.players.length > 0) {
					room.host = room.players[0].id;
					console.log(
						`Host transferred in room ${roomCode}: ${room.players[0].name}`
					);
					io.to(roomCode).emit("host-changed", {
						newHost: room.players[0].name,
						hostId: room.players[0].id,
						room,
					});
				}

				// If room is empty, delete it
				if (room.players.length === 0) {
					gameRooms.delete(roomCode);
					console.log(`Room ${roomCode} deleted (empty after leave)`);
				} else {
					// Remove player from teams if game has started
					if (room.gameState) {
						let describerLeft = false;
						const currentTeamIndex = room.gameState.currentTeamIndex;

						room.gameState.teams.forEach((team, teamIndex) => {
							const teamPlayerIndex = team.players.indexOf(leavingPlayer.name);
							if (teamPlayerIndex !== -1) {
								// Check if the leaving player is the current describer
								if (
									teamIndex === currentTeamIndex &&
									room.gameState.currentDescriberIndex[teamIndex] ===
									teamPlayerIndex
								) {
									describerLeft = true;
								}

								team.players.splice(teamPlayerIndex, 1);

								// Adjust describer index
								if (
									room.gameState.currentDescriberIndex[teamIndex] !== undefined
								) {
									if (
										teamPlayerIndex <=
										room.gameState.currentDescriberIndex[teamIndex]
									) {
										room.gameState.currentDescriberIndex[teamIndex] = Math.max(
											0,
											room.gameState.currentDescriberIndex[teamIndex] - 1
										);
									}
									// Ensure describer index is within bounds
									if (
										team.players.length > 0 &&
										room.gameState.currentDescriberIndex[teamIndex] >=
										team.players.length
									) {
										room.gameState.currentDescriberIndex[teamIndex] = 0;
									}
								}
							}
						});

						// Check if any team is now empty
						const team0Empty = room.gameState.teams[0].players.length === 0;
						const team1Empty = room.gameState.teams[1].players.length === 0;

						// If current team is empty, notify
						if (
							room.gameState.teams[currentTeamIndex].players.length === 0 &&
							room.gameState.gameStarted
						) {
							if (team0Empty && team1Empty) {
								io.to(roomCode).emit("game-over", {
									gameState: room.gameState,
									message: "All players left. Game ended.",
								});
								room.gameState = null;
								room.started = false;
							} else {
								const otherTeamIndex = currentTeamIndex === 0 ? 1 : 0;
								if (room.gameState.teams[otherTeamIndex].players.length > 0) {
									io.to(roomCode).emit("team-empty-skip", {
										message: `${room.gameState.teams[currentTeamIndex].name} has no players left. Continuing with ${room.gameState.teams[otherTeamIndex].name}.`,
										gameState: room.gameState,
									});
								}
							}
						}

						// If describer left during active turn, notify
						if (describerLeft && room.gameState.gameStarted) {
							const team = room.gameState.teams[currentTeamIndex];
							if (team.players.length > 0) {
								io.to(roomCode).emit("describer-left", {
									message: "Describer left the game. Moving to next teammate.",
									gameState: room.gameState,
								});
							}
						}
					}

					// Notify others that player left
					io.to(roomCode).emit("player-left", {
						socketId: socket.id,
						playerName: leavingPlayer.name,
						room,
						gameState: room.gameState,
					});

					console.log(`${leavingPlayer.name} left room ${roomCode}`);
				}
			}
		}
	});

	// Timer sync
	socket.on("timer-update", (data) => {
		const { roomCode, timeRemaining } = data;
		const room = gameRooms.get(roomCode);

		// Update time remaining in game state
		if (room && room.gameState) {
			room.gameState.timeRemaining = timeRemaining;
		}

		socket.to(roomCode).emit("timer-sync", { timeRemaining });
	});

	// Bonus words added
	// Kick player (host only)
	socket.on("kick-player", (data) => {
		const { roomCode, playerName } = data;
		const room = gameRooms.get(roomCode);

		if (room && room.host === socket.id) {
			// Find the player to kick
			const playerIndex = room.players.findIndex((p) => p.name === playerName);
			if (playerIndex !== -1) {
				const kickedPlayer = room.players[playerIndex];
				room.players.splice(playerIndex, 1);

				// Remove from game state teams if game has started
				if (room.gameState) {
					room.gameState.teams.forEach((team, teamIndex) => {
						const teamPlayerIndex = team.players.indexOf(playerName);
						if (teamPlayerIndex !== -1) {
							team.players.splice(teamPlayerIndex, 1);

							// Adjust describer index if the kicked player was before or at the current describer
							if (
								room.gameState.currentDescriberIndex[teamIndex] !== undefined
							) {
								if (
									teamPlayerIndex <=
									room.gameState.currentDescriberIndex[teamIndex]
								) {
									room.gameState.currentDescriberIndex[teamIndex] = Math.max(
										0,
										room.gameState.currentDescriberIndex[teamIndex] - 1
									);
								}
								// Ensure index is within bounds
								if (
									team.players.length > 0 &&
									room.gameState.currentDescriberIndex[teamIndex] >=
									team.players.length
								) {
									room.gameState.currentDescriberIndex[teamIndex] = 0;
								}
							}
						}
					});
				}

				// Notify all players
				io.to(roomCode).emit("player-kicked", {
					playerName: playerName,
					room: room,
					gameState: room.gameState,
				});

				// Notify the kicked player specifically
				io.to(kickedPlayer.id).emit("you-were-kicked", {
					message: "You have been kicked from the game by the host.",
				});

				console.log(`${playerName} was kicked from room ${roomCode}`);
			}
		}
	});

	// Set describer (host only)
	socket.on("set-describer", (data) => {
		const { roomCode, teamIndex, playerIndex } = data;
		const room = gameRooms.get(roomCode);

		if (room && room.host === socket.id && room.gameState) {
			const gs = room.gameState;

			// Validate team and player indices
			if (
				teamIndex >= 0 &&
				teamIndex < gs.teams.length &&
				playerIndex >= 0 &&
				playerIndex < gs.teams[teamIndex].players.length
			) {
				// Set the describer for the specified team
				gs.currentDescriberIndex[teamIndex] = playerIndex;

				// If setting describer for current team, also update turn
				if (teamIndex === gs.currentTeamIndex) {
					io.to(roomCode).emit("describer-changed", {
						gameState: gs,
						message: `${gs.teams[teamIndex].players[playerIndex]} is now the describer for ${gs.teams[teamIndex].name}`,
					});
				} else {
					io.to(roomCode).emit("describer-changed", {
						gameState: gs,
						message: `${gs.teams[teamIndex].players[playerIndex]} will be the next describer for ${gs.teams[teamIndex].name}`,
					});
				}

				console.log(
					`Host set describer for team ${teamIndex} to player ${playerIndex} in room ${roomCode}`
				);
			}
		}
	});

	// Admin: End game
	socket.on("admin-end-game", (data) => {
		const { roomCode } = data;
		const room = gameRooms.get(roomCode);

		if (room && room.host === socket.id && room.gameState) {
			// Emit game over with admin message
			io.to(roomCode).emit("game-over", {
				gameState: room.gameState,
				message: "Game ended by host",
			});

			// Clear game state
			room.gameState = null;
			room.started = false;
			console.log(`Host ended game in room ${roomCode}`);
		}
	});

	// Admin: Skip turn
	socket.on("admin-skip-turn", (data) => {
		const { roomCode } = data;
		const room = gameRooms.get(roomCode);

		if (room && room.host === socket.id && room.gameState) {
			const gs = room.gameState;

			// Move to next team
			gs.currentTeamIndex = (gs.currentTeamIndex + 1) % gs.teams.length;

			// Check if we completed a round
			if (gs.currentTeamIndex === 0) {
				gs.round++;
				if (gs.round > gs.maxRounds) {
					// Game over
					io.to(roomCode).emit("game-over", {
						gameState: gs,
						message: "Maximum rounds reached",
					});
					room.gameState = null;
					room.started = false;
					return;
				}
			}

			// Emit turn skipped
			io.to(roomCode).emit("turn-skipped", {
				gameState: gs,
				message: `Turn skipped by host. It's now ${gs.teams[gs.currentTeamIndex].name
					}'s turn!`,
			});

			console.log(`Host skipped turn in room ${roomCode}`);
		}
	});

	// Chat message
	socket.on("chat-message", (data) => {
		const { roomCode, message, playerName } = data;
		io.to(roomCode).emit("chat-message-received", {
			message,
			playerName,
			timestamp: Date.now(),
		});
	});

	// Disconnect
	socket.on("disconnect", () => {
		console.log("User disconnected:", socket.id);

		// Remove player from all rooms
		gameRooms.forEach((room, roomCode) => {
			const playerIndex = room.players.findIndex((p) => p.id === socket.id);
			if (playerIndex !== -1) {
				const wasHost = room.host === socket.id;
				const disconnectedPlayer = room.players[playerIndex];
				room.players.splice(playerIndex, 1);

				// If host left, assign a new host from remaining players
				if (wasHost && room.players.length > 0) {
					room.host = room.players[0].id;
					console.log(
						`New host assigned in room ${roomCode}: ${room.players[0].name}`
					);
					io.to(roomCode).emit("host-changed", {
						newHost: room.players[0].name,
						hostId: room.players[0].id,
						room,
					});
				}

				if (room.players.length === 0) {
					// If room is empty, delete it
					gameRooms.delete(roomCode);
					console.log(`Room ${roomCode} deleted (empty)`);
				} else {
					// Remove player from teams if game has started
					if (room.gameState) {
						let describerLeft = false;
						const currentTeamIndex = room.gameState.currentTeamIndex;

						room.gameState.teams.forEach((team, teamIndex) => {
							const teamPlayerIndex = team.players.indexOf(
								disconnectedPlayer.name
							);
							if (teamPlayerIndex !== -1) {
								// Check if the disconnecting player is the current describer
								if (
									teamIndex === currentTeamIndex &&
									room.gameState.currentDescriberIndex[teamIndex] ===
									teamPlayerIndex
								) {
									describerLeft = true;
								}

								team.players.splice(teamPlayerIndex, 1);

								// Adjust describer index if a player before or at the describer position left
								if (
									room.gameState.currentDescriberIndex[teamIndex] !== undefined
								) {
									if (
										teamPlayerIndex <=
										room.gameState.currentDescriberIndex[teamIndex]
									) {
										room.gameState.currentDescriberIndex[teamIndex] = Math.max(
											0,
											room.gameState.currentDescriberIndex[teamIndex] - 1
										);
									}
									// Ensure describer index is within bounds
									if (
										team.players.length > 0 &&
										room.gameState.currentDescriberIndex[teamIndex] >=
										team.players.length
									) {
										room.gameState.currentDescriberIndex[teamIndex] = 0;
									}
								}
							}
						});

						// Check if any team is now empty
						const team0Empty = room.gameState.teams[0].players.length === 0;
						const team1Empty = room.gameState.teams[1].players.length === 0;

						// If current team is empty, move to next team
						if (
							room.gameState.teams[currentTeamIndex].players.length === 0 &&
							room.gameState.gameStarted
						) {
							// If both teams are empty, end the game
							if (team0Empty && team1Empty) {
								io.to(roomCode).emit("game-over", {
									gameState: room.gameState,
									message: "All players left. Game ended.",
								});
								room.gameState = null;
								room.started = false;
							} else {
								// Move to the next team that has players
								const otherTeamIndex = currentTeamIndex === 0 ? 1 : 0;
								if (room.gameState.teams[otherTeamIndex].players.length > 0) {
									io.to(roomCode).emit("team-empty-skip", {
										message: `${room.gameState.teams[currentTeamIndex].name} has no players left. Continuing with ${room.gameState.teams[otherTeamIndex].name}.`,
										gameState: room.gameState,
									});
								}
							}
						}

						// If describer left during active turn, notify players
						if (describerLeft && room.gameState.gameStarted) {
							const team = room.gameState.teams[currentTeamIndex];
							if (team.players.length > 0) {
								io.to(roomCode).emit("describer-left", {
									message: "Describer disconnected. Moving to next teammate.",
									gameState: room.gameState,
								});
							}
						}
					}
					// Regular player left, notify others
					io.to(roomCode).emit("player-left", {
						socketId: socket.id,
						playerName: disconnectedPlayer.name,
						room,
						gameState: room.gameState, // Send updated game state
					});
				}
			}
		});
	});
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
	console.log(`Open http://localhost:${PORT} to play`);
});
