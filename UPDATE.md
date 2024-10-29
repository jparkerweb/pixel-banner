## 🎉 What's New

### v2.5.3 - v2.5.1 
#### Added
- Note frontmatter now updated to allow for keywords separated by commas when using API (allowing for more random variety per note)
- `Folder Images` keywords input now supports multiple keywords separated by commas (allowing for more random variety per folder)

#### Fixed
- Fix issue where a defined "Folder Images" path of root `/` was not being respected
- fix description message in settings not appearing correctly

---

### v2.5.0
#### Added
- Pin Icon Feature: Save API images to your vault
  - Click the pin icon (📌) to save random banner images locally
  - Choose custom filenames when saving
  - Automatically updates note frontmatter to use local image
  - Configure save location in settings
- Orphaned Pins Cleanup: Utility to remove unused pinned images
  - Clean up button in settings
  - Safely moves unused images to trash
  - Checks all custom banner field names
