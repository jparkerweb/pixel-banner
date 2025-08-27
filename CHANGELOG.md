# Changelog

All notable changes to the Pixel Banner plugin will be documented in this file.

### v3.6.11 - 2025-08-27
#### ✨ Added
- New toggle to turn on/off `Pixel Banner Plus` in the main Pixel Banner select modal

#### 📦 Updated
- Added unquoted wiki-link support for Image Icons paths (e.g. `[[path/icon.png]]`)

### v3.6.10 - 2025-08-25
#### 🐛 Fixed
- Icon images and emojis not being displayed properly

### v3.6.9 - 2025-08-22
#### ✨ Added
- New `Icon Image Size Multiplier` setting to the `General` settings tab to control the global size of banner icon images
- Check for version updates when opening `General` settings and show update button if available

#### 📦 Updated
- Moved `AI Model` selection from radio buttons to a dropdown for better organization
- Changed default banner fade value from `-70` to `-40`

### v3.6.8 - 2025-08-14
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

### v3.6.7 - 2025-07-19
#### 🐛 Fixed
- Fixed ImageViewModal to properly display banner images and videos when clicking the "Show View Image Icon"
  - Added support for MP4 and MOV video files in the ImageViewModal with proper video player controls
  - Correctly display actual image URLs instead of keywords for 3rd party API banners in the ImageViewModal
  - Local images, videos, and file:/// paths maintain original display behavior

### v3.6.6 - 2025-07-17
#### 🐛 Fixed
- New folder group entries now inherit the user's default Content Start Position setting instead of being hardcoded to 150px

### v3.6.5 - 2025-07-17
#### 🐛 Fixed
- Fix refresh button to use original comma-separated keywords from frontmatter instead of the cached single keyword
- Resolved issue with the default x/y frontmatter fields not being hidden when the "Hide Pixel Banner Fields" option is enabled
- Updated API call for `Pexels` to conform to spec changes on their side

### v3.6.4 - 2025-07-13
#### ✨ Added
- Banner images now support local `file` protocol for images outside of your vault (e.g. `file:///C:\path\banner.jpg`)

#### 📦 Updated
- Allow commas in banner filenames

#### 🐛 Fixed
- When pinning an 3rd party API banner, use the current displayed image when saving
- Ensure banner icons are only rendered when a main banner image is present
- Banner Icon Image not always rendered until the note was clicked/focused

### v3.6.3 - 2025-06-30
#### ✨ Added
- Added `filesize` display to the store modal

### v3.6.2 - 2025-06-30
#### 📦 Updated
- Improved debounce logic to prevent multiple banner reloads when opening a note

### v3.6.1 - 2025-06-30
#### 🐛 Fixed
- Resolved issue with Icon Image selection modal not setting the selected icon image

### v3.6.0 - 2025-06-29
#### ✨ Added
- Support for 🎬 Video Banners!
  - Upload and choose Video files as banners from your vault
  - Downloadable 🎬 Video Banners from the `Pixel Banner Plus Collection`
- Added paging controls to the `Pixel Banner Plus Collection`
- New global `Banner Max Width` setting to control the default max width for all banners

#### 📦 Updated
- Moved `Default Saved Banners Folder` setting to the `General` tab
- Renamed `Pixel Banner Plus Store` to `Pixel Banner Plus Collection` as many items are free

### v3.5.6 - 2025-06-26
#### ✨ Added
- New `image property format` setting allows for specifying banner image format as `[[image]]` or `![[image]]`
- Introduced `pinnedImageFilename` setting for default filename when pinning 3rd party API images

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

### v3.4.5 - 2025-04-30
#### 📦 Updated
- Additional improvements to compatibility with `Better Search Views` plugin

### v3.4.4 - 2025-04-28
#### ✨ Added
- Add settings toggle to allow turning OFF all `Pixel Banner Plus` features, API calls and related content for those that don't want it

#### 🐛 Fixed
- Resolved conflict with Banner images showing in the hover popover preview for backlinks in the `Better Search Views` plugin

### v3.4.3 - 2025-04-24
#### ✨ Added
- New `Show Banner in Popover Previews` setting to control banner visibility in hover popovers (enabled by default)

### v3.4.2 - 2025-04-23
#### 📦 Updated
- Added an example section to the `3rd Party API Settings` tab for clarity
- Minor General Setting tab formatting improvements

### v3.4.1 - 2025-04-22
#### ✨ Added
- Added `Banner Fade` slider control to the Targeting & Positioning UI
- New `HiDream` AI Model support for Banner Image generation

#### 📦 Updated
- Set Banner Icon modal now has a "Remove Icon" button to claer the banner icon easily
- Updated emoji selection modal to handle cleaning up banner icon properties if the icon is removed

### v3.4.0 - 2025-04-19
#### ✨ Added
- New `Max Width` setting for banners to control the maximum width of the banner
- New `Banner Alignment` control to adjust placement when a banner doesn't fill the width of the note

### v3.3.4 - 2025-04-18
#### 📦 Updated
- Fixed background color on server connection retry button
- Enhanced "Next Category" button to be more visible
- Delay re-rendering of banner when resetting defaults in targeting modal
- Added retry logic to authentication process

### v3.3.3 - 2025-04-15
#### ✨ Added
- Added `🗑️ Remove Banner` button to the Targeting Modal for easy banner cleanup
- New `Copy Path` button to the Image View Modal for a convenient way to copy banner paths

### v3.3.2 - 2025-04-15
#### 🐛 Fixed
- Resolved authentication issues with the Pixel Banner Plus API

### v3.3.1 - 2025-04-15
#### 📦 Updated
- The `Daily Game` is `opt-in` and optional (must be enabled in the Pixel Banner Plus settings)

### v3.3.0 - 2025-04-15
#### ✨ Added
- Introducing the NEW `Daily Game` section!
- Users get three FREE plays per day; Highest score wins the jackpot of Tokens!
- Launch Game Library:
  - 🧱 Brick Breaker
  - 🐦 Flapping Bird
  - 🐸 Frog Jump
  - ⏹️ Pixel Stacker
  - 🐍 Snake

### v3.2.5 - 2025-04-10
#### 📦 Updated
- Refactored the banner selection modal's UI to initialize basic elements immediately while API-dependent sections load in the background.

### v3.2.4 - 2025-04-06
#### 🐛 Fixed
- Resolved issue with default custom filed values for x/y position (new users were unable to set x/y on notes)

#### 📦 Updated
- Added support for Markdown image syntax in Banner frontmatter: `"![](imgage-path|url)"`

### v3.2.3 - 2025-03-28
#### 📦 Updated
- Improved server connection check logic
- Remove unnecessary server calls for store banner voting

### v3.2.2 - 2025-03-26
#### 🐛 Fixed
- Fix alignment of the "prompt" text area on the `Generate with AI` modal

### v3.2.1 - 2025-03-26
#### 🐛 Fixed
- Resolved issue with the `content start` position of a Note without a banner

### v3.2.0 - 2025-03-25
#### ✨ Added
- Basic "Banner View" to hover previews
- New "Add Banner Icon" button will be displayed on the `Targeting Modal` if an icon doesn't already exist
- Added `NEW` and `HOT` metadata badges to banners in the store

#### 📦 Updated
- Addressed style conflicts with the `Border` theme and `Style Settings`
- Improved Performance: added `debounce` logic to internal rendering functions to prevent unnecessary subsequent calls
- Improved Performance: reduce `content` push flicker by immediately setting the content at its start position before rendering Banner assets

#### 🐛 Fixed
- Resolved issue with the "Set Banner Icon" & "Adjust Position, Size & Style" buttons being disabled if the note was set to use a `shuffle banner`
- Adjusted style to accommodate for mobile screen sizes

### v3.1.0 - 2025-03-22
#### ✨ Added
- Modal for setting banner source from a URL
- Add voting functionality to Pixel Banner Store
- Added clear instruction to the top of the "Set Banner Icon" modal
- Enhance the visibility of the "🌱 GROW YOUR IDEA" button on the AI Banner modal to make it more prominent, highlighting its usefulness
- Show a "Upgrade Available" message in the footer of the Pixel Banner Main Menu if a new version is available

#### 📦 Updated
- Added back ability to prevent the `🚩` select pixel banner icon from being displayed on notes (you can still set the opacity of the icon when enabled)
- Improved UX of dragging/selecting banner position when using the `crosshair` targeting control

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

### v2.21.2 - 2025-01-28
#### 📦 Updated
- The Targeting Modal is now draggable (can help move it out of the way to see the banner)
- Updated the padding and height of embedded notes without banners to shrink to their content
- Improved cache to include banner icons

#### 🐛 Fixed
- Fixed issue with select image icon being added to embedded notes

### [v2.21.1] - 2025-01-23
#### 🐛 Fixed
- Addressed issue with target icon button not being cleaned up when viewing a note without a banner
- Resolved custom inline title colors being applied to notes without banners
- Resolved issue with Pixel Banner plugin preventing notes from being exported to PDF

### [v2.21.0] - 2025-01-21
#### ✨ Added
- New Targeting Modal with controls to set zoom level, height, and position for your banner image
- Command palette option and icon button to quickly open the targeting modal

### [v2.20.4] - 2025-01-20
#### 🐛 Fixed
- fixed issue with banner not updating correctly when frontmatter changes
- improved banner refresh logic to prevent unnecessary updates
- optimized cache management for better performance

#### 📦 Updated
- improved banner width styling to combat the aggressive implementation of the `minimal` theme

### [v2.20.3] - 2025-01-18
#### ✨ Added
- added `font weight` option to the banner icon settings (general, folder images, and frontmatter)

#### 🐛 Fixed
- fixed issue with a large gap appearing between the banner and the note content when using the `hide embedded note banners` setting

### [v2.20.2] - 2025-01-17
#### ✨ Added
- added `banner-fade-in-animation-duration` general setting to control the duration of the fade in animation for the banner image

### [v2.20.1] - 2025-01-17
#### 📦 Updated
- replaced `icon-padding` with `icon-padding-x` and `icon-padding-y` for more granular control

#### 🐛 Fixed
- resolved issue with the banner updating while editing a note's content (causing the banner to flicker)
- resolved issue with the banner icon not being preserved when scrolling to the bottom of a note

### [v2.20.0] - 2025-01-16
#### ✨ Added the highly requested feature: `Banner Icons`!
- Add emoji overlays (⭐, 🎨, 📝, etc.) to your banners
- Customize icon appearance:
  > - Size (10-200px)
  > - Position (left/right alignment)
  > - Opacity (0-100%)
  > - Color (any CSS color)
  > - Background color (any CSS color or transparent)
  > - Padding (spacing around the icon)
  > - Border radius (rounded corners)
  > - Vertical offset (adjust up/down position)
- Set icons in multiple ways:
  > - Click the ⭐ button on any banner to choose an icon
  > - Set via frontmatter using banner-icon field (or your custom field name)
  > - Configure default icon settings globally  
  > - Set per-folder icon settings
  > - Icons persist across banner image changes and refreshes
  > - Icons work with all banner types (API images, local images, URLs)
  > - Icons appear in both edit and preview modes
  > - Icons maintain their position relative to banner height

#### 📦 Updated
- Removed the "fade-in" animation from banner images

### [v2.19.2] - 2025-01-09
#### 🐛 Fixed
- Fixed issue where content start position was not being applied from General settings

### [v2.19.1] - 2025-01-08
#### ✨ Added
- Show example frontmatter values for each field in "Custom Field Names" settings tab

#### 📦 Updated
- Updated CSS to address padding issue with `Bread Crumbs` and `Typwriter Mode` plugins

### [v2.19.0] - 2025-01-06
#### ✨ Added
- Horizontal image positioning with new X-Position slider
- X-Position support in General, Folder Image, and Frontmatter settings

### [v2.18.2] - 2025-01-02
#### ✨ Added
- Support for SVG images

#### 📦 Updated
- Pinning a Banner Image now uses internal link format (similar to the Select Banner Image modal)
- Set a max width for the Banner Image selection modal (1100px)

#### 🐛 Fixed
- The "Cleaned Orphaned Pins" button now correctly evaluates internal links in addition to plain paths

### [v2.18.1] - 2025-01-01
#### 📦 Updated
- Mobile layout improvements for Banner Image selection modal
- Quote paths when inserting a Banner Image from the Banner Image selection modal

### [v2.18.0] - 2025-01-01
#### ✨ Added
- Switch to internal image reference format when Selecting a Banner Image
- Option to use `short paths` for image references (e.g. `[[forest.jpg]]` instead of `[[path/forest.jpg]]`)
- New setting to set the gap between the banner and the window edges (0-50 pixels)

#### 📦 Updated
- Improved the Banner Image selection modal UI

### [v2.17.0] - 2024-12-30
#### ✨ Added
- Sorting and Pagination controls for the Banner Image selection modal  
  (great for finding images in a large vault with many images)

## [v2.16.3] - 2024-12-28
### ✨ Added
- Add support for render links for banners (e.g. `![[banner.jpg]]`)

## [v2.16.2] - 2024-12-23
### 🐛 Fixed
- Fixed an issue with "content start" padding being applied to embedded notes without a banner

## [v2.16.1] - 2024-12-22
### 🐛 Fixed
- Fixed an issue with "Banner Shuffle" not working when defined via frontmatter

## [v2.16.0] - 2024-12-22
### ✨ Added
- New setting to hide embedded note banners

### 🐛 Fixed
- Fixed an issue with embedded note banner's "content start" position not being obeyed

## [v2.15.2] - 2024-12-21
### 🐛 Fixed
- Fixed an issue with using the `Select Image` button to select an image with a `[` in the filename

## [v2.15.1] - 2024-12-20
### ✨ Added
- Option to select/upload images from your file system when using the `Select Image` button

## [v2.15.0] - 2024-12-20
### ✨ Added
- New 🏷️ `Select Image` button icon to streamline selecting banner images via an image search modal (enabled by default)
- Default path setting to pre-filter the image search modal to a specific folder in your vault
- New command palette option to quickly open the image search/selection modal
- These enhancements make applying Pixel Banners to your notes simpler and more intuitive than ever

## [v2.14.0] - 2024-12-19
### ✨ Added
- New setting to hide embedded note titles

## [v2.13.2] - 2024-12-17
### 📦 Updated
- Adjusted dynamic CSS calculations for banner positioning, padding, and scrollbar width

## [v2.13.1] - 2024-12-11
### 📦 Updated
- Banner width now updates when the window is resized
- Banner width is now compatible with the popular `minimal` theme

## [v2.13.0] - 2024-12-09
#### ✨ Added
- New `view image` button icon option to open the banner image in a full-screen modal  
  (works with plugins like `image toolkit`, etc.)

## [v2.12.0] - 2024-12-02
#### ✨ Added
- 🔀 Random Image Shuffle functionality
- Folder Images: You can enable random image selection from a specified folder in settings
- Frontmatter Support: Use `banner-shuffle` in frontmatter to specify a folder path for random image selection
- Images are randomly selected each time the note is opened
- This feature is perfect for adding variety to your notes with minimal setup using local images

## [v2.11.0] - 2024-11-29
#### ✨ Added
- Abity to 📌 Pin URL banners

## [v2.10.2] - 2024-11-25
#### 🐛 Fixed
- Banners were being applied to the background of embedded media (images, videos, etc.)

#### 📦 Updated
- Improved Pexels API key validation
- Removed old console logs entries

## [v2.10.1] - 2024-11-14
### ✨ Added
- Color Picker Reset button for Folder Images tab (only applies if Inline Titles are enabled in Obsidian Settings)

### 🐛 Fixed
- Display the correct color in the Color Picker for Inline Titles when the control is reset

## [v2.10.0] - 2024-11-13

### ✨ Added
- Color Picker for Inline Titles
  - Only applied if Inline Titles are enabled in Obsidian Settings:
    - `Appearance` > `Show inline title`
  - Can be defined on the General, Custom Field Names, and Folder Images tabs

## [2.9.1] - 2024-11-10

### 🐛 Fixed
- Fixed overaggressive banner API refresh when editor content changed
- Fixed Pexels API key test

## [2.9.0] - 2024-11-10

### ✨ Added
- Option to Hide Pixel Banner property fields from displaying when in Reading Mode
- Option to Hide the Property Section from displaying in Reading Mode if the only fields are Pixel Banner fields  

## [2.8.3] - 2024-11-09

### ✨ Added
- Event listener to update banner when note frontmatter is updated via Obsidian's Property Menu

## [2.8.2] - 2024-11-09

### 🐛 Fixed
- Banner image not updating when image is replaced

## [2.8.1] - 2024-11-07

### 🐛 Fixed
- Banner image overlapping with note content
- Banner image impacting absolute-positioned and floated elements

## [2.8.0] - 2024-11-04

### ✨ Added
- Unsplash API support

## [2.7.0] - 2024-11-03

### ✨ Added
- Flickr API support
- Random API provider selection

## [2.6.7] - 2024-11-03

### 🐛 Fixed
- fix Note properties z-index

## [2.6.6] - 2024-11-03

### 🐛 Fixed
- Fix z-index issue with banner image

## [2.6.5] - 2024-11-03

### 🐛 Fixed
- Fix issue when Note elements have "css float" applied (content being pushed down)

## [2.6.4] - 2024-10-30

### 🐛 Fixed
- Content Start and Y Position inheritance issues

## [2.6.3] - 2024-10-30

### 🐛 Fixed
- Fixed issue where the Pin and Refresh Icons would sometimes display on notes without banners
- Fixed caching issue where banners from notes viewed previously would display on new/other notes

## [2.6.2] - 2024-10-30

### ✨ Added
- Added command palette commands for Pin and Refresh actions
  - Commands are contextually available based on current note and settings
- Added Fuzzy Suggest Modal for Folder Selection when Pinning a Banner Image
- Pin and Refresh Icons are now semi-transparent unless hovered over as to not be too distracting

## [2.6.1] - 2024-10-29

### 🐛 Fixed
- Removed Pin and Refresh Icons from showing in Embedded Notes

## [2.6.0] - 2024-10-29

### ✨ Added
- Added a Refresh Icon that appears next to the pin icon for random API images
- Click the refresh icon (🔄) to instantly fetch a new random image
- Enable/Disable the Refresh Icon in Settings (dependent on Pin Icon being enabled)

## [2.5.6] - 2024-10-29

### ✨ Added
- Scroll the pin icon with note content

## [2.5.5] - 2024-10-29

### ✨ Added
- When "Pinning" an image, the plugin now waits for potential a rename/move of the file to the local vault before updating the note frontmatter

## [2.5.4] - 2024-10-29

### 🐛 Fixed
- "Pinnings" now correctly updates note frontmatter to use local image when saving if the note didn't already have a banner field

## [2.5.3] - 2024-10-29

### ✨ Added
- Note frontmatter now updated to allow for keywords separated by commas when using API (allowing for more random variety per note)

## [2.5.2] - 2024-10-29

### ✨ Added
- `Folder Images` keywords input now supports multiple keywords separated by commas (allowing for more random variety per folder)

### 🐛 Fixed
- Issue where a defined "Folder Images" path of root `/` was not being respected

## [2.5.1] - 2024-10-29

### 🐛 Fixed
- Description message in settings not appearing correctly

## [2.5.0] - 2024-10-28

### ✨ Added
- Pin Icon Feature: Save API images to your vault
  - Click the pin icon (📌) to save random banner images locally
  - Choose custom filenames when saving
  - Automatically updates note frontmatter to use local image
  - Configure save location in settings
- Orphaned Pins Cleanup: New utility to remove unused pinned images
  - Clean up button in settings
  - Safely moves unused images to trash
  - Checks all custom banner field names

## [2.4.0] - 2024-10-26

### ✨ Added
- API Test Buttons: Added "Test API" buttons for both Pexels and Pixabay API keys
  - Instantly verify if your API keys are valid
  - Visual feedback with success/failure notifications
  - Prevents invalid API key submissions

### 🐛 Fixed
- Settings UI: Fixed issue with callout text visibility when inputs have focus

## [2.3.0] - 2024-10-25

### ✨ Added
- Border Radius: Customize the corner radius of banner images (0-100 pixels; default 17)
  - Global default setting
  - Folder-specific override
  - Per-note override via frontmatter
- New custom field names for border radius
- Updated examples to showcase border radius options

## [2.2.5] - 2024-10-24

### ✨ Added
- Banner Height: Customize the height of banner images (100-2500 pixels; default 350)
  - Global default setting
  - Folder-specific override
  - Per-note override via frontmatter
- Banner Fade Effect: Control the fade transparency (-1500 to 100)
  - Global default setting
  - Folder-specific override
  - Per-note override via frontmatter
- New custom field names for banner height and fade effect
- Updated settings interface with slider controls for fade effect
- Direct Children Only option for Folder Images
  - Enable this option to apply the banner settings only to the _direct children_ of the specified folder, excluding subfolders.

### 📦 Changed
- Improved settings UI with better organization of controls
- Enhanced visual feedback for settings changes
- Updated examples to showcase new banner height and fade options

### 🐛 Fixed
- Fixed issue where banner image was not being displayed if it was an interal link not wrapped in quotes
- Fixed issue where the banner image z-index was overlapping the properties block
- Fixed issue with Obsidian's virtual DOM removing the banner image and causing image flicker

## [2.1.0] - 2024-10-22

### ✨ Added
- Multiple custom field names: Users can now define multiple names for each frontmatter field
- Comma-separated field name definitions in settings
- Validation to prevent duplicate field names across all settings
- Validation to prevent spaces within individual field names
- Enhanced settings UI with clearer instructions for multiple field names
- Updated examples in the settings tab to randomly showcase different field name options

### 📦 Changed
- Custom field names are now stored as arrays instead of single strings
- Improved validation feedback when entering invalid field names
- Updated documentation to reflect multiple field name support

## [2.0.0] - 2024-10-21

### ✨ Added
- Rebrand to Pixel Banner
- Add support for Pixabay API
- Save and switch between API providers in settings

## [1.5.0] - 2024-10-19

### ✨ Added
- Add Banner Image Display options: cover, contain, and auto
  - Allow Image Repeat when "contain" is selected
- Updated settings interface

## [1.4.1] - 2024-10-19

### 🐛 Fixed
- Fixed issue where banner images were not being displayed in embedded notes

## [1.4.0] - 2024-10-18

### ✨ Added
- Content Start Position: Allow users to set a custom start position for content below the banner image
- New setting in the plugin configuration for Content Start Position
- Frontmatter field `content-start-position` to override the global setting on a per-note basis
- Added compatibility with Obsidian's lasted version release 1.7.2+ (deferred views)

### 🐛 Known Issues
- Embedding notes with banner images is currently not supported, but will be in a future release

## [1.3.0] - 2024-10-12

### ✨ Added
- Folder-specific banner images: Set default banner images for entire folders
- Folder selection dialog: Improved UX for selecting folder paths in settings
- Automatic settings application: Changes in settings are now immediately applied to all open notes
- Reset button for default keywords: Added ability to reset default keywords to original values

### 📦 Changed
- Improved settings layout: Reorganized settings for better clarity and ease of use
- Enhanced API key description: Clarified when the Pexels API key is required
- Updated default keywords: Expanded the list of default keywords for more variety
- Improved input field layouts: API key and Default keywords inputs now span full width

### 🐛 Fixed
- Cache invalidation: Resolved issues with cached images not updating when settings changed

## [1.2.0] - 2024-10-11

### ✨ Added
- Custom field names feature: Users can now customize the frontmatter field names for the banner and Y-position.
- New settings in the plugin configuration to set custom field names.
- Reset buttons for each custom field name setting.
- Validation to ensure custom field names are unique.

### 📦 Changed
- Updated the `updateBanner` and `handleMetadataChange` methods to work with custom field names.
- Improved documentation in README.md to explain the new custom field names feature.

### 📝 Developer Notes
- Added new properties to the `DEFAULT_SETTINGS` object for custom field names.
- Modified the `PexelsBannerSettingTab` class to include new settings for custom field names.
- Implemented validation logic to prevent duplicate field names.

## [1.1.0] - 2023-10-09

### ✨ Added
- Support for local images from the vault.
- Support for Obsidian internal links to images.

### 📦 Changed
- Improved error handling and logging.

## [1.0.0] - 2024-09-23

### ✨ Added
- Initial release of the Pixel Banner plugin.
- Fetch and display banner images from Pexels based on keywords.
- Support for direct image URLs.
- Customizable image size and orientation.
- Adjustable vertical position of the banner image.
- Default keywords for when no specific keyword is provided.
