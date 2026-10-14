<a href="https://www.youtube.com/watch?v=tfNqEAQuhXs">
  <img src="https://pixel-banner.online/img/pixel-banner-v3.7.jpg" alt="Pixel Banner" style="max-width: 400px;">
</a>

## 🎉 What's New

### v3.7.0
#### ✨ Added
- **Confetti/Particle Effects**: Add animated effects to your notes!
  - Use `banner-confetti: "type: snow"` (or any preset) in frontmatter
  - 14 presets available: snow, snowflakes, leaves, rain_light, rain_heavy, fireworks, confetti, hearts, sparkles, and more
  - Customize colors, speed, size, and other properties
  - Live preview right in the settings modal: see your effect as you tweak it, before applying
  - Access via the 🎊 button in the Target Position modal
  - Respects reduced motion preferences for accessibility
  - Split panes each get their own effect, and effects pause while a tab is in the background or the banner is scrolled away
  - The confetti settings modal saves exactly what you see and only when something changed
  - Presets are easier to see, in both light and dark themes: snow, snowflakes, space and aliens switch to darker colours in light themes (unless you pick your own; after a theme change, from the next time the effect starts)
- **Use Note Filename for Banner Images**: New setting that automatically uses the current note's filename as the default filename when saving banner images
  - When enabled, saved banners will be named after the note they belong to (e.g., `My Project Note.jpg` instead of `pixel-banner-image.jpg`)
  - Works with all save methods: pin icon, AI generation, and Plus Collection downloads
  - Automatically falls back to default filename if the note is named "Untitled" or has no name
  - Pre-fills the filename (still editable in the save dialog)
  - Located in Settings → General tab

#### 🐛 Fixed
- Collapsing and expanding headings in Reading view works again in long notes with a banner: headings no longer swallow the ones below or stay hidden after expanding (issue #315, thanks @Amvtxrvsu)
- Pixel Banner settings no longer shrink to a narrow column in wide settings windows on Obsidian 1.13+ (issue #337, thanks @zx2021210538)
- On phones, the banner no longer hides under the top toolbar, and `content-start` places your note where it does on tablet and desktop (issue #335)
