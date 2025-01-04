# 🚩 Pixel Banner for Obsidian

Pixel Banner is a plugin for Obsidian that allows you to automatically add beautiful banner images to your notes using various images provider APIs, direct URLs, or local images with folder-specific settings supported. Enhance your note-taking experience with visually appealing headers that provide context and improve the overall aesthetics of your notes.

### Maintained by
<a href="https://www.equilllabs.com">
  <img src="https://raw.githubusercontent.com/jparkerweb/eQuill-Labs/refs/heads/main/src/static/images/logo-text-outline.png" alt="eQuill Labs" height="40">
</a>

<br>
<br>

![pixel-banner](img/pixel-banner.jpg)

## Highlights

- Seamless integration with Obsidian's interface
- Use popular **images providers** ([Pexels](https://www.pexels.com/), [Pixabay](https://pixabay.com/), [Flickr](https://www.flickr.com/), and [Unsplash](https://unsplash.com/)), automatically fetch and display banner images based on keywords
- Use **direct URLs** for custom images
- Use **local images** from your vault
- Use **Obsidian internal links** to images
- **Customize banner appearance** globally, per folder, or per note by plugin settings and [properties](https://help.obsidian.md/Editing+and+formatting/Properties) of note

### Main Features

- **Banner Image selection** modal, local image picker with sort options
- **select, pin, and refresh commands** for command palette and **hotkeys**
- Adjust **vertical position** of the banner image
- Set **banner height** (100-2500 pixels) as well as **content start position** of note
- Set the banner **image display** to cover or contain and adjust wrapping
- Control **banner fade** transparency (-1500 to 100)
- Banner Image **Border radius** customization
- Set **banner gap** between banner and the window edges
- Customize **inline title color** (requires Obsidian's "Show inline title" setting enabled)
- Control **Titles and Banners embedded note**
- Option to **hide Pixel Banner fields** at frontmatter (properties) in Reading mode
- **Customize frontmatter field names** for per note appearance

### Other Features

- Option to display fast **select banner icon** with Banner Image selection modal
- Option to display **icon for view banner in fullscreen** display
- Set **default folder path** when opening the Banner Image selection modal
- Automatically **show release notes** after plugin updates
- Option to display **pin icon** for save banner image from API to local folder
- Option to display **refresh icon** to get new random image
- Set **pinned images folder** path to save pinned image for permanent banner
- **Clean orphaned images** in pinned images folder
- Select **size and orientation** of images when fetch from images providers
- Choose **number of images** when fetch from images providers
- Set **default keywords** for fetch when no specific keyword is provided

## Installation

1. Open Obsidian and go to Settings
2. Navigate to Community Plugins and disable Safe Mode
3. Click on Browse and search for "Pixel Banner"
4. Install the plugin and enable it

### Manual Installation
- Unzip the [latest release](https://github.com/jparkerweb/pixel-banner/releases/latest) into your `<vault>/.obsidian/plugins/` folder.

## Usage

1. Obtain a free API key from [Pexels](https://www.pexels.com/api/), [Pixabay](https://pixabay.com/api/docs/), [Flickr](https://www.flickr.com/services/api/), or [Unsplash](https://unsplash.com/oauth/applications) (requires account to generate API)
2. In Obsidian, go to Settings > Pixel Banner and enter your API key(s)
3. In any note, add a `banner` field to the frontmatter with keywords for the desired image, a direct URL, a path to a local image, or an Obsidian internal link:

```yaml
---
banner: blue turtle
---

### Or use a direct URL:

---
banner: https://example.com/image.jpg
---

### Or use a local image:

---
banner: /path/to/local/image.jpg
---

### Or use an Obsidian internal link:

---
banner: [[path/to/internal/image.jpg]]
---

### All settings can be overridden per note:

---
banner: ocean
banner-y: 30
content-start: 90
banner-display: contain
banner-repeat: true
banner-height: 500
banner-fade: -75
banner-radius: 50
banner-title-color: "#FF5733"
---
```

### Custom Field Names

You can customize the frontmatter field names used for each setting, and even define multiple names for each field. For example, if you set the banner field names to "banner, header-image, cover" and the Y-position field names to "banner-y, y-pos", you could use any 
of these variations in your frontmatter:

```yaml
---
header-image: sunset
y-pos: 22
---

---
banner-y: 60
y-pos: 60
---

---
header-image: sunset
banner-y: 30
---
```

Field names must follow these rules:
- Only letters, numbers, dashes, and underscores are allowed
- No spaces within field names (spaces after commas are fine)
- Names must be unique across all fields

### API Settings

In the API settings, you can customize:

- API Provider (Pexels/Pixabay/Flickr/Unsplash)
  - Test your API keys directly in settings with the "Test API" button
  - Get immediate feedback if your API key is valid
- Image size (small, medium, large)
- Image orientation (landscape, portrait, square)
- Number of images to fetch (1-50)
- Show pin/refresh icon
- Default keywords for when no specific keyword is provided

#### Pin API Images

When using random images from images providers, you'll see a pin icon (📌) in the top left corner of the banner. Click this to:
1. Save the image to your vault
2. Update your note's frontmatter to use the local image
3. Never lose that perfect banner image again!

You can configure the save location and manage orphaned pins in settings.

### Folder-Specific Banners

You can set default banner images for entire folders:

1. Go to Settings > Pixel Banner
2. Open "Folder Images" page
3. Click "Add Folder Image Setting"
4. Configure the folder settings:
   - Folder path
   - Enable Image Shuffle option: Randomly select an image from a specified folder each time the note loads
   - Y-position (0-100)
   - Banner height (100-2500 pixels)
   - Fade effect (-1500 to 100)
   - Border radius
   - Inline title color
   - Display mode and repeat settings
   - Direct Children Only: Enable this option to apply the banner settings only to the direct children of the specified folder, excluding subfolders.
5. Repeat for additional folders as needed

Folder-specific settings will apply to all notes in that folder (and subfolders) that don't have their own banner specified in the frontmatter, unless the "Direct Children Only" option is enabled.

## Example Note Screenshot

![example](example.jpg)

## Settings Screenshot

![settings-1](img/settings-1.jpg)

![settings-2](img/settings-2.jpg)

![settings-3](img/settings-3.jpg)

![settings-4](img/settings-4.jpg)

![settings-4](img/settings-5.jpg)

## Appreciation
If you enjoy this plugin please consider sending me a tip to support my work 😀
# [🍵 tip me here](https://ko-fi.com/jparkerweb)

## Feedback and Support

If you encounter any issues or have suggestions for improvements, please [open an issue](https://github.com/jparkerweb/pixel-banner/issues) on the GitHub repository.
