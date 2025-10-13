# 📝 Word Database Documentation

## Overview

The game now uses **3,259 words** from your `wordlist.txt` file! The words are automatically processed and assigned:
- ✅ **Difficulty levels** (Easy, Medium, Hard)
- ✅ **Point values** (8-30 points based on difficulty)
- ✅ **Taboo words** (5 forbidden words per word)
- ✅ **Rare badges** for extra challenging words

## How It Works

### 🎯 Automatic Difficulty Assignment

Words are categorized based on:
- **Word length**
- **Number of words** (multi-word entries like "Air Conditioner")
- **Complexity**

**Easy Words (8-11 points):**
- Short words (≤6 characters)
- Single words
- Examples: CAT, DOG, SUN, TREE, BOOK

**Medium Words (12-20 points):**
- Medium length (7-10 characters)
- 2-word entries
- Examples: BASKETBALL, COMPUTER, ICE CREAM, BIRTHDAY

**Hard Words (25-30 points):**
- Long words (>15 characters)
- Multi-word entries (3+ words)
- Complex names
- Examples: AIR CONDITIONER, MICHAEL JACKSON, BARACK OBAMA

### 🚫 Taboo Word Generation

The system automatically generates 5 taboo words for each main word:

**For common words:** Uses predefined related words
- DOG → [ANIMAL, PET, BARK, PUPPY, CAT]
- PHONE → [CALL, MOBILE, DEVICE, SCREEN, IPHONE]

**For other words:** Generates contextually
- Multi-word entries use individual words
- Generic associations based on word type
- Fallback to generic taboo words

## 📊 Word Statistics

Total words: **3,259**

**Approximate distribution:**
- Easy: ~40% (1,300 words)
- Medium: ~45% (1,450 words)
- Hard: ~15% (500 words)
- Rare badges: ~10% (325 words)

## 🎮 In-Game Usage

**During gameplay:**
1. Game randomly selects 10 words at turn start
2. As words are guessed, 5 more are added automatically
3. Words never repeat within the same turn
4. All 3,259 words are available in rotation

## 🔧 Customization

### Adding Better Taboo Words

Edit `frontend/lib/wordDatabase.ts` and expand the `relatedWords` object:

```typescript
const relatedWords: Record<string, string[]> = {
  'DOG': ['ANIMAL', 'PET', 'BARK', 'PUPPY', 'CAT'],
  'MOVIE': ['FILM', 'CINEMA', 'WATCH', 'ACTOR', 'SCREEN'],
  // Add more here!
}
```

### Adjusting Difficulty

Modify the `getDifficulty()` function in `frontend/lib/wordDatabase.ts`:

```typescript
// Make words harder:
if (length > 10) { // was 15
  return { difficulty: 'hard', points: 30 }
}

// Make words easier:
if (length > 8) { // was 6
  return { difficulty: 'easy', points: 10 }
}
```

### Changing Point Values

```typescript
// Easy words: 8-11 points
return { difficulty: 'easy', points: 8 + Math.floor(Math.random() * 4) }

// Medium words: 12-20 points
return { difficulty: 'medium', points: 12 + Math.floor(Math.random() * 9) }

// Hard words: 25-30 points
return { difficulty: 'hard', points: 25 + Math.floor(Math.random() * 6) }
```

## 📝 Sample Words by Category

### Easy (Short & Simple)
- CAT, DOG, SUN, MOON, TREE
- APPLE, WATER, PHONE, BOOK, CHAIR
- HAPPY, SMILE, DANCE, SING, PLAY

### Medium (Moderate Length)
- BASKETBALL, COMPUTER, RESTAURANT
- BIRTHDAY, CHOCOLATE, TELESCOPE
- UMBRELLA, BACKPACK, ELEPHANT

### Hard (Long & Complex)
- MICHAEL JACKSON, BARACK OBAMA
- AIR CONDITIONER, EIFFEL TOWER
- METAMORPHOSIS, DEMOCRACY

### Celebrity/Brand Names
- ELON MUSK, JUSTIN BIEBER, BTS
- NETFLIX, SPOTIFY, TIKTOK
- MCDONALDS, STARBUCKS, NIKE

### Geography
- EGYPT, TAJ MAHAL, PACIFIC
- SAHARA, TOKYO, PARIS
- AUSTRALIA, CANADA, DUBAI

### Pop Culture
- BATMAN, SUPERMAN, SPIDER MAN
- PIKACHU, HULK, THOR
- HARRY POTTER, JOKER, NEMO

## 🎨 Visual Indicators

In the game, words display with:
- 🟢 **Green border** - Easy words
- 🟡 **Yellow border** - Medium words
- 🔴 **Red border** - Hard words
- 🔥 **Special badge** - Rare/Very rare words

## ⚡ Performance

The word database is:
- ✅ Generated once at build time
- ✅ Cached for instant access
- ✅ Lightweight (~200KB total)
- ✅ No external API calls needed

## 🔄 Updating the Word List

To add/remove words:

1. Edit `frontend/lib/wordDatabase.ts`
2. Update the `rawWordList` string
3. Save the file
4. The game will automatically use the new words!

Or keep using your `wordlist.txt` and copy-paste it into the `rawWordList` variable.

## 💡 Tips for Best Experience

**For Players:**
- Easier words appear more frequently
- Type quickly - partial matches work!
- Watch for rare badges (higher points!)

**For Game Masters:**
- Add custom taboo words for better gameplay
- Adjust difficulty thresholds for your audience
- Consider adding themed word packs (sports, movies, etc.)

## 🚀 Future Enhancements

Possible additions:
- [ ] Category filters (only show sports words, etc.)
- [ ] Custom word packs per room
- [ ] User-submitted words
- [ ] Multilingual support
- [ ] Word difficulty voting/feedback
- [ ] Import words from CSV/JSON
- [ ] Word of the day feature

---

**Your game now has 3,259 words!** 🎉

Restart the servers and enjoy playing with the massive word database!
