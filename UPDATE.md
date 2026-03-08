<a href="https://www.youtube.com/watch?v=tfNqEAQuhXs">
  <img src="https://pixel-banner.online/img/pixel-banner-v3.7.jpg" alt="Pixel Banner" style="max-width: 400px;">
</a>

## 🎉 What's New

### v3.8.0
#### ✨ Added
- **Confetti/Particle Effects**: Add animated effects to your notes!
  - Use `banner-confetti: type:snow` (or any preset) in frontmatter
  - 14 presets available: snow, snowflakes, leaves, rain, fireworks, confetti, hearts, sparkles, and more
  - Customize colors, speed, size, and other properties
  - Access via the 🎊 button in the Target Position modal
  - Respects reduced motion preferences for accessibility

### v3.7.0
#### ✨ Added
- **Use Note Filename for Banner Images**: New setting that automatically uses the current note's filename as the default filename when saving banner images
  - When enabled, saved banners will be named after the note they belong to (e.g., `My Project Note.jpg` instead of `pixel-banner-image.jpg`)
  - Works with all save methods: pin icon, AI generation, and Plus Collection downloads
  - Automatically falls back to default filename if the note is named "Untitled" or has no name
  - Pre-fills the filename (still editable in the save dialog)
  - Located in Settings → General tab
- Added `filesize` display to the store modal

#### 🐛 Fixed
- Fixed banner flickering on every keystroke when a note contains frontmatter and uses folder group banners (issue #318)
- Fixed content start position not applying correctly when changed in settings (issue #297)
