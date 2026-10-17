<a href="https://www.youtube.com/watch?v=GfuPHuOIbyo">
  <img src="https://pixel-banner.online/img/pixel-banner-v3.7.jpg" alt="Pixel Banner" style="max-width: 400px;">
</a>

## 🎉 What's New

### v3.7.1
#### ✨ Added
- **Banners in Export to PDF**: notes exported with Export to PDF now show their banner at the top of the first page, above the title, every time (issues #298, #323)
  - The PDF uses the same image the note shows, including keyword banners, with the same height, crop, rounded corners, fade and banner icon; very tall banners are capped at about 40% of the page
  - Video banners print the frame the video is showing
  - With *Include file name as title* turned on in the export dialog, that title uses your banner title color
  - Notes without a banner, and notes embedded in the exported note, are exported as before
  - Turn it off in Settings → General → **Include Banner in PDF Export**

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
- Linked tabs ("Link with tab...") now show the banner of the note they follow, and a split pane opened without focus gets its banner right away (issue #207)
- If a banner link is typed without quotes (like `banner: [[image.jpg]]`), Pixel Banner now tells you once per note and shows the corrected line, `banner: "[[image.jpg]]"`. Unquoted links get mangled into `- - image.jpg` when properties are saved (issue #289)
- Banners set with Markdown links, such as `[](image.jpg)` (what Obsidian writes when "Use [[Wikilinks]]" is turned off), `[title](image.jpg)` or `![alt](image.jpg)`, now show their image (issue #310)
- Banners are visible again in themes that hid them, such as Mocha and RetroNotes (issue #311)
- Banners in hover previews and Hover Editor windows follow your Image Display and Image Repeat settings instead of repeating (issue #312)
- Banners no longer flicker when switching between notes, especially with large banner images (issue #327)
- The full-size image view (the 🖼️ View Image icon on a banner) opens centered on screen again, including with themes that previously pushed it to the bottom right (issue #328)
- Embedded blocks and headings (`![[note#^block]]`, `![[note#heading]]`) no longer show a large empty space below them in notes with a banner (issue #331)
- Notes opened automatically at startup, such as a homepage set by the Homepage plugin, now show their banner and banner icon correctly on launch, instead of no banner or a banner with default styling (issue #333)
- On phones, the banner no longer hides under the top toolbar, and `content-start` places your note where it does on tablet and desktop (issue #335)
- Banners in hover previews now use your banner height, fade and corner radius settings
- Linked tabs showing the same note now show the same keyword banner image after you edit its properties
- The "Refresh current banner image" command now tells you when the refresh failed
- Banners set with a Markdown link to a file outside the vault, such as `[photo](file:///C:/Pictures/photo.jpg)`, now show their image on desktop
- Switching notes while a banner is still loading no longer puts the previous note's banner icon on the new note
- With "Use Note Filename for Banner Images", notes with non-Latin or accented names (like "日記" or "Café") keep their name when saving a banner
- The confetti settings show the shape you picked when you reopen them, and say why the preview is hidden when reduced motion or the mobile setting turns it off
- Confetti with very high particle counts stays smooth: each pane keeps at most 1,500 particles on screen (the built-in presets are unchanged)
