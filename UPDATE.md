<a href="https://www.youtube.com/watch?v=tfNqEAQuhXs">
  <img src="https://pixel-banner.online/img/pixel-banner-v3.6.jpg" alt="Pixel Banner" style="max-width: 400px;">
</a>

## 🎉 What's New

### v3.6.0
#### ✨ Added
- Support for 🎬 Video Banners!
  - Upload and choose Video files as banners from your vault
  - Downloadable 🎬 Video Banners from the `Pixel Banner Plus Collection`
- Added paging controls to the `Pixel Banner Plus Collection`
- New global `Banner Max Width` setting to control the default max width for all banners

#### 📦 Updated
- Moved `Default Saved Banners Folder` setting to the `General` tab
- Renamed `Pixel Banner Plus Store` to `Pixel Banner Plus Collection` as many items are free

### v3.6.1
#### 🐛 Fixed
- Resolved issue with Icon Image selection modal not setting the selected icon image

### v3.6.2
#### 📦 Updated
- Improved debounce logic to prevent multiple banner reloads when opening a note

### v3.6.3
#### ✨ Added
- Added `filesize` display to the store modal

### v3.6.4
#### ✨ Added
- Banner images now support local `file` protocol for images outside of your vault (e.g. `file:///C:\path\banner.jpg`)

#### 📦 Updated
- Allow commas in banner filenames

#### 🐛 Fixed
- Ensure pinned banner is the currently displayed image when saving API banners
- Ensure banner icons are only rendered when a main banner image is present
- Banner Icon Image not always rendered until the note was clicked/focused

### v3.6.5
#### 🐛 Fixed
- Fix refresh button to use original comma-separated keywords from frontmatter instead of the cached single keyword
- Resolved issue with the default x/y frontmatter fields not being hidden when the "Hide Pixel Banner Fields" option is enabled
- Updated API call for `Pexels` to conform to spec changes on their side

### v3.6.6
#### 🐛 Fixed
- New folder group entries now inherit the user's default Content Start Position setting instead of being hardcoded to 150px

### v3.6.8
#### ✨ Added
- **Pin Choice Modal**: When pinning API images, users can now choose between saving locally or pinning the URL directly to frontmatter
  - New choice modal presents "Save Image Locally" vs "Pin Image URL" options
  - URL pinning saves no storage space in vault but requires internet connection
  - Local saving remains available for offline access and permanence
  - Choice only appears for user-initiated pin actions (pin icon, command palette)
  - AI generation and Pixel Banner Plus continue to save locally automatically
- **Auto-Focus Enhancement**: Folder selection modal now automatically focuses and selects the text input for improved workflow

### v3.6.7
#### 🐛 Fixed
- Fixed ImageViewModal to properly display banner images and videos when clicking the "Show View Image Icon"
  - Added support for MP4 and MOV video files in the ImageViewModal with proper video player controls
  - Correctly display actual image URLs instead of keywords for 3rd party API banners in the ImageViewModal
  - Local images, videos, and file:/// paths maintain original display behavior

### v3.6.8
#### ✨ Added
- **Pin Choice Modal**: When pinning API images, users can now choose between saving locally or pinning the URL directly to frontmatter
  - New choice modal presents "Save Image Locally" vs "Pin Image URL" options
  - URL pinning saves no storage space in vault but requires internet connection
  - Local saving remains available for offline access and permanence
  - Choice only appears for user-initiated pin actions (pin icon, command palette)
  - AI generation and Pixel Banner Plus continue to save locally automatically
- **Auto-Focus Enhancement**: Folder selection modal now automatically focuses and selects the text input for improved workflow
- `Enter` button support for submitting the save image form in the `Save Image Modal`
- New `Pin Image URL` option to save API images directly as URL references in frontmatter without downloading to vault

#### 📦 Updated
- Replaced manual frontmatter string manipulation with Obsidian's native processFrontMatter API for more reliable metadata updates

### v3.6.9
#### ✨ Added
- New `Icon Image Size Multiplier` setting to the `General` settings tab to control the global size of banner icon images
- Check for version updates when opening `General` settings and show update button if available

#### 📦 Updated
- Moved `AI Model` selection from radio buttons to a dropdown for better organization
- Changed default banner fade value from `-70` to `-40`

### v3.6.10
#### 🐛 Fixed
- Icon images and emojis not being displayed properly

### v3.6.11
#### ✨ Added
- New toggle to turn on/off `Pixel Banner Plus` in the main Pixel Banner select modal
- **Plain image format support**: Added `image` option to Image Property Format setting (without brackets), improving compatibility with Make.md and other plugins

#### 📦 Updated
- Added unquoted wiki-link support for Image Icons paths (e.g. `[[path/icon.png]]`)
- Misc code cleanup

### v3.6.12
#### 🐛 Fixed
- Resolved incorrect `Pixel Banner Plus Server` URL

### v3.6.13
#### ✨ Added
- Support for Multiple Image Reference for new AI Image Generation models
  - `Nano Banana`
  - `Seedream 4`

### v3.6.14
#### 🐛 Fixed
- Resolved issue with `.webp` images not being displayed

### v3.6.15
#### 🐛 Fixed
- Resolved issue with plain paths not working for video files (`.mp4`, `.mov`)

### v3.6.16
#### 🐛 Fixed
- Fixed an occasional error that could prevent banners from displaying correctly

<a href="https://www.youtube.com/watch?v=pJFsMfrWak4">
  <img src="https://pixel-banner.online/img/pixel-banner-transparent-bg.png" alt="Pixel Banner" style="max-width: 400px;">
</a>
