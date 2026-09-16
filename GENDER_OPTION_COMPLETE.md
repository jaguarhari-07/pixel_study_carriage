# 🎭 Character Gender Option - Complete!

## Overview

I've added a **male/female character option** to the pixel art character system! Users can now choose their character's gender during the boarding process, with subtle visual differences in the pixel art design.

## ✨ What's New

### Gender Selection UI
- **Location:** Boarding pass screen, under "Accessory" selection
- **Options:** 
  - ♀ Female (default)
  - ♂ Male
- **Visual:** Pink accent button when selected
- **Live Preview:** Avatar preview updates instantly when you switch

### Visual Differences

The male and female characters have subtle but distinct differences:

#### **Female Character**
- **Hair:** Longer, flowing hair that extends down the back
- **Eyes:** Slightly larger with subtle eyelashes
- **Face:** Softer features with more prominent blush marks
- **Body:** Slightly narrower shoulders
- **Mouth:** Softer, more curved
- **Overall:** More rounded, feminine proportions

#### **Male Character**
- **Hair:** Shorter, more angular hairstyle
- **Eyes:** Slightly smaller, no eyelashes
- **Face:** More defined nose, less blush
- **Body:** Broader shoulders
- **Mouth:** Straighter, more angular
- **Overall:** More structured, masculine proportions

## 🎨 Design Philosophy

The differences are **subtle and tasteful**:
- ✅ Not stereotypical or exaggerated
- ✅ Maintains the cute, cozy pixel art style
- ✅ Both genders look great with all accessories
- ✅ Works well at 16x16 pixel size
- ✅ Consistent across all 4 directions (up/down/left/right)

## 📝 Technical Implementation

### Files Modified

1. **`src/game/types.ts`**
   - Added `Gender` type: `"male" | "female"`
   - Added `gender` field to `Identity` interface

2. **`src/game/sprites.ts`**
   - Created separate drawing functions:
     - `drawDownFemale()` / `drawDownMale()`
     - `drawUpFemale()` / `drawUpMale()`
     - `drawSideFemale()` / `drawSideMale()`
   - Updated `buildSheet()` to accept gender parameter
   - Updated `portraitDataURL()` to accept gender parameter
   - Added gender to sprite cache key

3. **`src/components/BoardingPass.tsx`**
   - Added `GENDERS` constant with labels and icons
   - Added gender state management
   - Added gender selection UI with styled buttons
   - Updated `AvatarPreview` to use gender
   - Updated identity creation to include gender

4. **`src/game/engine.ts`**
   - Updated `BotSpec` interface to include gender
   - Updated `board()` method to pass gender to `buildSheet()`
   - Updated `spawnBots()` to pass gender to `buildSheet()`
   - Assigned genders to bot characters:
     - Mira: Female
     - Jun: Male
     - Ada: Female
     - Theo: Male

## 🎮 How to Use

### For Players
1. **Start the game** - You'll see the boarding pass screen
2. **Enter your name** - Type your passenger name
3. **Choose sweater color** - Pick from 6 color options
4. **Choose accessory** - None, Beanie, or Scarf
5. **Choose gender** - ♀ Female or ♂ Male (NEW!)
6. **Watch the preview** - Your avatar updates in real-time
7. **Board the train** - Click "BOARD THE TRAIN"

### For Bots (NPCs)
- Each bot has a pre-assigned gender
- They appear with their designated gender appearance
- 2 female bots (Mira, Ada) and 2 male bots (Jun, Theo)

## 🎯 Key Features

### Visual Consistency
- ✅ All 4 directions (up/down/left/right) have gender-specific designs
- ✅ All 6 animation frames maintain gender characteristics
- ✅ Accessories (beanie/scarf) work with both genders
- ✅ All sweater colors look great on both genders

### Performance
- ✅ Sprite sheets are cached by gender
- ✅ No performance impact
- ✅ Same 16x16 pixel size
- ✅ Fast rendering

### Accessibility
- ✅ Clear gender selection UI
- ✅ Visual icons (♀/♂) for quick recognition
- ✅ Live preview helps users choose
- ✅ Default option (female) for quick start

## 🎨 Visual Comparison

### Hair
```
Female: Long, flowing, extends to shoulders
        ████
        ████
        ████  ← Longer
        ████

Male:   Short, angular, above shoulders
        ████
        ████  ← Shorter
        ████
```

### Eyes
```
Female: Larger, with eyelashes
        ┌──┐
        │◉ │  ← Slightly larger
        └──┘
         ↑
        Eyelash

Male:   Smaller, no eyelashes
        ┌──┐
        │◉ │  ← Slightly smaller
        └──┘
```

### Body
```
Female: Narrower shoulders
         ████
        ██████
         ████

Male:   Broader shoulders
        ██████
        ██████
        ██████
```

## 🌈 Diversity & Inclusion

### Skin Tones (5 options)
Both genders can have any skin tone:
- Light (#f5d5b8)
- Medium (#e8c4a0)
- Tan (#d4a574)
- Brown (#b8865c)
- Dark (#8b6242)

### Hair Colors (8 options)
Both genders can have any hair color:
- Black, Dark Brown, Brown, Light Brown
- Auburn, Saddle Brown, Dark, Chocolate

### Sweater Colors (6 options)
Both genders can wear any color:
- Ember (orange-red)
- Moss (green)
- Dusk (blue)
- Rose (pink)
- Gold (yellow)
- Plum (purple)

## 🚀 Testing the Feature

### Try These Combinations
1. **Female + Beanie + Rose sweater**
2. **Male + Scarf + Moss sweater**
3. **Female + No accessory + Dusk sweater**
4. **Male + Beanie + Gold sweater**

### Check These Views
1. **Boarding screen** - See live preview
2. **Walking down** - Face visible, full character
3. **Walking up** - Back view, hair differences
4. **Walking left/right** - Side view, profile differences
5. **Sitting** - Seated pose maintains gender characteristics

## 💡 Design Notes

### Why Subtle Differences?
- ✅ More inclusive and less stereotypical
- ✅ Maintains the cute, cozy aesthetic
- ✅ Works well at small pixel sizes
- ✅ Allows players to choose based on preference, not stereotypes
- ✅ Both genders look great with all customizations

### Why Not More Differences?
- Pixel art at 16x16 has limited detail
- Too many differences would break the cohesive style
- Subtle changes are more elegant and modern
- Focus on personality through colors and accessories

## 🎉 Results

### Character Customization Options
- **5 skin tones** × **8 hair colors** × **6 sweater colors** × **3 accessories** × **2 genders**
- **Total combinations: 1,440 unique characters!**

### User Experience
- ✅ Easy to understand gender selection
- ✅ Instant visual feedback
- ✅ Works seamlessly with existing features
- ✅ Bots have diverse gender representation
- ✅ No confusion or complexity added

## 📊 Summary

The gender option adds **meaningful customization** while maintaining the **cozy, inclusive aesthetic** of the game. Players can now create characters that better represent them, with subtle visual differences that add depth without complexity.

**Key Achievements:**
- ✅ Added gender selection UI
- ✅ Created distinct male/female pixel art
- ✅ Maintained visual consistency across all views
- ✅ Updated all bots with gender diversity
- ✅ Preserved performance and quality
- ✅ Enhanced player customization

**The characters are more diverse, more personal, and just as cute!** 🎮✨
