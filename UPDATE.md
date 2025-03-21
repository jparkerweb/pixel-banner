<a href="https://www.youtube.com/watch?v=pJFsMfrWak4">
  <img src="https://pixel-banner.online/img/pixel-banner-logo-v3.jpg" alt="Pixel Banner" style="max-width: 400px;">
</a>

## 🎉 What's New

### v3.1.0 - 2025-03-20
#### ✨ Added
- Modal for setting banner source from a URL
- Added clear instruction to the top of the "Set Banner Icon" modal

#### 📦 Updated
- Added back ability to prevent the `🚩` select pixel banner icon from being displayed on notes (you can still set the opacity of the icon when enabled)
- Improved UX of dragging/selecting banner position when using the "crosshair" targeting control

### v3.0.0 - 2025-03-19
#### ✨ Added
- New `Pixel Banner Plus 🚩➕` premium features:
  > - Curated Store of Images to choose from
  > - Generate banners using custom "text to banner" prompts
  > - Get image prompt inspiration from the AI models
  > - Cloud Server endpoint for handling user accounts and AI interactions (https://pixel-banner.online/)
- When using the '📌 Pin Banner' action, you can specify to not use the saved image as a banner (good for just saving file)
- Targeting Modal now has controls for all Image Banner and Icons settings!
- Added support for `.avif` images
- Added extra calculation to ensure Banner Icon position is within the Note's visible bounds
- Added `repeat` option to the `contain` section of the Targeting Modal
- Support for embedded image format in the Banner frontmatter field: `![[image.jpg]]`
- YouTube promo video: https://www.youtube.com/watch?v=pJFsMfrWak4

#### 📦 Updated
- Complete restructuring of plugin codebase for better organization and maintainability
- The Targeting Modal slider controls won't unintentionally drag the modal

#### 🐛 Fixed
- Fixed issue with the `Folder` selection modal displaying the suggested directory twice when saving a banner image
- Resolved issue with cleaning up cached banner icons when loading notes without banner icons