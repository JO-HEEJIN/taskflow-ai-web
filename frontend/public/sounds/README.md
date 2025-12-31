# Timer Sounds

## Required Sound Files

### timer-complete.mp3
- **Purpose:** Played when focus timer completes
- **Duration:** 1-3 seconds
- **Type:** Pleasant chime or success sound
- **Volume:** Should be attention-grabbing but not jarring
- **Format:** MP3 (best browser compatibility)

## Sound Recommendations

### Completion Sound Characteristics
- **Tone:** Positive, uplifting
- **Style:** Chime, bell, or musical chord
- **Examples:**
  - Three-tone ascending chime (C-E-G)
  - Gentle bell sound
  - Success notification sound
  - Wind chime

### Where to Get Sounds

**Free Sound Libraries:**
1. **Freesound.org** - https://freesound.org
   - Search: "success chime", "completion", "bell"
   - License: CC0 or CC-BY

2. **Zapsplat** - https://www.zapsplat.com
   - Free sound effects
   - No attribution required for subscribers

3. **Pixabay** - https://pixabay.com/sound-effects
   - Royalty-free
   - No attribution required

4. **YouTube Audio Library** - https://youtube.com/audiolibrary
   - Free for any use
   - Filter by "Sound Effects"

**Create Your Own:**
- Use GarageBand (Mac)
- Use Audacity (Free, cross-platform)
- Use online tools like Beepbox.co

## Fallback Implementation

If no audio file is provided, the app will automatically fall back to a generated chime using the Web Audio API:

```typescript
// Plays three tones: C5 (523Hz) → E5 (659Hz) → G5 (784Hz)
soundManager.playCompletionChime();
```

This fallback works in all browsers but sounds more basic than a custom audio file.

## Optional Sound Files

You can also add these for enhanced UX:

### timer-start.mp3
- Short, soft "start" sound
- Examples: Soft click, gentle pop

### timer-pause.mp3
- Brief pause sound
- Examples: Subtle click, soft tap

## File Specifications

- **Format:** MP3 (best compatibility) or OGG
- **Bitrate:** 128-192 kbps (no need for higher)
- **Sample Rate:** 44.1 kHz
- **File Size:** < 100KB recommended
- **Length:** 0.5-3 seconds

## Testing Your Sound

1. Place `timer-complete.mp3` in `/public/sounds/`
2. Restart dev server
3. Complete a timer
4. Sound should play automatically

## Current Status

- ✅ SoundManager implemented
- ✅ Fallback chime implemented (Web Audio API)
- ⏳ Custom audio file (user should add)

## License Considerations

Ensure any sound you use is:
- Royalty-free for commercial use, OR
- Licensed under CC0, CC-BY, or similar permissive license
- Properly attributed if required

---

**Quick Start:** If you don't have a sound file yet, the app will use the generated chime fallback, which works perfectly fine for development and production!
