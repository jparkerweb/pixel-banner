<a href="https://www.youtube.com/watch?v=GfuPHuOIbyo">
  <img src="https://pixel-banner.online/img/pixel-banner-v3.7.jpg" alt="Pixel Banner" style="max-width: 400px;">
</a>

## 🎉 What's New

### v3.7.3
#### ✨ Added
- **Icons without a banner** (issues #322, #238): a note can now show just an icon, with no banner image at all
  - Add an emoji, text or an icon image to a note and the icon appears as a compact header, with the note's content starting just below it
  - It works in reading view, editing view, notes embedded in other notes (unless *Hide Embedded Note Banners* is on) and Export to PDF (when *Include Banner in PDF Export* is on)
  - A banner that cannot be loaded now falls back to the note's icon instead of leaving an empty gap
  - The Select modal's **Icon Image** and **Icon Emoji & Text** buttons, their commands, and **Position, Size, & Style** work on a note that has only an icon; the banner-only controls are hidden there
  - Set **Content Start Position** (in Position, Size, & Style) on the note to change how far the content sits below the icon
- **Match readable line length** (issue #267): a new toggle in Settings → General that makes banners as wide as your note's text column, and a `readable` option for a single note
  - Per note: tick **readable** in Position, Size, & Style, or set `banner-max-width: readable` in the note's properties
  - While the toggle is on, the Banner Max Width slider is greyed out, and a note's own width still wins
  - It needs Obsidian's *Readable line length* setting to be on; with it off, the banner uses the full width
- **Animate banner position changes** (issue #226): a new toggle in Settings → General for the half second slide that plays when a banner's focal point changes
  - On by default, as before; turn it off to make the banner jump straight to the new position
  - It also stays off automatically if your system is set to reduce motion

#### 📝 Good to know
- A note that kept its icon properties after the banner was removed now shows that icon on its own
- Icon style settings that you set for a folder (size, color, padding and so on) now take effect on the icon

### v3.7.2
#### ✨ Added
- **Popover Banner Max Height**: a new setting limits how tall a banner can be in hover previews, so a tall banner no longer fills the whole preview and covers the text (issue #342)
  - Find it in Settings → General → **Popover Banner Max Height** (default 150 pixels)
  - Banners already shorter than the limit stay as they are, and notes outside hover previews are not affected

#### 🐛 Fixed
- **Plugin Settings button**: it opens the Pixel Banner settings again instead of the general Obsidian settings page, and the Plus and update shortcuts in the banner modal land on the right page too

### v3.7.1
#### ✨ Added
- **Banners in Export to PDF**: notes exported with Export to PDF now show their banner at the top of the first page, above the title, every time (issues #298, #323)
  - The PDF uses the same image the note shows, including keyword banners, with the same height, crop, rounded corners, fade and banner icon; very tall banners are capped at about 40% of the page
  - Video banners print the frame the video is showing
  - With *Include file name as title* turned on in the export dialog, that title uses your banner title color
  - Notes without a banner, and notes embedded in the exported note, are exported as before
  - Turn it off in Settings → General → **Include Banner in PDF Export**

#### 🔧 Changed
- **Property names you set up are respected everywhere**: if you gave a property more than one name in Settings → Custom Field Names, Pixel Banner now writes to the name a note already uses, and removes that property's other names so only one is left
  - This covers picking an image, pasting a web address, AI and store banners, the banner icon, icon images and the Target Position modal
  - Names entered as one comma-separated entry (like `banner, image`) now work when Pixel Banner writes a property, instead of creating a property literally named `banner, image`
  - Removing an icon or an icon image now clears it under every name you set up, not just the first one

#### 🐛 Fixed
- Notes embedded in another note now use their own `banner-fade`, and the fade and position values from your folder and global settings
- A value of `0`, such as `icon-opacity: 0` or an icon padding of `0`, now sticks instead of falling back to the default (an empty value still uses the default)
- Editing banner alignment, the icon image, the flag color or any other banner property by hand now updates the banner right away, without reopening the note
- New folder image settings without a saved fade now start at -40, the same as the global fade setting
- Video banners from a keyword keep your Image Display setting (like `contain`) when you refresh them
- The Select image command no longer reorders your properties, and works with property names that contain special characters

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
