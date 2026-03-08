# 🚩 Pixel Banner for Obsidian

Pixel Banner is a powerful Obsidian plugin that transforms your notes with customizable banner images, creating visually stunning headers that enhance your knowledge workspace. Go beyond simple note-taking with banners that provide visual context and improved aesthetics.

### Maintained by
<a href="https://www.equilllabs.com">
  <img src="https://raw.githubusercontent.com/jparkerweb/eQuill-Labs/refs/heads/main/src/static/images/logo-text-outline.png" alt="eQuill Labs" height="40">
</a>

<br>

![pixel-banner](img/pixel-banner.jpg)

## Key Features

### ✨ Smart Banner Creation
- **AI-Generated Banners**: Create stunning, custom banners using AI generation without design skills.
- **Banner Collection**: Browse and use professional banner images and videos from the integrated Pixel Banner Plus Collection, including many free options.
- **3rd Party APIs**: Connect to Pexels, Pixabay, Flickr, and Unsplash to automatically fetch banner images based on keywords.
- **Local Image Support**: Use images from your vault as banners with advanced customization options.
- **External File Support**: Reference images outside your vault using the `file:///` protocol (e.g., `file:///C:\Images\banner.jpg` on Windows or `file:///Users/username/Images/banner.jpg` on macOS/Linux).
- **Video Banner Support**: Add dynamic MP4 and MOV videos from your vault as animated banners, with full download support from the Pixel Banner Plus Collection.
- **Direct URL Banners**: Apply banners from any web URL for maximum flexibility.
- **Note Properties Integration**: Control all banner aspects through Obsidian's `properties` feature.

### 🎨 Visual Customization
- **Position Control**: Fine-tune banner placement with precise vertical and horizontal positioning for perfect alignment.
- **Appearance Options**: Customize transparency, border radius, animation effects, and spacing for seamless integration.
- **Display Flexibility**: Choose between display modes (cover, auto, contain) with options for repetition and sizing.
- **Banner Icons**: Add and customize decorative icons with control over size, position, color, background, and style.
- **Title Integration**: Style in-line titles with custom colors that complement your banner designs.
- **Hide Frontmatter**: Automatically hide banner-related fields in reading view for a cleaner look.

### ⚡ Efficient Workflow
- **Banner Selection Modal**: Quick visual picker for local images with sorting options.
- **Command Integration**: Access all banner functions via command palette and hot keys.
- **Quick Action Icons**:
    - **Select**: Quickly choose a banner source.
    - **Pin**: Save a banner from a URL or API as a local file.
    - **Refresh**: Get a new image from the same keyword or URL.
    - **View**: Open the full banner image in a modal.
- **Custom Field Names**: Rename any banner property field to fit your workflow.

### 📂 Smart Organization
- **Folder-Specific Settings**: Configure default banner behavior per folder.
- **Image Shuffling**: Automatically rotate through images in specified folders.
- **Direct Children Option**: Apply settings only to immediate folder contents.
- **Default Saved Banners Folder**: Configurable default location for saving downloaded banners from the collection or pinned from APIs.
- **File Extension Preservation**: Automatically saves banners with correct file extensions (.jpg, .png, .gif, .svg, .mp4, .mov).

### 🎬 Video Banner Features
- **Video File Support**: Full support for MP4 and MOV video files as animated banners.
- **Video Collection**: Download and use professional video banners from the Pixel Banner Plus Collection.
- **Smart UI Elements**: Video banners display with distinct badges and play icons for easy identification.
- **Flexible Saving**: Choose custom save locations and filenames when downloading video banners.
- **Seamless Integration**: Videos work with all existing banner features (positioning, sizing, icons, etc.).

### 💎 Premium Features (Pixel Banner Plus)
- **Token-Based System**: Generate AI banners with a flexible pay-as-you-go model.
- **Banner History**: Access your previously generated banners.
- **Prompt Inspiration**: Get AI assistance with banner ideas.
- **Daily Game**: Play a fun daily game to earn banner tokens.
- **No Subscription Required**: Purchase tokens only when needed.

Enhance your Obsidian experience with beautiful, intelligent banners that make your notes visually distinctive and organized. Whether you prefer AI-generated art, professional designs from the store, or your own images, Pixel Banner helps create a visually cohesive knowledge base.

## 🔧 Installation

1. Open Obsidian and go to Settings
2. Navigate to Community Plugins and disable Safe Mode
3. Click on Browse and search for "Pixel Banner"
4. Install the plugin and enable it

## 🚀 Basic Workflow

1. Open a note and click the `Banner Flag` in the top left corner of your Note  

    ![1](https://raw.githubusercontent.com/jparkerweb/pixel-banner/refs/heads/main/img/1.jpg)

2. Select a `Source` for your Banner (the AI and Collection options require you to first create a FREE Pixel Banner Plus account at: https://pixel-banner.online)  

    ![2](https://raw.githubusercontent.com/jparkerweb/pixel-banner/refs/heads/main/img/2.jpg)

3. _Optionally_ Add an `Icon Image` (choose from your vault, the web, or our online free collection)

    ![3](https://raw.githubusercontent.com/jparkerweb/pixel-banner/refs/heads/main/img/3.jpg)

4. _Optionally_ Add `Icon Emoji & Text` (this can be any text, but it is advised to use an Emoji 🤣)

    ![4](https://raw.githubusercontent.com/jparkerweb/pixel-banner/refs/heads/main/img/4.jpg)

5. _Optionally_ adjust the `position`, `size`, `color`, and other `properties` for the `Banner Image` and `Banner Icon` of the note (by default they will inherit the General settings in Pixel Banner's main setting page, but are customizable per note)

    ![5](https://raw.githubusercontent.com/jparkerweb/pixel-banner/refs/heads/main/img/5.jpg)

6. Click the `Banner Flag` icon anytime to adjust any of these settings (the GUI is the most user-friendly way to adjust a note's pixel banner settings though you can also access and modify them through the `properties` of the note)

    ![6](https://raw.githubusercontent.com/jparkerweb/pixel-banner/refs/heads/main/img/6.jpg)

## 🗂️ Using External Images (file:// Protocol)

You can now reference images stored outside your vault using the `file:///` protocol. This is useful for:
- Sharing banner images across multiple vaults
- Using images from a central image library
- Referencing system-wide image collections

### Usage Examples (frontmatter):
- **Windows**: `banner: file:///C:\Images\banner.jpg` or `banner: file:///C:\Users\username\Pictures\banner.png`
- **macOS**: `banner: file:///Users/username/Pictures/banner.jpg` or `banner: file:///Applications/MyApp/images/banner.png`
- **Linux**: `banner: file:///home/username/Pictures/banner.jpg` or `banner: file:///opt/images/banner.png`

**Note**: The image file must exist at the specified path and be accessible to Obsidian.

## 📝 Manual Banner Configuration (Frontmatter)

You can manually configure banners by editing the frontmatter (properties) of your notes. Pixel Banner supports multiple formats for maximum flexibility:

### Supported Banner Formats

#### Wiki Link Formats
```yaml
banner: [[folder/subfolder/image.jpg]]
banner: [[subfolder/image.jpg]]
banner: [[image.jpg]]
banner: "[[folder/subfolder/image.jpg]]"
banner: "[[subfolder/image.jpg]]"
banner: "[[image.jpg]]"
banner: "![[folder/subfolder/image.jpg]]"
banner: "![[subfolder/image.jpg]]"
banner: "![[image.jpg]]"
```

#### Markdown Image Formats
```yaml
banner: "![](folder/subfolder/image.jpg)"
banner: "![](subfolder/image.jpg)"
banner: "![](image.jpg)"
```

#### Plain Path Formats
```yaml
banner: folder/subfolder/image.jpg
banner: subfolder/image.jpg
banner: image.jpg
banner: "folder/subfolder/image.jpg"
banner: "subfolder/image.jpg"
banner: "image.jpg"
```

#### URL Formats
```yaml
banner: https://example.com/image.jpg
banner: "https://example.com/image.jpg"
```

#### Keyword Formats (API Search)
```yaml
banner: sunset beach
banner: "sunset beach"
banner: nature, landscape, mountains
```

### Important Notes

- **Partial Path Resolution**: Paths like `image.jpg` or `subfolder/image.jpg` are resolved relative to your note's location
- **YAML Limitation**: Unquoted values starting with `!` (like `banner: ![[image.jpg]]`) don't work due to YAML parsing rules. Always quote them: `banner: "![[image.jpg]]"`
- **Video Support**: All formats work with video files (.mp4, .mov) as well as images

### 🎯 Image Property Format Setting

Pixel Banner allows you to choose how banner image paths are saved in your frontmatter when using the GUI. This setting is especially useful for compatibility with other plugins like Make.md (or any other plugin that prefers the plain path format).

To configure this:
1. Go to **Settings → Pixel Banner → General** tab
2. Find the **Image Property Format** dropdown
3. Choose your preferred format:
   - `image` - Plain path format (e.g., `banner: image.jpg`) - **Compatible with Make.md and other plugins that prefer the plain path format**
   - `[[image]]` - Wiki link format (e.g., `banner: [[image.jpg]]`)
   - `![[image]]` - Embedded wiki link format (e.g., `banner: ![[image.jpg]]`)

**Note**: The plugin can **read** all three formats regardless of this setting. This setting only affects how new banner paths are **saved** to frontmatter when inserted through the GUI.

## 🎬 Working with Video Banners

### Adding Video Banners
1. **From Your Vault**: Select video files (.mp4, .mov) from your vault just like images
2. **From Collection**: Browse video banners in the Pixel Banner Plus Collection (marked with video badges)
3. **Download & Save**: Videos are automatically saved with correct file extensions and you can choose the save location

### Video Banner Features
- **Smart Badges**: Video banners display with "VIDEO" badges for easy identification
- **Seamless Experience**: All existing banner features work with videos (icons, positioning, etc.)
- **Flexible Saving**: Choose where to save downloaded videos and customize filenames

### 🎉 Happy Pixel Bannering 🤣

__click a version below to view its features via a YouTube video 📺__
<a href="https://www.youtube.com/watch?v=pJFsMfrWak4">
  <img src="https://pixel-banner.online/img/pixel-banner-logo-v3-trimmed.jpg" alt="Pixel Banner" style="max-width: 400px;">
</a>
<a href="https://www.youtube.com/watch?v=fwvVX7to7-4">
  <img src="https://pixel-banner.online/img/pixel-banner-v3.5.jpg" alt="Pixel Banner" style="max-width: 400px;">
</a>
<a href="https://www.youtube.com/watch?v=tfNqEAQuhXs">
  <img src="https://pixel-banner.online/img/pixel-banner-v3.6.jpg" alt="Pixel Banner" style="max-width: 400px;">
</a>

---

## Appreciation
If you enjoy `Pixel Banner` please consider sending me a tip to support my work 😀
# [🍵 tip me here](https://ko-fi.com/jparkerweb)
Any `ko-fi` donator automatically recieves free `Tokens` to spend in Pixel Banner Plus!

## Feedback and Support

If you encounter any issues or have suggestions for improvements, please [open an issue](https://github.com/jparkerweb/pixel-banner/issues) on the GitHub repository.
