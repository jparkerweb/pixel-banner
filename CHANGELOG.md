# Changelog

All notable changes to the Pixel Banner plugin will be documented in this file.

## [2.9.1] - 2024-11-10

### Fixed
- Fixed overaggressive banner API refresh when editor content changed
- Fixed Pexels API key test

## [2.9.0] - 2024-11-10

### Added
- Option to Hide Pixel Banner property fields from displaying when in Reading Mode
- Option to Hide the Property Section from displaying in Reading Mode if the only fields are Pixel Banner fields  

## [2.8.3] - 2024-11-09

### Added
- Event listener to update banner when note frontmatter is updated via Obsidian's Property Menu

## [2.8.2] - 2024-11-09

### Fixed
- Banner image not updating when image is replaced

## [2.8.1] - 2024-11-07

### Fixed
- Banner image overlapping with note content
- Banner image impacting absolute-positioned and floated elements

## [2.8.0] - 2024-11-04

### Added
- Unsplash API support

## [2.7.0] - 2024-11-03

### Added
- Flickr API support
- Random API provider selection

## [2.6.7] - 2024-11-03

### Fixed
- fix Note properties z-index

## [2.6.6] - 2024-11-03

### Fixed
- Fix z-index issue with banner image

## [2.6.5] - 2024-11-03

### Fixed
- Fix issue when Note elements have "css float" applied (content being pushed down)

## [2.6.4] - 2024-10-30

### Fixed
- Content Start and Y Position inheritance issues

## [2.6.3] - 2024-10-30

### Fixed
- Fixed issue where the Pin and Refresh Icons would sometimes display on notes without banners
- Fixed caching issue where banners from notes viewed previously would display on new/other notes

## [2.6.2] - 2024-10-30

### Added
- Added command palette commands for Pin and Refresh actions
  - Commands are contextually available based on current note and settings
- Added Fuzzy Suggest Modal for Folder Selection when Pinning a Banner Image
- Pin and Refresh Icons are now semi-transparent unless hovered over as to not be too distracting

## [2.6.1] - 2024-10-29

### Updated
- Removed Pin and Refresh Icons from showing in Embedded Notes

## [2.6.0] - 2024-10-29

### Added
- Added a Refresh Icon that appears next to the pin icon for random API images
- Click the refresh icon (🔄) to instantly fetch a new random image
- Enable/Disable the Refresh Icon in Settings (dependent on Pin Icon being enabled)

## [2.5.6] - 2024-10-29
- Scroll the pin icon with note content

## [2.5.5] - 2024-10-29

### Added
- When "Pinning" an image, the plugin now waits for potential a rename/move of the file to the local vault before updating the note frontmatter

## [2.5.4] - 2024-10-29

### Fixed
- "Pinnings" now correctly updates note frontmatter to use local image when saving if the note didn't already have a banner field

## [2.5.3] - 2024-10-29

### Added
- Note frontmatter now updated to allow for keywords separated by commas when using API (allowing for more random variety per note)

## [2.5.2] - 2024-10-29

### Added
- `Folder Images` keywords input now supports multiple keywords separated by commas (allowing for more random variety per folder)

### Fixed
- Fix issue where a defined "Folder Images" path of root `/` was not being respected

## [2.5.1] - 2024-10-29

### Fixed
- Fix description message in settings not appearing correctly

## [2.5.0] - 2024-10-28

### Added
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

### Added
- API Test Buttons: Added "Test API" buttons for both Pexels and Pixabay API keys
  - Instantly verify if your API keys are valid
  - Visual feedback with success/failure notifications
  - Prevents invalid API key submissions

### Fixed
- Settings UI: Fixed issue with callout text visibility when inputs have focus

## [2.3.0] - 2024-10-25

### Added
- Border Radius: Customize the corner radius of banner images (0-100 pixels; default 17)
  - Global default setting
  - Folder-specific override
  - Per-note override via frontmatter
- New custom field names for border radius
- Updated examples to showcase border radius options

## [2.2.5] - 2024-10-24

### Added
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

### Changed
- Improved settings UI with better organization of controls
- Enhanced visual feedback for settings changes
- Updated examples to showcase new banner height and fade options

### Fixed
- Fixed issue where banner image was not being displayed if it was an interal link not wrapped in quotes
- Fixed issue where the banner image z-index was overlapping the properties block
- Fixed issue with Obsidian's virtual DOM removing the banner image and causing image flicker

## [2.1.0] - 2024-10-22

### Added
- Multiple custom field names: Users can now define multiple names for each frontmatter field
- Comma-separated field name definitions in settings
- Validation to prevent duplicate field names across all settings
- Validation to prevent spaces within individual field names
- Enhanced settings UI with clearer instructions for multiple field names
- Updated examples in the settings tab to randomly showcase different field name options

### Changed
- Custom field names are now stored as arrays instead of single strings
- Improved validation feedback when entering invalid field names
- Updated documentation to reflect multiple field name support

## [2.0.0] - 2024-10-21

### Added
- Rebrand to Pixel Banner
- Add support for Pixabay API
- Save and switch between API providers in settings

## [1.5.0] - 2024-10-19

### Added
- Add Banner Image Display options: cover, contain, and auto
  - Allow Image Repeat when "contain" is selected
- Updated settings interface

## [1.4.1] - 2024-10-19

### Bug Fixes
- Fixed issue where banner images were not being displayed in embedded notes

## [1.4.0] - 2024-10-18

### Added
- Content Start Position: Allow users to set a custom start position for content below the banner image
- New setting in the plugin configuration for Content Start Position
- Frontmatter field `content-start-position` to override the global setting on a per-note basis
- Added compatibility with Obsidian's lasted version release 1.7.2+ (deferred views)

### Known Issues
- Embedding notes with banner images is currently not supported, but will be in a future release

## [1.3.0] - 2024-10-12

### Added
- Folder-specific banner images: Set default banner images for entire folders
- Folder selection dialog: Improved UX for selecting folder paths in settings
- Automatic settings application: Changes in settings are now immediately applied to all open notes
- Reset button for default keywords: Added ability to reset default keywords to original values

### Changed
- Improved settings layout: Reorganized settings for better clarity and ease of use
- Enhanced API key description: Clarified when the Pexels API key is required
- Updated default keywords: Expanded the list of default keywords for more variety
- Improved input field layouts: API key and Default keywords inputs now span full width

### Fixed
- Cache invalidation: Resolved issues with cached images not updating when settings changed

## [1.2.0] - 2024-10-11

### Added
- Custom field names feature: Users can now customize the frontmatter field names for the banner and Y-position.
- New settings in the plugin configuration to set custom field names.
- Reset buttons for each custom field name setting.
- Validation to ensure custom field names are unique.

### Changed
- Updated the `updateBanner` and `handleMetadataChange` methods to work with custom field names.
- Improved documentation in README.md to explain the new custom field names feature.

### Developer Notes
- Added new properties to the `DEFAULT_SETTINGS` object for custom field names.
- Modified the `PexelsBannerSettingTab` class to include new settings for custom field names.
- Implemented validation logic to prevent duplicate field names.

## [1.1.0] - 2023-10-09

### Added
- Support for local images from the vault.
- Support for Obsidian internal links to images.

### Changed
- Improved error handling and logging.

## [1.0.0] - 2024-09-23

### Added
- Initial release of the Pixel Banner plugin.
- Fetch and display banner images from Pexels based on keywords.
- Support for direct image URLs.
- Customizable image size and orientation.
- Adjustable vertical position of the banner image.
- Default keywords for when no specific keyword is provided.
