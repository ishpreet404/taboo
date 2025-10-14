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
		origin: "*",
		methods: ["GET", "POST"],
	},
});

app.use(cors());
app.use(express.static("public"));

// Game rooms storage
const gameRooms = new Map();

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

				// If game is in progress, also add player to the game state team
				if (room.started && room.gameState) {
					const teamName = room.gameState.teams[teamIndex].name;
					if (!room.gameState.teams[teamIndex].players.includes(player.name)) {
						room.gameState.teams[teamIndex].players.push(player.name);

						// Initialize describer index if needed
						if (room.gameState.currentDescriberIndex[teamIndex] === undefined) {
							room.gameState.currentDescriberIndex[teamIndex] = 0;
						}

						io.to(roomCode).emit("team-updated-midgame", {
							room,
							gameState: room.gameState,
							joinedPlayer: player.name,
							joinedTeam: teamName,
						});
						console.log(`Player ${player.name} joined ${teamName} mid-game`);
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
				playerContributions: {},
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
			// Update team score
			const teamIndex = room.gameState.currentTeamIndex;
			room.gameState.teams[teamIndex].score += points;

			// Track player contribution
			if (!room.gameState.playerContributions[guesser]) {
				room.gameState.playerContributions[guesser] = { points: 0, words: [] };
			}
			room.gameState.playerContributions[guesser].points += points;
			room.gameState.playerContributions[guesser].words.push(word);

			io.to(roomCode).emit("word-guessed-sync", {
				word,
				wordObj,
				guesser,
				points,
				gameState: room.gameState,
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
		} = data;
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

			// Rotate describer within the team after each turn
			const teamSize = gs.teams[gs.currentTeamIndex].players.length;
			if (teamSize > 0) {
				gs.currentDescriberIndex[gs.currentTeamIndex] =
					gs.turnCount[gs.currentTeamIndex] % teamSize;
			}

			io.to(roomCode).emit("turn-ended", {
				guessedCount,
				skippedCount,
				totalPoints,
				guessedWords,
				guessedByPlayer,
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

			// Move to next team
			const previousTeam = gs.currentTeamIndex;
			gs.currentTeamIndex = (gs.currentTeamIndex + 1) % gs.teams.length;

			// If back to team 0, increment round (completed full cycle)
			if (gs.currentTeamIndex === 0) {
				gs.round++;
			}

			// Check if game is over
			if (gs.round > gs.maxRounds) {
				io.to(roomCode).emit("game-over", { gameState: gs });
				return;
			}

			// Ensure describer index exists for all teams
			if (gs.currentDescriberIndex[gs.currentTeamIndex] === undefined) {
				gs.currentDescriberIndex[gs.currentTeamIndex] = 0;
			}

			// Validate and fix describer indices
			gs.teams.forEach((team, idx) => {
				if (team.players.length > 0) {
					// Ensure index is within bounds
					if (gs.currentDescriberIndex[idx] >= team.players.length) {
						gs.currentDescriberIndex[idx] = 0;
					}
				}
			});

			io.to(roomCode).emit("next-turn-sync", { gameState: gs });
		}
	});

	// Leave game / return to lobby
	socket.on("leave-game", (data) => {
		const { roomCode } = data;
		const room = gameRooms.get(roomCode);

		if (room) {
			room.started = false;
			room.gameState = null;
			io.to(roomCode).emit("game-left", { room });
		}
	});

	// Timer sync
	socket.on("timer-update", (data) => {
		const { roomCode, timeRemaining } = data;
		socket.to(roomCode).emit("timer-sync", { timeRemaining });
	});

	// Bonus words added
	socket.on("bonus-words-added", (data) => {
		const { roomCode, words } = data;
		// Broadcast bonus words to all players
		socket.to(roomCode).emit("bonus-words-sync", { words });
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
						room.gameState.teams.forEach((team) => {
							const teamPlayerIndex = team.players.indexOf(
								disconnectedPlayer.name
							);
							if (teamPlayerIndex !== -1) {
								team.players.splice(teamPlayerIndex, 1);
							}
						});
					}
					// Regular player left, notify others
					io.to(roomCode).emit("player-left", {
						socketId: socket.id,
						playerName: disconnectedPlayer.name,
						room,
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
