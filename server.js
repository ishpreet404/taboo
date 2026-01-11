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

// Helper function to check if a socket is admin (host or co-admin)
function isAdmin(room, socketId) {
	if (!room) return false;
	return room.host === socketId || (room.coAdmins && room.coAdmins.includes(socketId));
}

// Helper function to get client IP from socket (handles proxies)
function getClientIP(socket) {
	// Check various headers for real IP (handles proxies like nginx, cloudflare, etc.)
	const forwardedFor = socket.handshake.headers['x-forwarded-for'];
	if (forwardedFor) {
		// x-forwarded-for can contain multiple IPs, first one is the client
		return forwardedFor.split(',')[0].trim();
	}

	const realIP = socket.handshake.headers['x-real-ip'];
	if (realIP) {
		return realIP;
	}

	// Fallback to socket address
	return socket.handshake.address;
}

// Word database - load from UNIFIED JSON source
const fs = require("fs");

// Load unified word database from JSON
let wordDatabaseJSON;
try {
	wordDatabaseJSON = JSON.parse(fs.readFileSync(path.join(__dirname, "wordDatabase.json"), "utf8"));
} catch (e) {
	console.error("Failed to load wordDatabase.json, falling back to wordlist.txt");
	wordDatabaseJSON = null;
}

// Smart scoring for hard words based on word characteristics
// Words that are more abstract, longer, or have complex suffixes get higher points
function getHardWordPoints(word, min, max) {
	const lowerWord = word.toLowerCase();

	let score = min; // Start at minimum (26)

	// === EASIER HARD WORDS (26-32 points) ===
	// Common concepts that are relatively easy to describe
	const easyHardWords = [
		'openness', 'happiness', 'sadness', 'kindness', 'weakness', 'darkness',
		'awareness', 'loneliness', 'forgiveness', 'thankfulness', 'friendship',
		'leadership', 'membership', 'partnership', 'relationship', 'ownership',
		'childhood', 'neighborhood', 'brotherhood', 'motherhood', 'fatherhood',
		'freedom', 'boredom', 'wisdom', 'kingdom', 'random',
		'growth', 'strength', 'health', 'wealth', 'death', 'truth', 'youth',
		'anger', 'hunger', 'danger', 'stranger', 'murder', 'wonder',
		'culture', 'nature', 'future', 'picture', 'structure', 'adventure',
		'pressure', 'pleasure', 'treasure', 'measure', 'leisure',
		'balance', 'distance', 'instance', 'substance', 'importance',
		'difference', 'confidence', 'patience', 'violence', 'silence',
		'experience', 'audience', 'science', 'absence', 'presence',
		'knowledge', 'marriage', 'courage', 'language', 'damage', 'image',
		'message', 'passage', 'storage', 'usage', 'package', 'garbage',
		'privacy', 'accuracy', 'democracy', 'legacy', 'literacy',
		'anxiety', 'variety', 'society', 'reality', 'quality', 'ability',
		'activity', 'identity', 'authority', 'community', 'opportunity',
		'security', 'majority', 'minority', 'priority', 'celebrity',
		'creativity', 'electricity', 'university', 'personality', 'responsibility',
		'addiction', 'tradition', 'religion', 'decision', 'vision', 'mission',
		'fashion', 'passion', 'expression', 'impression', 'depression',
		'attention', 'intention', 'invention', 'prevention', 'convention',
		'education', 'situation', 'information', 'communication', 'organization',
		'celebration', 'imagination', 'generation', 'population', 'reputation',
		'motivation', 'destination', 'examination', 'explanation', 'expectation',
		'movement', 'government', 'environment', 'entertainment', 'development',
		'agreement', 'treatment', 'statement', 'management', 'achievement',
		'excitement', 'improvement', 'employment', 'equipment', 'experiment',
		'behavior', 'neighbor', 'favor', 'flavor', 'honor', 'humor', 'color',
		'failure', 'feature', 'creature', 'temperature', 'furniture', 'signature',
		'literature', 'architecture', 'agriculture', 'manufacture', 'departure',
		'survival', 'arrival', 'approval', 'removal', 'proposal', 'disposal',
		'betrayal', 'denial', 'trial', 'burial', 'material', 'memorial'
	];

	// Check if word matches any easy hard word pattern
	for (const easyWord of easyHardWords) {
		if (lowerWord === easyWord || lowerWord.includes(easyWord)) {
			return min + Math.floor(Math.random() * 7); // 26-32 points
		}
	}

	// === WORD LENGTH SCORING ===
	// Shorter words (under 10 chars) are often easier to describe
	if (lowerWord.length <= 8) {
		score += 0; // Keep at base
	} else if (lowerWord.length <= 11) {
		score += 3; // Slightly harder
	} else if (lowerWord.length <= 14) {
		score += 6; // Medium-hard
	} else if (lowerWord.length <= 17) {
		score += 10; // Hard
	} else {
		score += 14; // Very hard (long words)
	}

	// === ABSTRACT SUFFIX SCORING ===
	// Very abstract/philosophical suffixes (hardest to describe)
	const veryHardSuffixes = [
		'ism', 'ization', 'ification', 'ousness', 'escence', 'itude',
		'acity', 'icity', 'uality', 'ility', 'osity', 'iety'
	];

	// Moderately hard suffixes
	const hardSuffixes = [
		'tion', 'sion', 'ness', 'ment', 'ance', 'ence', 'ity', 'acy', 'ery'
	];

	// Check suffixes
	for (const suffix of veryHardSuffixes) {
		if (lowerWord.endsWith(suffix)) {
			score += 8;
			break;
		}
	}

	for (const suffix of hardSuffixes) {
		if (lowerWord.endsWith(suffix)) {
			score += 4;
			break;
		}
	}

	// === ABSTRACT PREFIX SCORING ===
	const abstractPrefixes = [
		'meta', 'pseudo', 'quasi', 'neo', 'anti', 'counter', 'trans', 'ultra',
		'hyper', 'super', 'multi', 'poly', 'omni', 'pan', 'proto', 'para'
	];

	for (const prefix of abstractPrefixes) {
		if (lowerWord.startsWith(prefix)) {
			score += 4;
			break;
		}
	}

	// === VERY ABSTRACT CONCEPTS (highest points) ===
	const veryAbstractWords = [
		'epistemology', 'ontology', 'phenomenology', 'metaphysics', 'hermeneutics',
		'dialectic', 'eschatology', 'teleology', 'axiology', 'deontology',
		'solipsism', 'nihilism', 'existentialism', 'determinism', 'relativism',
		'empiricism', 'rationalism', 'pragmatism', 'positivism', 'structuralism',
		'postmodernism', 'deconstruction', 'reductionism', 'materialism', 'idealism',
		'hegemony', 'paradigm', 'zeitgeist', 'praxis', 'gestalt', 'ethos', 'pathos',
		'hubris', 'catharsis', 'mimesis', 'anagnorisis', 'peripeteia',
		'verisimilitude', 'simulacrum', 'simulacra', 'hyperreality',
		'commodification', 'reification', 'alienation', 'objectification',
		'interpellation', 'subjectification', 'deterritorialization',
		'rhizome', 'assemblage', 'immanence', 'transcendence', 'haecceity',
		'quiddity', 'aseity', 'ipseity', 'alterity', 'aporia', 'differance',
		'apotheosis', 'sublimation', 'cathexis', 'transference', 'jouissance'
	];

	for (const abstractWord of veryAbstractWords) {
		if (lowerWord === abstractWord) {
			return max - Math.floor(Math.random() * 5); // 46-50 points
		}
	}

	// Add small random variance (0-3 points)
	score += Math.floor(Math.random() * 4);

	// Clamp to valid range
	return Math.min(max, Math.max(min, score));
}

// Build word database from unified source
let wordDatabase = [];

if (wordDatabaseJSON) {
	// Build from unified JSON - explicit difficulty categories
	const pointRanges = wordDatabaseJSON.points;

	for (const difficulty of ['easy', 'medium', 'hard']) {
		const words = wordDatabaseJSON.words[difficulty] || [];
		const range = pointRanges[difficulty];

		words.forEach(word => {
			let points;
			if (difficulty === 'hard') {
				// Use smart scoring for hard words
				points = getHardWordPoints(word, range.min, range.max);
			} else {
				// Random points for easy and medium
				points = range.min + Math.floor(Math.random() * (range.max - range.min + 1));
			}
			wordDatabase.push({
				word: word.toUpperCase(),
				difficulty,
				points
			});
		});
	}
} else {
	// Fallback to old wordlist.txt
	const wordList = fs
		.readFileSync(path.join(__dirname, "wordlist.txt"), "utf8")
		.split("\n")
		.filter((w) => w.trim() && !w.startsWith("TABOO") && !w.startsWith("//"))
		.map((w) => w.trim());

	wordDatabase = wordList.map((word) => {
		const upperWord = word.toUpperCase();
		return { word: upperWord, difficulty: "easy", points: 10 };
	});
}

// Log word distribution
const easyCount = wordDatabase.filter(w => w.difficulty === 'easy').length;
const mediumCount = wordDatabase.filter(w => w.difficulty === 'medium').length;
const hardCount = wordDatabase.filter(w => w.difficulty === 'hard').length;
console.log(`Word database loaded: ${easyCount} easy, ${mediumCount} medium, ${hardCount} hard (total: ${wordDatabase.length})`);

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

// DYNAMIC DISTRIBUTION GENERATOR
// Creates varied but fair distributions for each round
// Average target: 35% easy, 40% medium, 25% hard
function generateRoundDistribution(wordsPerTurn = 10) {
	// Define distribution patterns (all sum to 10 for a 10-word turn)
	const patterns = [
		{ easy: 4, medium: 4, hard: 2 },  // Balanced (standard)
		{ easy: 5, medium: 3, hard: 2 },  // Easier round
		{ easy: 3, medium: 5, hard: 2 },  // Medium-heavy
		{ easy: 3, medium: 4, hard: 3 },  // Harder round
		{ easy: 4, medium: 3, hard: 3 },  // Hard-leaning
		{ easy: 5, medium: 4, hard: 1 },  // Very easy round
		{ easy: 2, medium: 5, hard: 3 },  // Challenge round
		{ easy: 4, medium: 5, hard: 1 },  // Medium-focused
		{ easy: 3, medium: 3, hard: 4 },  // Hard round
		{ easy: 6, medium: 3, hard: 1 },  // Breather round
	];

	// Select random pattern
	const pattern = patterns[Math.floor(Math.random() * patterns.length)];

	// Scale if wordsPerTurn is different from 10
	if (wordsPerTurn !== 10) {
		const scale = wordsPerTurn / 10;
		return {
			easy: Math.round(pattern.easy * scale),
			medium: Math.round(pattern.medium * scale),
			hard: Math.max(1, wordsPerTurn - Math.round(pattern.easy * scale) - Math.round(pattern.medium * scale))
		};
	}

	return { ...pattern };
}

// Generate paired distributions for fairness - both teams get same pattern per round
function generateFairRoundDistributions(roundCount, teamCount, wordsPerTurn = 10) {
	const distributions = [];

	for (let round = 0; round < roundCount; round++) {
		// Generate ONE distribution pattern for this round
		const pattern = generateRoundDistribution(wordsPerTurn);
		// Both teams will use the same pattern for fairness
		distributions.push(pattern);
	}

	return distributions;
}

// Helper function to select words avoiding already used ones (legacy - uses new ratio)
// Target: 35% easy, 40% medium, 25% hard (for 10 words: 4 easy, 4 medium, 2 hard)
function selectWords(count, usedWordIndices, ensureHardWords = false) {
	// Get indices of words we haven't used yet
	let availableIndices = wordDatabase
		.map((_, index) => index)
		.filter(index => !usedWordIndices.has(index));

	// If we've used more than 80% of words, reset the used words set
	if (availableIndices.length < wordDatabase.length * 0.2) {
		usedWordIndices.clear();
		availableIndices = wordDatabase.map((_, index) => index);
	}

	let selectedWords = [];
	const selectedIndices = [];

	// Use the new distribution: 35% easy, 40% medium, 25% hard
	const hardWordIndices = shuffleArray(availableIndices.filter(index =>
		wordDatabase[index].difficulty === 'hard'
	));
	const mediumWordIndices = shuffleArray(availableIndices.filter(index =>
		wordDatabase[index].difficulty === 'medium'
	));
	const easyWordIndices = shuffleArray(availableIndices.filter(index =>
		wordDatabase[index].difficulty === 'easy'
	));

	// Calculate distribution: 4 easy, 4 medium, 2 hard for 10 words
	const distribution = count === 10
		? { easy: 4, medium: 4, hard: 2 }
		: {
			easy: Math.round(count * 0.35),
			medium: Math.round(count * 0.40),
			hard: count - Math.round(count * 0.35) - Math.round(count * 0.40)
		};

	// Select from each difficulty pool
	const selectedEasy = easyWordIndices.slice(0, Math.min(distribution.easy, easyWordIndices.length));
	const selectedMedium = mediumWordIndices.slice(0, Math.min(distribution.medium, mediumWordIndices.length));
	const selectedHard = hardWordIndices.slice(0, Math.min(distribution.hard, hardWordIndices.length));

	selectedIndices.push(...selectedEasy, ...selectedMedium, ...selectedHard);

	// If we still need more words, fill from remaining available
	if (selectedIndices.length < count) {
		const remainingIndices = availableIndices.filter(index =>
			!selectedIndices.includes(index)
		);
		const shuffledRemainingIndices = shuffleArray(remainingIndices);
		const additionalIndices = shuffledRemainingIndices.slice(0, count - selectedIndices.length);
		selectedIndices.push(...additionalIndices);
	}

	// Get word objects and mark as used
	selectedWords = selectedIndices.map(index => {
		usedWordIndices.add(index);
		return wordDatabase[index];
	});

	// Sort by difficulty for better gameplay (easy to hard)
	return selectedWords.sort((a, b) => {
		const difficultyOrder = { easy: 0, medium: 1, hard: 2 };
		return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
	});
}

// WORD DISTRIBUTION SYSTEM
// Target ratio: 35% easy, 40% medium, 25% hard
// Ensures both teams receive equivalent difficulty distribution

const DIFFICULTY_RATIO = {
	easy: 0.35,    // 35%
	medium: 0.40,  // 40%
	hard: 0.25     // 25%
};

// For a 10-word turn: 4 easy, 4 medium, 2 hard (closest to ratio)
const TURN_DISTRIBUTION = {
	easy: 4,
	medium: 4,
	hard: 2
};

// Initialize word pools by difficulty (pre-shuffled)
function initializeWordPools(usedWordIndices) {
	let availableIndices = wordDatabase
		.map((_, index) => index)
		.filter(index => !usedWordIndices.has(index));

	// If we've used more than 80% of words, reset
	if (availableIndices.length < wordDatabase.length * 0.2) {
		usedWordIndices.clear();
		availableIndices = wordDatabase.map((_, index) => index);
	}

	const pools = {
		easy: shuffleArray(availableIndices.filter(i => wordDatabase[i].difficulty === 'easy')),
		medium: shuffleArray(availableIndices.filter(i => wordDatabase[i].difficulty === 'medium')),
		hard: shuffleArray(availableIndices.filter(i => wordDatabase[i].difficulty === 'hard'))
	};

	return pools;
}

// Generate paired word batches for both teams to ensure fairness
// Each team gets a batch with identical difficulty distribution
// customDistribution: optional { easy, medium, hard } to override dynamic generation
function generateTeamWordBatches(room, wordsPerBatch, teamCount, customDistribution = null) {
	// Initialize or refresh word pools if needed
	if (!room.wordPools ||
		!room.wordPools.easy || room.wordPools.easy.length < wordsPerBatch * teamCount ||
		!room.wordPools.medium || room.wordPools.medium.length < wordsPerBatch * teamCount ||
		!room.wordPools.hard || room.wordPools.hard.length < wordsPerBatch * teamCount) {
		room.wordPools = initializeWordPools(room.usedWordIndices);
	}

	// Use custom distribution or generate dynamic one
	let distribution;
	if (customDistribution) {
		distribution = { ...customDistribution };
	} else {
		// Use dynamic round distribution for variety
		distribution = generateRoundDistribution(wordsPerBatch);
	}

	// Generate batches for each team with same distribution (fairness)
	const teamBatches = [];
	for (let team = 0; team < teamCount; team++) {
		const batch = [];

		// Pull words for each difficulty level
		for (const diff of ['easy', 'medium', 'hard']) {
			const count = distribution[diff];
			for (let i = 0; i < count; i++) {
				if (room.wordPools[diff] && room.wordPools[diff].length > 0) {
					const wordIndex = room.wordPools[diff].shift();
					room.usedWordIndices.add(wordIndex);
					batch.push(wordDatabase[wordIndex]);
				} else {
					// Fallback: try to get from another difficulty if pool is exhausted
					const fallbackDiff = diff === 'easy' ? 'medium' : (diff === 'medium' ? 'easy' : 'medium');
					if (room.wordPools[fallbackDiff] && room.wordPools[fallbackDiff].length > 0) {
						const wordIndex = room.wordPools[fallbackDiff].shift();
						room.usedWordIndices.add(wordIndex);
						batch.push(wordDatabase[wordIndex]);
					}
				}
			}
		}

		// Shuffle the batch so easy/medium/hard aren't always in same order
		teamBatches.push(shuffleArray(batch));
	}

	return teamBatches;
}

// Generate a fair game pool - creates paired rounds for all teams
function generateGameWordPool(room, totalRounds, teamCount) {
	const wordsPerTurn = 10;
	const bonusWordsPerTurn = 15; // Extra buffer for bonus words per turn
	const wordsNeededPerTeamPerRound = wordsPerTurn + bonusWordsPerTurn;

	// Initialize tracking for team word distribution
	room.teamWordBatches = {};
	room.teamBonusPools = {};
	room.teamWordStats = {};

	for (let team = 0; team < teamCount; team++) {
		room.teamWordBatches[team] = [];
		room.teamBonusPools[team] = [];
		room.teamWordStats[team] = { easy: 0, medium: 0, hard: 0, total: 0 };
	}

	// Pre-generate word batches for all rounds
	for (let round = 0; round < totalRounds; round++) {
		// Generate main turn words (same distribution for both teams)
		const turnBatches = generateTeamWordBatches(room, wordsPerTurn, teamCount);

		// Generate bonus word pool (same distribution for both teams)
		const bonusBatches = generateTeamWordBatches(room, bonusWordsPerTurn, teamCount);

		for (let team = 0; team < teamCount; team++) {
			room.teamWordBatches[team].push(turnBatches[team]);
			room.teamBonusPools[team].push(bonusBatches[team]);

			// Track stats
			[...turnBatches[team], ...bonusBatches[team]].forEach(word => {
				room.teamWordStats[team][word.difficulty]++;
				room.teamWordStats[team].total++;
			});
		}
	}

	// Track current round index per team
	room.teamRoundIndex = {};
	room.teamBonusIndex = {};
	for (let team = 0; team < teamCount; team++) {
		room.teamRoundIndex[team] = 0;
		room.teamBonusIndex[team] = 0;
	}

	console.log('Word distribution stats per team:', room.teamWordStats);
}

// Get words for a team's turn - ensures exact distribution
function getWordsForTeamTurn(room, teamIndex, count = 10) {
	const roundIndex = room.teamRoundIndex[teamIndex] || 0;

	// Get the pre-generated batch for this team's turn
	if (room.teamWordBatches &&
		room.teamWordBatches[teamIndex] &&
		room.teamWordBatches[teamIndex][roundIndex]) {

		const words = room.teamWordBatches[teamIndex][roundIndex];
		room.teamRoundIndex[teamIndex] = roundIndex + 1;
		room.teamBonusIndex[teamIndex] = 0; // Reset bonus index for new turn

		// Sort by difficulty for gameplay (easy first)
		return words.slice(0, count).sort((a, b) => {
			const difficultyOrder = { easy: 0, medium: 1, hard: 2 };
			return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
		});
	}

	// Fallback: generate new batches if pool exhausted
	const teamCount = room.gameState?.teamCount || 2;
	generateGameWordPool(room, 5, teamCount);
	return getWordsForTeamTurn(room, teamIndex, count);
}

// Get bonus words for a team - maintains same difficulty ratio
function getBonusWordsForTeam(room, teamIndex, count) {
	const roundIndex = (room.teamRoundIndex[teamIndex] || 1) - 1; // Current round
	let bonusIndex = room.teamBonusIndex[teamIndex] || 0;

	if (room.teamBonusPools &&
		room.teamBonusPools[teamIndex] &&
		room.teamBonusPools[teamIndex][roundIndex]) {

		const bonusPool = room.teamBonusPools[teamIndex][roundIndex];
		const words = bonusPool.slice(bonusIndex, bonusIndex + count);
		room.teamBonusIndex[teamIndex] = bonusIndex + words.length;

		// If we got enough words, return them sorted
		if (words.length >= count) {
			return words.sort((a, b) => {
				const difficultyOrder = { easy: 0, medium: 1, hard: 2 };
				return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
			});
		}

		// If not enough in current round's pool, get from next round's pool
		const needed = count - words.length;
		const nextRound = roundIndex + 1;
		if (room.teamBonusPools[teamIndex][nextRound]) {
			const moreWords = room.teamBonusPools[teamIndex][nextRound].slice(0, needed);
			words.push(...moreWords);
		}

		return words.sort((a, b) => {
			const difficultyOrder = { easy: 0, medium: 1, hard: 2 };
			return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
		});
	}

	// Fallback: generate fresh words with proper distribution
	return generateBonusWordsWithRatio(room, count);
}

// Generate bonus words maintaining the difficulty ratio
function generateBonusWordsWithRatio(room, count) {
	const words = [];

	// Calculate distribution for bonus words
	const distribution = {
		easy: Math.round(count * DIFFICULTY_RATIO.easy),
		medium: Math.round(count * DIFFICULTY_RATIO.medium),
		hard: count - Math.round(count * DIFFICULTY_RATIO.easy) - Math.round(count * DIFFICULTY_RATIO.medium)
	};

	// Ensure minimum 1 of each if count >= 3
	if (count >= 3) {
		distribution.easy = Math.max(1, distribution.easy);
		distribution.medium = Math.max(1, distribution.medium);
		distribution.hard = Math.max(1, distribution.hard);

		// Rebalance if over count
		while (distribution.easy + distribution.medium + distribution.hard > count) {
			if (distribution.medium > 1) distribution.medium--;
			else if (distribution.easy > 1) distribution.easy--;
			else distribution.hard--;
		}
	}

	// Initialize pools if needed
	if (!room.wordPools) {
		room.wordPools = initializeWordPools(room.usedWordIndices);
	}

	// Pull words from pools
	for (const diff of ['easy', 'medium', 'hard']) {
		for (let i = 0; i < distribution[diff]; i++) {
			if (room.wordPools[diff] && room.wordPools[diff].length > 0) {
				const wordIndex = room.wordPools[diff].shift();
				room.usedWordIndices.add(wordIndex);
				words.push(wordDatabase[wordIndex]);
			}
		}
	}

	return shuffleArray(words);
}

// Get progressive bonus words with specific difficulty targeting
// difficultyType: 'easy', 'medium', 'hard-mixed'
function getProgressiveBonusWords(room, count, difficultyType) {
	const words = [];

	// Initialize pools if needed
	if (!room.wordPools) {
		room.wordPools = initializeWordPools(room.usedWordIndices);
	}

	// Log pool sizes before selection
	console.log(`[BONUS] Getting ${count} ${difficultyType} words. Pool sizes: easy=${room.wordPools.easy?.length || 0}, medium=${room.wordPools.medium?.length || 0}, hard=${room.wordPools.hard?.length || 0}`);

	// Refresh pools if running low on the requested difficulty
	let needsRefresh = false;
	if (difficultyType === 'easy' && (!room.wordPools.easy || room.wordPools.easy.length < count)) {
		needsRefresh = true;
	} else if (difficultyType === 'medium' && (!room.wordPools.medium || room.wordPools.medium.length < count)) {
		needsRefresh = true;
	} else if (difficultyType === 'hard-mixed') {
		const hardNeeded = Math.ceil(count * 0.4);
		const mediumNeeded = count - hardNeeded;
		if ((!room.wordPools.medium || room.wordPools.medium.length < mediumNeeded) ||
			(!room.wordPools.hard || room.wordPools.hard.length < hardNeeded)) {
			needsRefresh = true;
		}
	}

	if (needsRefresh) {
		console.log(`[BONUS] Refreshing word pools...`);
		room.wordPools = initializeWordPools(room.usedWordIndices);
		console.log(`[BONUS] After refresh: easy=${room.wordPools.easy?.length || 0}, medium=${room.wordPools.medium?.length || 0}, hard=${room.wordPools.hard?.length || 0}`);
	}

	let distribution;

	switch (difficultyType) {
		case 'easy':
			// All easy words
			distribution = { easy: count, medium: 0, hard: 0 };
			break;
		case 'medium':
			// All medium words
			distribution = { easy: 0, medium: count, hard: 0 };
			break;
		case 'hard-mixed':
			// Mix of medium and hard (60% medium, 40% hard)
			const hardCount = Math.ceil(count * 0.4);
			const mediumCount = count - hardCount;
			distribution = { easy: 0, medium: mediumCount, hard: hardCount };
			break;
		default:
			// Default mixed distribution
			distribution = {
				easy: Math.round(count * 0.35),
				medium: Math.round(count * 0.40),
				hard: count - Math.round(count * 0.35) - Math.round(count * 0.40)
			};
	}

	console.log(`[BONUS] Distribution for ${difficultyType}:`, distribution);

	// Pull words from pools based on distribution
	for (const diff of ['easy', 'medium', 'hard']) {
		for (let i = 0; i < distribution[diff]; i++) {
			if (room.wordPools[diff] && room.wordPools[diff].length > 0) {
				const wordIndex = room.wordPools[diff].shift();
				room.usedWordIndices.add(wordIndex);
				words.push(wordDatabase[wordIndex]);
			} else {
				// Fallback: try to get from adjacent difficulty
				const fallbackDiff = diff === 'easy' ? 'medium' : (diff === 'hard' ? 'medium' : 'easy');
				if (room.wordPools[fallbackDiff] && room.wordPools[fallbackDiff].length > 0) {
					const wordIndex = room.wordPools[fallbackDiff].shift();
					room.usedWordIndices.add(wordIndex);
					words.push(wordDatabase[wordIndex]);
					console.log(`[BONUS] Fallback: wanted ${diff}, got ${wordDatabase[wordIndex].difficulty}`);
				}
			}
		}
	}

	// Log the result
	const resultCounts = { easy: 0, medium: 0, hard: 0 };
	words.forEach(w => resultCounts[w.difficulty]++);
	console.log(`[BONUS] Selected ${words.length} words:`, resultCounts);

	// Sort by difficulty (easy first for better UX)
	return words.sort((a, b) => {
		const difficultyOrder = { easy: 0, medium: 1, hard: 2 };
		return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
	});
}

// Get dynamic bonus words with specific distribution pattern
// pattern: { easy: number, medium: number, hard: number, count: number }
function getDynamicBonusWords(room, pattern) {
	const words = [];
	const distribution = { easy: pattern.easy, medium: pattern.medium, hard: pattern.hard };
	const totalNeeded = pattern.count;

	// Initialize pools if needed
	if (!room.wordPools) {
		room.wordPools = initializeWordPools(room.usedWordIndices);
	}

	console.log(`[DYNAMIC BONUS] Pattern: e${pattern.easy} m${pattern.medium} h${pattern.hard}`);
	console.log(`[DYNAMIC BONUS] Pool sizes: easy=${room.wordPools.easy?.length || 0}, medium=${room.wordPools.medium?.length || 0}, hard=${room.wordPools.hard?.length || 0}`);

	// Check if we need to refresh pools
	const needsRefresh =
		(distribution.easy > 0 && (!room.wordPools.easy || room.wordPools.easy.length < distribution.easy)) ||
		(distribution.medium > 0 && (!room.wordPools.medium || room.wordPools.medium.length < distribution.medium)) ||
		(distribution.hard > 0 && (!room.wordPools.hard || room.wordPools.hard.length < distribution.hard));

	if (needsRefresh) {
		console.log(`[DYNAMIC BONUS] Refreshing word pools...`);
		room.wordPools = initializeWordPools(room.usedWordIndices);
	}

	// Pull words from pools based on distribution
	for (const diff of ['easy', 'medium', 'hard']) {
		for (let i = 0; i < distribution[diff]; i++) {
			if (room.wordPools[diff] && room.wordPools[diff].length > 0) {
				const wordIndex = room.wordPools[diff].shift();
				room.usedWordIndices.add(wordIndex);
				words.push(wordDatabase[wordIndex]);
			} else {
				// Fallback: try adjacent difficulty
				const fallbacks = diff === 'easy' ? ['medium', 'hard'] :
					diff === 'hard' ? ['medium', 'easy'] :
						['easy', 'hard'];
				for (const fb of fallbacks) {
					if (room.wordPools[fb] && room.wordPools[fb].length > 0) {
						const wordIndex = room.wordPools[fb].shift();
						room.usedWordIndices.add(wordIndex);
						words.push(wordDatabase[wordIndex]);
						console.log(`[DYNAMIC BONUS] Fallback: wanted ${diff}, got ${fb}`);
						break;
					}
				}
			}
		}
	}

	// Log the result
	const resultCounts = { easy: 0, medium: 0, hard: 0 };
	words.forEach(w => resultCounts[w.difficulty]++);
	console.log(`[DYNAMIC BONUS] Selected ${words.length} words:`, resultCounts);

	// Shuffle the words so they're not in difficulty order (more fun!)
	return shuffleArray(words);
}

// Legacy wrapper for backward compatibility
function getWordsFromPool(room, count, ensureMixedDifficulty = false) {
	const teamIndex = room.gameState?.currentTeamIndex || 0;

	if (ensureMixedDifficulty) {
		return getWordsForTeamTurn(room, teamIndex, count);
	} else {
		return getBonusWordsForTeam(room, teamIndex, count);
	}
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
					sessionId: data.sessionId || null, // Store session ID for reconnection
				},
			],
			gameState: null,
			started: false,
			teamSwitchingLocked: false,
			usedWordIndices: new Set(), // Track used words to prevent repetition
			teamCount: 2, // Default to 2 teams
			disconnectedPlayers: new Map(), // Track disconnected players for grace period
			tabooReporting: false, // Taboo reporting off by default
			tabooVoting: false, // Taboo voting off by default
			roundHistory: [], // Store round history for reconnecting players
			bannedPlayers: new Set(), // Track banned player names (for display)
			bannedIPs: new Set(), // Track banned IPs to prevent rejoining
		};

		gameRooms.set(roomCode, room);
		socket.join(roomCode);
		socket.emit("room-created", { roomCode, room });
		console.log(`Room created: ${roomCode}`);
	});

	// Reconnect to existing session
	socket.on("reconnect-session", (data) => {
		const { roomCode, playerName, sessionId } = data;
		const room = gameRooms.get(roomCode);

		if (!room) {
			socket.emit("reconnect-failed", { message: "Room no longer exists" });
			return;
		}

		// Get client IP for ban checking
		const clientIP = getClientIP(socket);

		// Check if player's IP is banned
		if (room.bannedIPs && room.bannedIPs.has(clientIP)) {
			socket.emit("reconnect-failed", { message: "You have been banned from this room" });
			return;
		}

		// Also check name-based ban as fallback
		if (room.bannedPlayers && room.bannedPlayers.has(playerName)) {
			socket.emit("reconnect-failed", { message: "You have been banned from this room" });
			return;
		}

		// Find player by sessionId or name
		const existingPlayer = room.players.find(
			(p) => (p.sessionId && p.sessionId === sessionId) || p.name === playerName
		);

		// Also check disconnected players waiting for reconnection
		const disconnectedInfo = room.disconnectedPlayers?.get(playerName);

		if (existingPlayer) {
			// Clear any pending disconnect timer
			if (disconnectedInfo?.timer) {
				clearTimeout(disconnectedInfo.timer);
				room.disconnectedPlayers.delete(playerName);
			}

			// Update socket ID
			const oldSocketId = existingPlayer.id;
			existingPlayer.id = socket.id;
			existingPlayer.sessionId = sessionId;

			// Update host if this was the host
			const wasHost = room.host === oldSocketId;
			if (wasHost) {
				room.host = socket.id;
			}

			// Update co-admin if this was a co-admin
			if (room.coAdmins && room.coAdmins.includes(oldSocketId)) {
				room.coAdmins = room.coAdmins.filter((id) => id !== oldSocketId);
				room.coAdmins.push(socket.id);
			}

			socket.join(roomCode);

			// Check if player is co-admin
			const isCoAdmin = room.coAdmins && room.coAdmins.includes(socket.id);

			// Calculate real-time remaining if there's an active turn
			let gameStateWithTime = room.gameState;
			if (room.gameState && room.gameState.turnActive && room.gameState.turnStartTime) {
				const elapsedSeconds = Math.floor((Date.now() - room.gameState.turnStartTime) / 1000);
				const turnTime = room.gameState.turnTime || 60;
				const actualTimeRemaining = Math.max(0, turnTime - elapsedSeconds);
				// Create a copy with updated time
				gameStateWithTime = {
					...room.gameState,
					timeRemaining: actualTimeRemaining
				};
			}

			socket.emit("reconnect-success", {
				roomCode,
				room,
				gameState: gameStateWithTime,
				isHost: room.host === socket.id,
				isCoAdmin,
				playerName: existingPlayer.name,
				roundHistory: room.roundHistory || [],
				tabooReporting: room.tabooReporting || false,
				tabooVoting: room.tabooVoting || false,
			});

			io.to(roomCode).emit("player-reconnected", {
				playerName: existingPlayer.name,
				room,
			});

			console.log(`Player ${playerName} reconnected to room ${roomCode}`);
		} else {
			socket.emit("reconnect-failed", { message: "Session not found in room" });
		}
	});

	// Join existing room
	socket.on("join-room", (data) => {
		const { roomCode, playerName, sessionId } = data;
		const room = gameRooms.get(roomCode);

		if (!room) {
			socket.emit("error", { message: "Room not found" });
			return;
		}

		// Get client IP for ban checking
		const clientIP = getClientIP(socket);

		// Check if player's IP is banned
		if (room.bannedIPs && room.bannedIPs.has(clientIP)) {
			socket.emit("error", { message: "You have been banned from this room and cannot rejoin" });
			return;
		}

		// Also check name-based ban as fallback (in case IP changed)
		if (room.bannedPlayers && room.bannedPlayers.has(playerName)) {
			socket.emit("error", { message: "You have been banned from this room" });
			return;
		}

		// Check if player already exists (reconnection)
		const existingPlayer = room.players.find((p) => p.name === playerName);

		if (existingPlayer) {
			// Reconnection - update socket ID and session ID
			existingPlayer.id = socket.id;
			existingPlayer.sessionId = sessionId;
			socket.join(roomCode);

			if (room.started) {
				// Calculate real-time remaining if there's an active turn
				let gameStateWithTime = room.gameState;
				if (room.gameState && room.gameState.turnActive && room.gameState.turnStartTime) {
					const elapsedSeconds = Math.floor((Date.now() - room.gameState.turnStartTime) / 1000);
					const turnTime = room.gameState.turnTime || 60;
					const actualTimeRemaining = Math.max(0, turnTime - elapsedSeconds);
					// Create a copy with updated time
					gameStateWithTime = {
						...room.gameState,
						timeRemaining: actualTimeRemaining
					};
				}

				socket.emit("room-rejoined", {
					roomCode,
					room,
					gameState: gameStateWithTime,
					roundHistory: room.roundHistory || [],
					tabooReporting: room.tabooReporting || false,
					tabooVoting: room.tabooVoting || false,
				});
				io.to(roomCode).emit("player-reconnected", {
					playerName,
					room,
				});
			} else {
				socket.emit("room-joined", {
					roomCode,
					room,
					teamCount: room.teamCount || 2,
					tabooReporting: room.tabooReporting || false,
					tabooVoting: room.tabooVoting || false
				});
				io.to(roomCode).emit("player-joined", {
					player: existingPlayer,
					room,
					teamCount: room.teamCount || 2,
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
			sessionId: sessionId || null, // Store session ID for reconnection
		};

		room.players.push(newPlayer);
		socket.join(roomCode);

		if (room.started) {
			// Mid-game join - allow them to join and assign to a team later
			socket.emit("room-joined-midgame", {
				roomCode,
				room,
				gameState: room.gameState,
				teamCount: room.gameState?.teamCount || 2,
			});
			io.to(roomCode).emit("player-joined-midgame", {
				player: newPlayer,
				room,
			});
			console.log(`Player ${playerName} joined mid-game in room: ${roomCode}`);
		} else {
			// Normal join before game starts
			socket.emit("room-joined", {
				roomCode,
				room,
				teamCount: room.teamCount || 2,
				tabooReporting: room.tabooReporting || false,
				tabooVoting: room.tabooVoting || false
			});
			io.to(roomCode).emit("player-joined", {
				player: newPlayer,
				room,
				teamCount: room.teamCount || 2,
			});
			console.log(`Player ${playerName} joined room: ${roomCode}`);
		}
	});

	// Assign player to team
	socket.on("join-team", (data) => {
		const { roomCode, teamIndex } = data;
		const room = gameRooms.get(roomCode);

		if (room) {
			// Check if team switching is locked
			if (room.teamSwitchingLocked) {
				socket.emit("error", {
					message: "Team switching is currently locked by the host",
				});
				return;
			}

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
						const turnInProgress =
							room.gameState.currentWords &&
							room.gameState.currentWords.length > 0;

						io.to(roomCode).emit("team-updated-midgame", {
							room,
							gameState: room.gameState,
							joinedPlayer: player.name,
							joinedTeam: teamName,
							turnInProgress: turnInProgress,
							currentWords: turnInProgress ? room.gameState.currentWords : null,
							timeRemaining: turnInProgress
								? room.gameState.timeRemaining
								: null,
							currentTurnGuessedWords:
								room.gameState.currentTurnGuessedWords || [],
							currentTurnWrongGuesses:
								room.gameState.currentTurnWrongGuesses || [],
							guessedByPlayer: room.gameState.guessedByPlayer || [],
						});
						console.log(
							`Player ${player.name} switched to ${teamName} mid-game`
						);
						return;
					}
				}

				io.to(roomCode).emit("team-updated", { room });
			}
		}
	});

	// Set team count (host only)
	socket.on("set-team-count", (data) => {
		const { roomCode, teamCount } = data;
		const room = gameRooms.get(roomCode);

		if (room && room.host === socket.id) {
			// Store team count in room
			room.teamCount = teamCount;
			// Broadcast the team count to all players in the room
			io.to(roomCode).emit("team-count-changed", { teamCount });
			console.log(`Team count set to ${teamCount} in room ${roomCode}`);
		}
	});

	// Set taboo settings (host or admin)
	socket.on("set-taboo-settings", (data) => {
		const { roomCode, tabooReporting, tabooVoting } = data;
		const room = gameRooms.get(roomCode);

		if (room) {
			// Check if sender is host or co-admin using the helper
			if (isAdmin(room, socket.id)) {
				room.tabooReporting = tabooReporting;
				room.tabooVoting = tabooVoting;
				// Also update gameState if it exists
				if (room.gameState) {
					room.gameState.tabooReporting = tabooReporting;
					room.gameState.tabooVoting = tabooVoting;
				}
				// Broadcast settings to all players
				io.to(roomCode).emit("taboo-settings-changed", { tabooReporting, tabooVoting });
				console.log(`Taboo settings updated in room ${roomCode}: reporting=${tabooReporting}, voting=${tabooVoting}`);
			} else {
				console.log(`Unauthorized taboo settings change attempt in room ${roomCode} by socket ${socket.id}`);
			}
		}
	});

	// Start game
	socket.on("start-game", (data) => {
		const { roomCode, gameState } = data;
		const room = gameRooms.get(roomCode);

		if (room && room.host === socket.id) {
			room.started = true;

			// Ensure we have the right number of teams based on teamCount
			const teamCount = gameState.teamCount || 2;
			const teams = [];

			// Create teams based on teamCount
			for (let i = 0; i < teamCount; i++) {
				teams.push({
					name: gameState.teams[i]?.name || `Team ${i + 1}`,
					players: gameState.teams[i]?.players || [],
					score: 0
				});
			}

			// Reset game state completely for new game
			room.gameState = {
				...gameState,
				teamCount: teamCount, // Store team count
				gameStarted: true, // Add this flag for disconnect handler to check
				turnCount: {}, // Reset turn counter
				round: 1,
				currentTeamIndex: 0,
				currentDescriberIndex: Array(teamCount).fill(0),
				teams: teams,
				guessedWords: [],
				skippedWords: [],
				currentWords: [],
				currentTurnGuessedWords: [],
				currentTurnWrongGuesses: [],
				playerContributions: {}, // { playerName: { points: 0, guessedWords: [], describedWords: [] } }
				tabooReporting: room.tabooReporting || false, // Default disabled
				tabooVoting: room.tabooVoting || false, // Default disabled
				confirmedTaboosByTeam: {}, // Track taboo point deductions per team: { teamIndex: totalPoints }
			};

			// Reset used words for the new game
			room.usedWordIndices = new Set();
			room.wordPools = null; // Reset word pools

			// Pre-generate fair word pools for all teams
			// This ensures both teams get identical difficulty distribution
			const estimatedTurnsPerTeam = gameState.maxRounds || 5;
			generateGameWordPool(room, estimatedTurnsPerTeam, teamCount);

			console.log(`Game word pools generated: ${estimatedTurnsPerTeam} rounds for ${teamCount} teams`);
			console.log(`Target distribution: 35% easy, 40% medium, 25% hard`);

			io.to(roomCode).emit("game-started", { gameState: room.gameState });
			console.log(`Game started in room: ${roomCode} with ${teamCount} teams`);
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

	// Start turn - generate words on server
	socket.on("start-turn", (data) => {
		const { roomCode } = data;
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

			// Get words from the pre-generated pool to ensure fairness
			const words = getWordsFromPool(room, 10, true);

			// Clear guessed words for new turn and store current words
			gs.currentTurnGuessedWords = [];
			gs.currentTurnWrongGuesses = [];
			gs.guessedByPlayer = []; // Initialize tracking for who guessed what
			gs.currentWords = words; // Store words in game state for mid-game joins
			gs.timeRemaining = gs.turnTime || 60; // Store initial time
			gs.turnStartTime = Date.now(); // Record server timestamp when turn starts
			gs.turnActive = true; // Mark turn as active
			gs.tabooVotes = {}; // Clear taboo votes for new turn
			gs.confirmedTaboos = []; // Clear confirmed taboos for new turn
			gs.confirmedTabooDetails = []; // Clear taboo details for new turn

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

			// Validate guess timing with grace period
			const GRACE_PERIOD_MS = 3000; // 3 second grace period for network latency
			const turnDuration = (gs.turnTime || 60) * 1000; // Convert to milliseconds
			const elapsedTime = Date.now() - (gs.turnStartTime || Date.now());
			const maxAllowedTime = turnDuration + GRACE_PERIOD_MS;

			// Reject guess if it arrives too late (after turn time + grace period)
			if (!gs.turnActive || elapsedTime > maxAllowedTime) {
				console.log(`Late guess rejected from ${guesser}: "${word}" arrived ${Math.floor(elapsedTime / 1000)}s after turn start (max allowed: ${Math.floor(maxAllowedTime / 1000)}s)`);
				// Notify the specific player that their guess was too late
				io.to(socket.id).emit("guess-rejected", {
					message: "Time's up! Your guess arrived too late.",
					word: word
				});
				return; // Don't process late guesses
			}

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
				console.log(
					`Word "${word}" already guessed by someone else, ${guesser} gets 0 points`
				);
			}

			// Track who guessed this word (with actual points - 0 if duplicate)
			gs.guessedByPlayer.push({
				word,
				guesser,
				points: actualPoints,
				isDuplicate,
			});

			// Update team score (only if not duplicate)
			if (!isDuplicate) {
				const teamIndex = gs.currentTeamIndex;
				gs.teams[teamIndex].score += points;

				// Track player contribution
				if (!gs.playerContributions[guesser]) {
					gs.playerContributions[guesser] = {
						points: 0,
						guessedWords: [],
						describedWords: [],
					};
				}
				gs.playerContributions[guesser].points += points;
				gs.playerContributions[guesser].guessedWords.push(word);

				// Track describer's success
				const currentDescriber =
					gs.teams[teamIndex].players[gs.currentDescriberIndex[teamIndex]];
				if (currentDescriber) {
					if (!gs.playerContributions[currentDescriber]) {
						gs.playerContributions[currentDescriber] = {
							points: 0,
							guessedWords: [],
							describedWords: [],
						};
					}
					gs.playerContributions[currentDescriber].describedWords.push(word);
				}

				// Check for bonus milestones (6, 10, 14, 18, 22...)
				// Dynamic bonus system with progressive difficulty
				// 1st bonus: Easy focused (warm up)
				// 2nd+ bonus: Dynamic mix that gets progressively challenging
				const milestones = [6, 10, 14, 18, 22, 26, 30];
				const currentCount = gs.currentTurnGuessedWords.length;

				if (milestones.includes(currentCount)) {
					const milestoneIndex = milestones.indexOf(currentCount);

					// Dynamic bonus distribution patterns
					// Each pattern: { easy, medium, hard, count }
					const BONUS_PATTERNS = {
						// First bonus: Always easy-focused (3 words)
						first: [
							{ easy: 3, medium: 0, hard: 0, count: 3 },  // All easy
						],
						// Second bonus: Medium-focused with variety (5 words)
						second: [
							{ easy: 1, medium: 4, hard: 0, count: 5 },  // Medium heavy
							{ easy: 2, medium: 3, hard: 0, count: 5 },  // Balanced easy-medium
							{ easy: 0, medium: 5, hard: 0, count: 5 },  // All medium
							{ easy: 1, medium: 3, hard: 1, count: 5 },  // Light challenge
						],
						// Third bonus: Challenge mix (5 words)
						third: [
							{ easy: 0, medium: 3, hard: 2, count: 5 },  // Medium-hard mix
							{ easy: 1, medium: 2, hard: 2, count: 5 },  // Balanced challenge
							{ easy: 0, medium: 2, hard: 3, count: 5 },  // Hard heavy
							{ easy: 1, medium: 3, hard: 1, count: 5 },  // Medium focused
						],
						// Fourth+ bonus: Dynamic challenge (5 words)
						later: [
							{ easy: 0, medium: 2, hard: 3, count: 5 },  // Hard heavy
							{ easy: 1, medium: 2, hard: 2, count: 5 },  // Balanced hard
							{ easy: 0, medium: 3, hard: 2, count: 5 },  // Medium-hard
							{ easy: 0, medium: 1, hard: 4, count: 5 },  // Very hard
							{ easy: 1, medium: 1, hard: 3, count: 5 },  // Hard challenge
							{ easy: 0, medium: 4, hard: 1, count: 5 },  // Medium breather
						]
					};

					// Select appropriate pattern pool based on milestone
					let patternPool;
					if (milestoneIndex === 0) {
						patternPool = BONUS_PATTERNS.first;
					} else if (milestoneIndex === 1) {
						patternPool = BONUS_PATTERNS.second;
					} else if (milestoneIndex === 2) {
						patternPool = BONUS_PATTERNS.third;
					} else {
						patternPool = BONUS_PATTERNS.later;
					}

					// Randomly select a pattern from the pool
					const selectedPattern = patternPool[Math.floor(Math.random() * patternPool.length)];
					const bonusCount = selectedPattern.count;

					console.log(`[BONUS] Milestone ${milestoneIndex + 1}: Selected pattern`, selectedPattern);

					// Get bonus words with the dynamic distribution
					const bonusWords = getDynamicBonusWords(room, selectedPattern);

					// Add to current words
					if (!gs.currentWords) {
						gs.currentWords = [];
					}
					gs.currentWords.push(...bonusWords);

					// Broadcast bonus words to all players
					io.to(roomCode).emit("bonus-words-sync", {
						words: bonusWords,
						count: bonusCount,
						difficulty: `e${selectedPattern.easy}m${selectedPattern.medium}h${selectedPattern.hard}`,
						pattern: selectedPattern
					});
				}
			}

			// Ensure wordObj has valid points
			const syncWordObj = {
				...wordObj,
				points:
					typeof wordObj.points === "number" ? wordObj.points : actualPoints,
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

	// Report taboo - watchers can report if describer used taboo word
	socket.on("report-taboo", (data) => {
		const { roomCode, word, voter, voterTeam } = data;
		const room = gameRooms.get(roomCode);

		if (room && room.gameState) {
			const gs = room.gameState;

			// Check if taboo reporting is enabled
			if (room.tabooReporting === false) {
				console.log(`Taboo reporting is disabled in room ${roomCode}`);
				return;
			}

			// Initialize taboo tracking if not exists
			if (!gs.tabooVotes) {
				gs.tabooVotes = {};
			}
			if (!gs.confirmedTaboos) {
				gs.confirmedTaboos = [];
			}

			// Check if voter is on the watching team (not the current playing team)
			if (voterTeam === gs.currentTeamIndex) {
				console.log(`Invalid taboo vote: ${voter} is on the current team`);
				return;
			}

			// Initialize votes for this word if not exists
			if (!gs.tabooVotes[word]) {
				gs.tabooVotes[word] = [];
			}

			// Check if already voted
			if (gs.tabooVotes[word].includes(voter)) {
				console.log(`${voter} already voted for ${word} as taboo`);
				return;
			}

			// Add vote
			gs.tabooVotes[word].push(voter);
			console.log(`${voter} reported "${word}" as taboo. Votes: ${gs.tabooVotes[word].length}`);

			// Calculate total watching team players (all teams except current team)
			let watchingTeamPlayers = 0;
			gs.teams.forEach((team, idx) => {
				if (idx !== gs.currentTeamIndex) {
					watchingTeamPlayers += team.players.length;
				}
			});

			// Check if majority (>50%) voted
			const voteCount = gs.tabooVotes[word].length;
			const threshold = Math.floor(watchingTeamPlayers / 2) + 1;
			let newlyConfirmed = null;
			let wordPoints = 0;

			if (voteCount >= threshold && !gs.confirmedTaboos.includes(word)) {
				gs.confirmedTaboos.push(word);
				newlyConfirmed = word;
				// Find the word's points from current words
				const wordObj = gs.currentWords?.find(w => w.word === word);
				wordPoints = wordObj?.points || 0;
				// Track taboo words with points for turn summary
				if (!gs.confirmedTabooDetails) {
					gs.confirmedTabooDetails = [];
				}
				gs.confirmedTabooDetails.push({ word, points: wordPoints });
				console.log(`"${word}" confirmed as TABOO by majority vote (${voteCount}/${watchingTeamPlayers}), ${wordPoints} pts`);
			}

			// Get current team players for client-side filtering
			const currentTeamPlayers = gs.teams[gs.currentTeamIndex]?.players || [];

			// Broadcast to all players
			io.to(roomCode).emit("taboo-vote-sync", {
				tabooVotes: gs.tabooVotes,
				confirmedTaboos: gs.confirmedTaboos,
				newlyConfirmed: newlyConfirmed,
				wordPoints: wordPoints,
				currentTeamIndex: gs.currentTeamIndex,
				currentTeamPlayers: currentTeamPlayers, // Include current team players for notification filtering
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

			// Get describer info for this turn
			const currentTeam = gs.teams[gs.currentTeamIndex];
			const describerIndex = gs.currentDescriberIndex[gs.currentTeamIndex];
			const describer = currentTeam?.players?.[describerIndex] || 'Unknown';

			// Check if there are any reported taboo words that need voting
			const pendingTabooWords = [];
			if (gs.confirmedTaboos && gs.confirmedTaboos.length > 0 && gs.confirmedTabooDetails) {
				gs.confirmedTabooDetails.forEach(taboo => {
					pendingTabooWords.push({
						word: taboo.word,
						points: taboo.points,
						teamIndex: gs.currentTeamIndex,
						describer: describer
					});
				});
			}

			console.log(`[END-TURN] Room ${roomCode}: pendingTabooWords count = ${pendingTabooWords.length}`);
			if (pendingTabooWords.length > 0) {
				console.log(`[END-TURN] Pending taboo words:`, pendingTabooWords);
			}

			// Get all socket IDs in the room for debugging
			const roomSockets = io.sockets.adapter.rooms.get(roomCode);
			const socketCount = roomSockets ? roomSockets.size : 0;
			console.log(`[END-TURN] Broadcasting turn-ended to room ${roomCode} with ${socketCount} connected sockets`);
			if (roomSockets) {
				const socketIds = Array.from(roomSockets);
				console.log(`[END-TURN] Socket IDs in room:`, socketIds);
				// Also log the player names for each socket
				socketIds.forEach(sid => {
					const s = io.sockets.sockets.get(sid);
					console.log(`[END-TURN] Socket ${sid} player: ${s?.playerName || 'unknown'}`);
				});
			}

			// Broadcast the turn ended event with pending taboo info to ALL sockets in room
			io.to(roomCode).emit("turn-ended", {
				guessedCount,
				skippedCount,
				totalPoints,
				guessedWords: guessedWords || gs.currentTurnGuessedWords || [],
				guessedByPlayer: guessedByPlayer || gs.guessedByPlayer || [],
				allWords: allWords || [],
				gameState: gs,
				pendingTabooWords: pendingTabooWords, // Include pending taboos in turn-ended event
			});

			// Store round history for session persistence
			if (!room.roundHistory) {
				room.roundHistory = [];
			}
			room.roundHistory.push({
				round: gs.round,
				teamIndex: gs.currentTeamIndex,
				describer: describer,
				teamName: gs.teams[gs.currentTeamIndex]?.name || `Team ${gs.currentTeamIndex + 1}`,
				tabooWords: pendingTabooWords.length > 0 ? pendingTabooWords.map(t => ({
					word: t.word,
					points: t.points,
					confirmed: false // Will be updated when voting completes
				})) : undefined
			});

			// Clear current words and turn state
			gs.currentWords = [];
			gs.timeRemaining = 0;
			gs.guessedByPlayer = [];
			gs.turnActive = false;
			gs.turnStartTime = null;

			// If there are pending taboo words, handle based on taboo settings
			if (pendingTabooWords.length > 0) {
				const tabooVotingEnabled = room.tabooVoting !== false; // Default to enabled

				if (tabooVotingEnabled) {
					// Voting is enabled - start the voting phase
					gs.pendingTabooVoting = {
						words: pendingTabooWords,
						votes: {},
						timeRemaining: 30,
						startTime: Date.now()
					};

					// Broadcast voting start after a short delay to ensure turn-ended is processed first
					setTimeout(() => {
						io.to(roomCode).emit("taboo-voting-start", {
							pendingTabooWords: pendingTabooWords
						});
					}, 100);

					// Start voting timer
					const votingInterval = setInterval(() => {
						const room = gameRooms.get(roomCode);
						if (!room || !room.gameState || !room.gameState.pendingTabooVoting) {
							clearInterval(votingInterval);
							return;
						}

						const voting = room.gameState.pendingTabooVoting;
						const elapsed = Math.floor((Date.now() - voting.startTime) / 1000);
						voting.timeRemaining = Math.max(0, 30 - elapsed);

						// Sync time to all players
						io.to(roomCode).emit("round-end-vote-sync", {
							votes: voting.votes,
							timeRemaining: voting.timeRemaining
						});

						// Check if voting time is up
						if (voting.timeRemaining <= 0) {
							clearInterval(votingInterval);
							completeTabooVoting(roomCode);
						}
					}, 1000);
				} else {
					// Voting is disabled but reporting is on - auto-confirm all reported taboos
					console.log(`[TABOO] Voting disabled in room ${roomCode} - auto-confirming ${pendingTabooWords.length} taboos`);

					// Initialize confirmedTaboosByTeam if not exists (store total deductions per team)
					if (!gs.confirmedTaboosByTeam) {
						gs.confirmedTaboosByTeam = {};
					}

					// All reported taboos are auto-confirmed - build proper format
					const confirmedTabooWords = pendingTabooWords.map(tabooWord => ({
						word: tabooWord.word,
						points: tabooWord.points,
						teamIndex: tabooWord.teamIndex,
						describer: tabooWord.describer
					}));

					// Add up deductions and track per player
					confirmedTabooWords.forEach(taboo => {
						// Use teamIndex from the taboo word itself
						if (!gs.confirmedTaboosByTeam[taboo.teamIndex]) {
							gs.confirmedTaboosByTeam[taboo.teamIndex] = 0;
						}
						gs.confirmedTaboosByTeam[taboo.teamIndex] += taboo.points;

						// Also track taboo words per player in playerContributions
						if (taboo.describer) {
							if (!gs.playerContributions[taboo.describer]) {
								gs.playerContributions[taboo.describer] = {
									points: 0,
									guessedWords: [],
									describedWords: [],
									tabooWords: []
								};
							}
							if (!gs.playerContributions[taboo.describer].tabooWords) {
								gs.playerContributions[taboo.describer].tabooWords = [];
							}
							gs.playerContributions[taboo.describer].tabooWords.push({
								word: taboo.word,
								points: taboo.points
							});
						}
					});

					// Emit voting complete with all words confirmed (using same format as completeTabooVoting)
					io.to(roomCode).emit("taboo-voting-complete", {
						confirmedTabooWords: confirmedTabooWords,
						failedTabooWords: [],
						confirmedTaboosByTeam: gs.confirmedTaboosByTeam
					});
				}
			}
		}
	});

	// Handle round-end taboo voting
	socket.on("round-end-taboo-vote", (data) => {
		const { roomCode, word, voter, voteType } = data;
		const room = gameRooms.get(roomCode);

		if (room && room.gameState && room.gameState.pendingTabooVoting) {
			const voting = room.gameState.pendingTabooVoting;
			const gs = room.gameState;

			// Initialize votes for this word if not exists (now has yes and no arrays)
			if (!voting.votes[word]) {
				voting.votes[word] = { yes: [], no: [] };
			}

			// Check if already voted (in either yes or no)
			if (voting.votes[word].yes.includes(voter) || voting.votes[word].no.includes(voter)) {
				return;
			}

			// Add vote to appropriate array
			if (voteType === 'yes') {
				voting.votes[word].yes.push(voter);
			} else {
				voting.votes[word].no.push(voter);
			}

			// Calculate if word is finalized (>60% yes votes of total votes cast)
			const yesCount = voting.votes[word].yes.length;
			const noCount = voting.votes[word].no.length;
			const totalVotes = yesCount + noCount;
			const yesPercentage = totalVotes > 0 ? (yesCount / totalVotes) * 100 : 0;

			// Update finalized status in pending words
			const wordIndex = voting.words.findIndex(w => w.word === word);
			if (wordIndex >= 0) {
				voting.words[wordIndex].finalized = yesPercentage >= 60;
			}

			// Broadcast updated votes with finalized status
			io.to(roomCode).emit("round-end-vote-sync", {
				votes: voting.votes,
				timeRemaining: voting.timeRemaining,
				pendingTabooWords: voting.words
			});

			// Check if all players have voted on all words - end voting early
			const totalPlayers = gs.teams.reduce((sum, team) => sum + team.players.length, 0);
			let allVoted = true;
			for (const pendingWord of voting.words) {
				const wordVotes = voting.votes[pendingWord.word];
				const wordTotalVotes = (wordVotes?.yes?.length || 0) + (wordVotes?.no?.length || 0);
				if (wordTotalVotes < totalPlayers) {
					allVoted = false;
					break;
				}
			}

			if (allVoted) {
				console.log(`[VOTING] All ${totalPlayers} players have voted on all words - ending voting early`);
				completeTabooVoting(roomCode);
			}
		}
	});

	// Helper function to complete taboo voting
	function completeTabooVoting(roomCode) {
		const room = gameRooms.get(roomCode);
		if (!room || !room.gameState || !room.gameState.pendingTabooVoting) {
			return;
		}

		const gs = room.gameState;
		const voting = gs.pendingTabooVoting;

		const confirmedTabooWords = [];
		const failedTabooWords = [];

		voting.words.forEach(tabooWord => {
			const yesCount = voting.votes[tabooWord.word]?.yes?.length || 0;
			const noCount = voting.votes[tabooWord.word]?.no?.length || 0;
			const totalVotes = yesCount + noCount;
			// 60% threshold based on votes cast (yes votes / total votes)
			const yesPercentage = totalVotes > 0 ? (yesCount / totalVotes) * 100 : 0;

			if (yesPercentage >= 60) {
				confirmedTabooWords.push({
					word: tabooWord.word,
					points: tabooWord.points,
					teamIndex: tabooWord.teamIndex,
					describer: tabooWord.describer
				});
			} else {
				failedTabooWords.push({
					word: tabooWord.word,
					points: tabooWord.points,
					teamIndex: tabooWord.teamIndex,
					describer: tabooWord.describer
				});
			}
		});

		// Track confirmed taboo deductions per team
		if (!gs.confirmedTaboosByTeam) {
			gs.confirmedTaboosByTeam = {};
		}
		confirmedTabooWords.forEach(taboo => {
			if (!gs.confirmedTaboosByTeam[taboo.teamIndex]) {
				gs.confirmedTaboosByTeam[taboo.teamIndex] = 0;
			}
			gs.confirmedTaboosByTeam[taboo.teamIndex] += taboo.points;

			// Also track taboo words per player in playerContributions
			if (taboo.describer) {
				if (!gs.playerContributions[taboo.describer]) {
					gs.playerContributions[taboo.describer] = {
						points: 0,
						guessedWords: [],
						describedWords: [],
						tabooWords: []
					};
				}
				if (!gs.playerContributions[taboo.describer].tabooWords) {
					gs.playerContributions[taboo.describer].tabooWords = [];
				}
				gs.playerContributions[taboo.describer].tabooWords.push({
					word: taboo.word,
					points: taboo.points
				});
			}
		});

		// Update roundHistory to mark confirmed/failed taboos
		if (room.roundHistory) {
			const confirmedWordNames = confirmedTabooWords.map(t => t.word);
			const failedWordNames = failedTabooWords.map(t => t.word);

			room.roundHistory = room.roundHistory.map(entry => {
				if (entry.tabooWords && entry.tabooWords.length > 0) {
					return {
						...entry,
						tabooWords: entry.tabooWords
							.filter(t => !failedWordNames.includes(t.word)) // Remove failed taboos
							.map(t => ({
								...t,
								confirmed: confirmedWordNames.includes(t.word) ? true : t.confirmed
							}))
					};
				}
				return entry;
			});
		}

		// Clear the voting state
		gs.pendingTabooVoting = null;
		gs.confirmedTaboos = [];
		gs.confirmedTabooDetails = [];
		gs.tabooVotes = {};

		// Broadcast voting complete with both confirmed and failed words and updated deductions
		io.to(roomCode).emit("taboo-voting-complete", {
			confirmedTabooWords: confirmedTabooWords,
			failedTabooWords: failedTabooWords,
			confirmedTaboosByTeam: gs.confirmedTaboosByTeam
		});
	}

	// Skip turn - describer wants to skip, pass to next teammate
	socket.on("skip-turn", (data) => {
		const { roomCode, playerName } = data;
		const room = gameRooms.get(roomCode);

		if (room && room.gameState) {
			const gs = room.gameState;

			// Mark turn as inactive when skipped
			gs.turnActive = false;
			gs.turnStartTime = null;

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

			// Mark turn as inactive when skipped
			gs.turnActive = false;
			gs.turnStartTime = null;

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

				// Make the leaving player leave the socket room to disconnect them properly
				socket.leave(roomCode);

				// Notify the leaving player that they've left (similar to kick)
				socket.emit("you-left-game", {
					message: "You have left the game.",
				});

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
	// Toggle co-admin (host only) - can add or remove co-admin
	socket.on("toggle-co-admin", (data) => {
		const { roomCode, playerName } = data;
		const room = gameRooms.get(roomCode);

		if (room && room.host === socket.id) {
			// Initialize co-admins array if it doesn't exist
			if (!room.coAdmins) {
				room.coAdmins = [];
			}

			// Find the player's socket id
			const player = room.players.find((p) => p.name === playerName);
			if (player) {
				const isCurrentlyCoAdmin = room.coAdmins.includes(player.id);

				if (isCurrentlyCoAdmin) {
					// Remove co-admin
					room.coAdmins = room.coAdmins.filter(id => id !== player.id);

					// Notify the player they are no longer a co-admin
					io.to(player.id).emit("removed-co-admin", {
						message: "You are no longer a co-admin."
					});

					// Notify all players in the room
					io.to(roomCode).emit("player-demoted", {
						playerName: playerName,
						message: `${playerName} is no longer a co-admin.`
					});

					console.log(`${playerName} is no longer a co-admin in room ${roomCode}`);
				} else {
					// Add co-admin
					room.coAdmins.push(player.id);

					// Notify the player they are now a co-admin
					io.to(player.id).emit("made-co-admin", {
						message: "You are now a co-admin! You have access to admin controls."
					});

					// Notify all players in the room
					io.to(roomCode).emit("player-promoted", {
						playerName: playerName,
						message: `${playerName} is now a co-admin!`
					});

					console.log(`${playerName} is now a co-admin in room ${roomCode}`);
				}
			}
		}
	});

	// Legacy: Make co-admin (host only) - kept for backwards compatibility
	socket.on("make-co-admin", (data) => {
		const { roomCode, playerName } = data;
		const room = gameRooms.get(roomCode);

		if (room && room.host === socket.id) {
			// Initialize co-admins array if it doesn't exist
			if (!room.coAdmins) {
				room.coAdmins = [];
			}

			// Find the player's socket id
			const player = room.players.find((p) => p.name === playerName);
			if (player && !room.coAdmins.includes(player.id)) {
				room.coAdmins.push(player.id);

				// Notify the player they are now a co-admin
				io.to(player.id).emit("made-co-admin", {
					message: "You are now a co-admin! You have access to admin controls."
				});

				// Notify all players in the room
				io.to(roomCode).emit("player-promoted", {
					playerName: playerName,
					message: `${playerName} is now a co-admin!`
				});

				console.log(`${playerName} is now a co-admin in room ${roomCode}`);
			}
		}
	});

	// Kick player (host only)
	socket.on("kick-player", (data) => {
		const { roomCode, playerName, ban } = data;
		const room = gameRooms.get(roomCode);

		if (room && room.host === socket.id) {
			// Find the player to kick
			const playerIndex = room.players.findIndex((p) => p.name === playerName);
			if (playerIndex !== -1) {
				const kickedPlayer = room.players[playerIndex];
				room.players.splice(playerIndex, 1);

				// Add to banned list if ban option is true
				if (ban) {
					// Ban by player name (as fallback)
					if (!room.bannedPlayers) {
						room.bannedPlayers = new Set();
					}
					room.bannedPlayers.add(playerName);

					// Ban by IP address (main ban mechanism)
					if (!room.bannedIPs) {
						room.bannedIPs = new Set();
					}
					// Get the IP of the kicked player's socket
					const kickedSocket = io.sockets.sockets.get(kickedPlayer.id);
					if (kickedSocket) {
						const kickedIP = getClientIP(kickedSocket);
						room.bannedIPs.add(kickedIP);
						console.log(`IP ${kickedIP} banned from room ${roomCode}`);
					}

					console.log(`${playerName} was banned from room ${roomCode}`);
				}

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
					message: ban
						? "You have been banned from this room by the host."
						: "You have been kicked from the game by the host.",
					banned: ban || false,
				});

				console.log(`${playerName} was kicked from room ${roomCode}${ban ? ' (banned)' : ''}`);
			}
		}
	});

	// Set describer (admin - host or co-admin)
	socket.on("set-describer", (data) => {
		const { roomCode, teamIndex, playerIndex } = data;
		const room = gameRooms.get(roomCode);

		if (room && isAdmin(room, socket.id) && room.gameState) {
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

		if (room && isAdmin(room, socket.id) && room.gameState) {
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

		if (room && isAdmin(room, socket.id) && room.gameState) {
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

	// Admin: Toggle team switching lock
	socket.on("admin-toggle-team-switching", (data) => {
		const { roomCode } = data;
		const room = gameRooms.get(roomCode);

		if (room && isAdmin(room, socket.id)) {
			room.teamSwitchingLocked = !room.teamSwitchingLocked;
			io.to(roomCode).emit("team-switching-locked", {
				locked: room.teamSwitchingLocked,
			});
			console.log(
				`Team switching ${room.teamSwitchingLocked ? "locked" : "unlocked"
				} in room ${roomCode}`
			);
		}
	});

	// Admin: Randomize teams
	socket.on("admin-randomize-teams", (data) => {
		const { roomCode } = data;
		const room = gameRooms.get(roomCode);

		if (room && isAdmin(room, socket.id)) {
			// Get all players
			const allPlayers = [...room.players];

			// Shuffle the players array
			for (let i = allPlayers.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[allPlayers[i], allPlayers[j]] = [allPlayers[j], allPlayers[i]];
			}

			// Determine number of teams (check game state if started, otherwise use room teamCount)
			const teamCount = room.started && room.gameState
				? room.gameState.teamCount
				: (room.teamCount || 2);

			// Distribute players evenly across all teams
			allPlayers.forEach((player, index) => {
				player.team = index % teamCount; // Cycle through teams: 0, 1, 2, 0, 1, 2, ...
			});

			// If game is in progress, also update the game state
			if (room.started && room.gameState) {
				// Clear existing teams
				room.gameState.teams.forEach((team) => {
					team.players = [];
				});

				// Add players to game state teams
				allPlayers.forEach((player) => {
					if (player.team !== null) {
						room.gameState.teams[player.team].players.push(player.name);
					}
				});

				// Reset describer indices to account for new team compositions
				room.gameState.currentDescriberIndex = Array(teamCount).fill(0);

				io.to(roomCode).emit("team-updated-midgame", {
					room,
					gameState: room.gameState,
					message: "Teams have been randomized by the host!"
				});
			} else {
				io.to(roomCode).emit("team-updated", {
					room,
					message: "Teams have been randomized by the host!"
				});
			}

			console.log(`Teams randomized in room ${roomCode} across ${teamCount} teams`);
		}
	});

	// Admin: Add/Remove Third Team
	socket.on("admin-toggle-third-team", (data) => {
		const { roomCode, addTeam } = data;
		const room = gameRooms.get(roomCode);

		console.log(`\n🔧 admin-toggle-third-team received:`);
		console.log(`  - Room Code: ${roomCode}`);
		console.log(`  - Add Team: ${addTeam}`);
		console.log(`  - Admin: ${socket.id}`);
		console.log(`  - Room exists: ${!!room}`);

		if (room && isAdmin(room, socket.id)) {
			console.log(`  - Players in room: ${room.players.length}`);
			console.log(`  - Player names: ${room.players.map(p => p.name).join(', ')}`);
			console.log(`  - Current teams: ${room.gameState?.teams.length}`);

			// Get all sockets in the room
			const socketsInRoom = io.sockets.adapter.rooms.get(roomCode);
			console.log(`  - Sockets in room: ${socketsInRoom ? socketsInRoom.size : 0}`);
			if (socketsInRoom) {
				console.log(`  - Socket IDs in room: ${Array.from(socketsInRoom).join(', ')}`);
			}
		}

		if (room && isAdmin(room, socket.id) && room.gameState) {
			const gs = room.gameState;

			if (addTeam && gs.teams.length === 2) {
				// Add third team
				gs.teams.push({
					name: 'Team 3',
					players: [],
					score: 0
				});
				gs.currentDescriberIndex.push(0);
				gs.teamCount = 3;
				room.teamCount = 3; // Update room's teamCount as well

				// Regenerate word pool for 3 teams
				const estimatedTurnsPerTeam = gs.maxRounds || 5;
				const wordsPerTurn = 10;
				const bonusBuffer = 50;
				const totalWordsNeeded = (estimatedTurnsPerTeam * 3 * wordsPerTurn) + bonusBuffer;
				room.gameWordPool = generateGameWordPool(totalWordsNeeded, room.usedWordIndices);

				// Broadcast to all players
				io.to(roomCode).emit("third-team-added", {
					gameState: gs,
					room: room,
					message: "Team 3 has been added to the game!"
				});
				// Also emit game-state-updated for immediate UI sync
				io.to(roomCode).emit("game-state-updated", { gameState: gs });
				console.log(`Third team added in room ${roomCode}, broadcasting to all players`);
			} else if (!addTeam && gs.teams.length === 3) {
				// Remove third team - randomly shuffle players to Team 1 and Team 2
				const team3Players = gs.teams[2].players;

				// Shuffle team3Players randomly between team 1 and team 2
				team3Players.forEach((playerName, index) => {
					const targetTeam = index % 2; // Alternate between 0 and 1
					gs.teams[targetTeam].players.push(playerName);

					// Update player's team in room.players
					const player = room.players.find(p => p.name === playerName);
					if (player) {
						player.team = targetTeam;
					}
				});

				gs.teams.splice(2, 1);
				gs.currentDescriberIndex.splice(2, 1);
				gs.teamCount = 2;
				room.teamCount = 2; // Update room's teamCount as well

				// Broadcast to all players
				io.to(roomCode).emit("third-team-removed", {
					gameState: gs,
					removedPlayers: team3Players,
					room: room,
					message: `Team 3 has been removed. ${team3Players.length} player(s) redistributed to other teams.`
				});
				// Also emit game-state-updated for immediate UI sync
				io.to(roomCode).emit("game-state-updated", { gameState: gs });
				console.log(`Third team removed in room ${roomCode}, ${team3Players.length} players redistributed, broadcasting to all players`);
			}
		}
	});

	// Chat message handler
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

		// Find the room and player
		gameRooms.forEach((room, roomCode) => {
			const playerIndex = room.players.findIndex((p) => p.id === socket.id);
			if (playerIndex !== -1) {
				const disconnectedPlayer = room.players[playerIndex];
				const wasHost = room.host === socket.id;

				// Initialize disconnectedPlayers map if needed
				if (!room.disconnectedPlayers) {
					room.disconnectedPlayers = new Map();
				}

				// Set up grace period - don't remove immediately, wait 30 seconds
				const GRACE_PERIOD_MS = 30000; // 30 seconds to reconnect

				console.log(`Player ${disconnectedPlayer.name} disconnected from room ${roomCode}. Starting ${GRACE_PERIOD_MS / 1000}s grace period...`);

				// Store disconnect info for potential reconnection
				const disconnectTimer = setTimeout(() => {
					// Grace period expired - now actually remove the player
					console.log(`Grace period expired for ${disconnectedPlayer.name} in room ${roomCode}`);

					const currentPlayerIndex = room.players.findIndex((p) => p.name === disconnectedPlayer.name);
					if (currentPlayerIndex === -1) {
						// Player already removed or reconnected with different socket
						room.disconnectedPlayers.delete(disconnectedPlayer.name);
						return;
					}

					// Check if player has reconnected (socket ID changed)
					const currentPlayer = room.players[currentPlayerIndex];
					if (currentPlayer.id !== socket.id) {
						// Player reconnected with new socket, don't remove
						room.disconnectedPlayers.delete(disconnectedPlayer.name);
						console.log(`Player ${disconnectedPlayer.name} has reconnected, not removing`);
						return;
					}

					// Actually remove the player now
					room.players.splice(currentPlayerIndex, 1);
					room.disconnectedPlayers.delete(disconnectedPlayer.name);

					// If host left, assign a new host from remaining players
					if (wasHost && room.players.length > 0) {
						room.host = room.players[0].id;
						console.log(`New host assigned in room ${roomCode}: ${room.players[0].name}`);
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
								const teamPlayerIndex = team.players.indexOf(disconnectedPlayer.name);
								if (teamPlayerIndex !== -1) {
									// Check if the disconnecting player is the current describer
									if (
										teamIndex === currentTeamIndex &&
										room.gameState.currentDescriberIndex[teamIndex] === teamPlayerIndex
									) {
										describerLeft = true;
									}

									team.players.splice(teamPlayerIndex, 1);

									// Adjust describer index if needed
									if (room.gameState.currentDescriberIndex[teamIndex] !== undefined) {
										if (teamPlayerIndex <= room.gameState.currentDescriberIndex[teamIndex]) {
											room.gameState.currentDescriberIndex[teamIndex] = Math.max(
												0,
												room.gameState.currentDescriberIndex[teamIndex] - 1
											);
										}
										// Ensure describer index is within bounds
										if (
											team.players.length > 0 &&
											room.gameState.currentDescriberIndex[teamIndex] >= team.players.length
										) {
											room.gameState.currentDescriberIndex[teamIndex] = 0;
										}
									}
								}
							});

							// Check if any team is now empty
							const team0Empty = room.gameState.teams[0].players.length === 0;
							const team1Empty = room.gameState.teams[1].players.length === 0;

							// If both teams are empty, end the game
							if (team0Empty && team1Empty) {
								io.to(roomCode).emit("game-over", {
									gameState: room.gameState,
									message: "All players left. Game ended.",
								});
								room.gameState = null;
								room.started = false;
							}

							// If describer left during active turn, notify players
							if (describerLeft && room.gameState?.gameStarted) {
								const team = room.gameState.teams[currentTeamIndex];
								if (team.players.length > 0) {
									io.to(roomCode).emit("describer-left", {
										message: "Describer disconnected. Moving to next teammate.",
										gameState: room.gameState,
									});
								}
							}
						}

						// Notify remaining players that someone left
						io.to(roomCode).emit("player-left", {
							socketId: socket.id,
							playerName: disconnectedPlayer.name,
							room,
							gameState: room.gameState,
						});
					}
				}, GRACE_PERIOD_MS);

				// Store the timer so we can cancel it if player reconnects
				room.disconnectedPlayers.set(disconnectedPlayer.name, {
					timer: disconnectTimer,
					socketId: socket.id,
					wasHost,
					disconnectedAt: Date.now(),
				});
			}
		});
	});
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
	console.log(`Open http://localhost:${PORT} to play`);
});
