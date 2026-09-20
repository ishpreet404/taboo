// Word pack + game mode catalog: METADATA ONLY (no words), shared by the game
// core and the UI so the two can never drift apart.
//
// pack.difficulties -> word groups in wordDatabase.json / themedWords.json
// pack.product      -> store product that unlocks it (null = free). Several packs
//                      can share one product (e.g. all Hindi variants).

const tiers = (theme) => [`${theme}_easy`, `${theme}_medium`, `${theme}_hard`];

const PACKS = [
	// --- Classic -----------------------------------------------------------
	{ key: "standard", name: "Standard", description: "Easy + Medium + Hard mix", category: "Classic", color: "from-blue-500 to-blue-600", tags: ["EN"], difficulties: ["easy", "medium", "hard"], product: null },
	{ key: "easy", name: "Easy", description: "Easy words only (5-12 pts)", category: "Classic", color: "from-green-500 to-green-600", tags: ["EN"], difficulties: ["easy"], product: null },
	{ key: "medium", name: "Medium", description: "Medium words only (13-25 pts)", category: "Classic", color: "from-yellow-500 to-yellow-600", tags: ["EN"], difficulties: ["medium"], product: null },
	{ key: "hard", name: "Hard", description: "Hard words only (26-40 pts)", category: "Classic", color: "from-orange-500 to-orange-600", tags: ["EN"], difficulties: ["hard"], product: null },
	{ key: "difficult", name: "Difficult", description: "All difficulties including Insane", category: "Classic", color: "from-purple-500 to-purple-600", tags: ["EN"], difficulties: ["easy", "medium", "hard", "insane"], product: "pack_hardcore" },
	{ key: "intense", name: "Intense", description: "Hard + Insane only - max challenge!", category: "Classic", color: "from-pink-500 to-rose-600", tags: ["EN"], difficulties: ["hard", "insane"], product: "pack_hardcore" },
	{ key: "insane", name: "Insane", description: "Insane words only (41-60 pts)", category: "Classic", color: "from-red-500 to-red-600", tags: ["EN"], difficulties: ["insane"], product: "pack_hardcore" },

	// --- Hindi -------------------------------------------------------------
	{ key: "hindi", name: "Hindi", description: "Mix of Hindi Easy + Medium + Hard", category: "Hindi", color: "from-blue-500 to-red-500", tags: ["HI"], difficulties: ["hindi_easy", "hindi_medium", "hindi_hard"], product: "pack_hindi" },
	{ key: "hindi_easy", name: "Hindi (Easy)", description: "Hindi Easy words", category: "Hindi", color: "from-green-500 to-green-600", tags: ["HI"], difficulties: ["hindi_easy"], product: "pack_hindi" },
	{ key: "hindi_medium", name: "Hindi (Medium)", description: "Hindi Medium words", category: "Hindi", color: "from-yellow-500 to-yellow-600", tags: ["HI"], difficulties: ["hindi_medium"], product: "pack_hindi" },
	{ key: "hindi_hard", name: "Hindi (Hard)", description: "Hindi Hard words", category: "Hindi", color: "from-orange-500 to-orange-600", tags: ["HI"], difficulties: ["hindi_hard"], product: "pack_hindi" },

	// --- Themed ------------------------------------------------------------
	{ key: "food", name: "Food & Drink", description: "From samosas to sourdough", category: "Themed", color: "from-amber-500 to-orange-600", tags: ["EN"], difficulties: tiers("food"), product: null },
	{ key: "family", name: "Kids & Family", description: "Friendly words for all ages", category: "Themed", color: "from-sky-400 to-emerald-500", tags: ["EN"], difficulties: tiers("family"), product: null },
	{ key: "bollywood", name: "Bollywood", description: "Stars, films, dialogues and drama", category: "Themed", color: "from-fuchsia-500 to-amber-500", tags: ["EN"], difficulties: tiers("bollywood"), product: "pack_bollywood" },
	{ key: "cricket", name: "Cricket", description: "Gully cricket to the World Cup", category: "Themed", color: "from-emerald-500 to-teal-600", tags: ["EN"], difficulties: tiers("cricket"), product: "pack_cricket" },
	{ key: "movies", name: "Movies & TV", description: "Hollywood, streaming and binge-worthy shows", category: "Themed", color: "from-red-500 to-purple-600", tags: ["EN"], difficulties: tiers("movies"), product: "pack_movies" },
	{ key: "music", name: "Music", description: "Instruments, artists and earworms", category: "Themed", color: "from-violet-500 to-pink-500", tags: ["EN"], difficulties: tiers("music"), product: "pack_music" },
	{ key: "sports", name: "Sports", description: "Every game under the sun", category: "Themed", color: "from-lime-500 to-green-600", tags: ["EN"], difficulties: tiers("sports"), product: "pack_sports" },
	{ key: "science", name: "Science & Tech", description: "Gadgets, space and big ideas", category: "Themed", color: "from-cyan-500 to-blue-600", tags: ["EN"], difficulties: tiers("science"), product: "pack_science" },
	{ key: "travel", name: "Travel", description: "Places, planes and wanderlust", category: "Themed", color: "from-teal-400 to-cyan-600", tags: ["EN"], difficulties: tiers("travel"), product: "pack_travel" },
	{ key: "office", name: "Office Life", description: "Meetings, jargon and Monday blues", category: "Themed", color: "from-slate-400 to-indigo-500", tags: ["EN"], difficulties: tiers("office"), product: "pack_office" },
	{ key: "festive", name: "Festive", description: "Diwali to New Year's Eve", category: "Themed", color: "from-yellow-400 to-red-500", tags: ["EN"], difficulties: tiers("festive"), product: "pack_festive" },
];

// Host-written packs are registered per room under this prefix ("custom:ROOMCODE")
const CUSTOM_PACK_PREFIX = "custom:";
const CUSTOM_PACK_LIMITS = { minWords: 20, maxWords: 600, maxWordLength: 40, maxNameLength: 30 };
// Custom packs are a paid feature (null would make them free)
const CUSTOM_PACK_PRODUCT = "custom_packs";

// Game modes are presets over settings the core enforces:
//   turnTime (s), wordsPerTurn (max 10), finalRoundMultiplier
const MODES = [
	{ key: "classic", name: "Classic", description: "60 seconds, 10 words", turnTime: 60, wordsPerTurn: 10, finalRoundMultiplier: 1 },
	{ key: "blitz", name: "Blitz", description: "30 seconds, 6 words. Fast and loud", turnTime: 30, wordsPerTurn: 6, finalRoundMultiplier: 1 },
	{ key: "marathon", name: "Marathon", description: "90 seconds to clear as many as you can", turnTime: 90, wordsPerTurn: 10, finalRoundMultiplier: 1 },
	{ key: "showdown", name: "Showdown", description: "Classic, but the final round scores double", turnTime: 60, wordsPerTurn: 10, finalRoundMultiplier: 2 },
	{ key: "sprint", name: "Sprint Finish", description: "45 seconds, 8 words, double-points finale", turnTime: 45, wordsPerTurn: 8, finalRoundMultiplier: 2 },
];

const getPack = (key) => PACKS.find((p) => p.key === key) || null;
const getMode = (key) => MODES.find((m) => m.key === key) || MODES[0];
const isCustomPackKey = (key) => typeof key === "string" && key.startsWith(CUSTOM_PACK_PREFIX);

module.exports = {
	PACKS,
	MODES,
	CUSTOM_PACK_PREFIX,
	CUSTOM_PACK_LIMITS,
	CUSTOM_PACK_PRODUCT,
	getPack,
	getMode,
	isCustomPackKey,
};
