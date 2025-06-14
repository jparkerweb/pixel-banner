<a href="https://www.youtube.com/watch?v=fwvVX7to7-4">
  <img src="https://pixel-banner.online/img/pixel-banner-v3.5.jpg" alt="Pixel Banner" style="max-width: 400px;">
</a>

## 🎉 What's New
### v3.5.5 - 2025-05-30
#### ✨ Added
- New AI Image Model, `FLUX Kontext (pro)`, allows for uploading images and editing them via text prompts
  - example: type in a prompt "Make this a Studio Ghible cartoon", select the "FLUX Kontext" model, upload an image, then click Generate

### v3.5.4 - 2025-05-27
#### 🐛 Fixed
- Resolve issue with not evaluating all defined custom field names for "banner" frontmatter
- Revert aggresive css change impacting the background color of some theme variations and plugins

### v3.5.3 - 2025-05-23
#### ✨ Added
- New `Icon Image Size Multiplier` control:
  allows for changing the icon image size relative to the Banner Icon elements size (perfect to when you want the image to be larger or smaller than any accompanying icon text)
- New `Icon Text Vertical Offset` control:
  allows for adjusting the vertical offset of the Icon Text relative to the Icon Image if set (perfect for fine-tuning center alignment of text)

#### 📦 Updated
- Updated some labels on the "Position, Size & Style" modal for clarity

### v3.5.2 - 2025-05-21
#### 🐛 Fixed
- Updated styles to remove overflow on images for mobile devices
- Resolved issue with icon image selection modal not using the correct extension for non-svg images

### v3.5.1 - 2025-05-19
#### ✨ Added
- Added Command Palette command for selecting a `Banner Icon Image`

### v3.5.0 - 2025-05-18
#### ✨ Added
- New "Banner Icon Rotation" option to rotate the banner icon from 0 to 360 degrees
- New "Icon Image" support to allow banner icons to contain both text/emojis and an image
- Added Banner Icon Image controls to the Position, Size & Style Modal (image source and alignment)
- Banner Icon Image sources include:
  - Local images
  - Web URL
  - Online Collections (FREE downloadable icons)
- Banner Icon Image alignment options include:
  - Left or Right (set the position of the icon image relative to the text/emojis)
- New Border Radius slider control available in the Position, Size & Style Modal
- Four new AI Models to choose from when generating an image for a banner

#### 📦 Updated
- Embedded notes now respect custom frontmatter settings (border radius, banner height, etc.)
- Any system action that sets the frontmatter value for a Banner or Icon Image now uses `![[image]]` format vs `[[image]]`
- Updated Token currency to allow for fractional tokens (e.g. 0.5 tokens) for better pricing where applicable

#### 🐛 Fixed
- Resolved issue with content being pushed down when banner was present in embedded notes
- Resolved issue with max-width slider being disabled even when a custom max-width was set in frontmatter
- Addressed background color preventing banner from showing in reading mode for some themes

<a href="https://www.youtube.com/watch?v=pJFsMfrWak4">
  <img src="https://pixel-banner.online/img/pixel-banner-transparent-bg.png" alt="Pixel Banner" style="max-width: 400px;">
</a>
