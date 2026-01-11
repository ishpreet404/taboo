// Unified Word Database - imports from shared JSON source
// This ensures both frontend and backend use the same word classifications

import wordDatabaseJSON from '../wordDatabase.json';

export interface Word {
  word: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

// Point ranges by difficulty
const POINT_RANGES = {
  easy: { min: 8, max: 11 },
  medium: { min: 12, max: 17 },
  hard: { min: 20, max: 30 }
};

// Generate random points within a range
function getRandomPoints(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Build the word database from JSON
function buildWordDatabase(): Word[] {
  const database: Word[] = [];

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const words = wordDatabaseJSON.words[difficulty] || [];
    const range = POINT_RANGES[difficulty];

    words.forEach((word: string) => {
      database.push({
        word: word.toUpperCase(),
        difficulty,
        points: getRandomPoints(range.min, range.max)
      });
    });
  }

  return database;
}

// Export the generated database
export const wordDatabase: Word[] = buildWordDatabase();

// Utility function to get word counts by difficulty
export function getWordCounts(): { easy: number; medium: number; hard: number; total: number } {
  return {
    easy: wordDatabase.filter(w => w.difficulty === 'easy').length,
    medium: wordDatabase.filter(w => w.difficulty === 'medium').length,
    hard: wordDatabase.filter(w => w.difficulty === 'hard').length,
    total: wordDatabase.length
  };
}

// Distribution patterns for dynamic round variety
const DISTRIBUTION_PATTERNS = [
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

// Generate a random distribution for a round
export function generateRoundDistribution(wordsPerTurn: number = 10): { easy: number; medium: number; hard: number } {
  const pattern = DISTRIBUTION_PATTERNS[Math.floor(Math.random() * DISTRIBUTION_PATTERNS.length)];

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

// Legacy export for backward compatibility
export function generateWordDatabase(): Word[] {
  return wordDatabase;
}

// Log word counts on module load (for debugging)
const counts = getWordCounts();
console.log(`Word database loaded: ${counts.easy} easy, ${counts.medium} medium, ${counts.hard} hard (total: ${counts.total})`);
