# OCR for macOS - Obsidian Plugin

![AI Assisted](https://img.shields.io/badge/AI%20Assisted-Claude%2FCursor-blueviolet)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

Automatically extract text from images in your Obsidian vault using macOS's built-in Vision framework. Makes your image content searchable.

## Features

- **Automatic OCR**: Processes images as they're added to your vault
- **Native Performance**: Uses Apple's Vision framework - fast and accurate
- **Privacy First**: All processing happens locally, no data leaves your machine
- **Searchable**: Extracted text is stored as markdown files, fully indexed by Obsidian's search
- **Multi-language**: Automatic language detection via Vision framework

## Requirements

- **macOS only** - This plugin uses Apple's Vision framework and will not work on Windows or Linux
- macOS 10.15 (Catalina) or later
- Obsidian 1.4.0 or later

## Installation

### From Release

1. Download the latest release (`main.js`, `manifest.json`, `ocr-cli`)
2. Create folder: `<your-vault>/.obsidian/plugins/obsidian-ocr-macos/`
3. Copy the three files into that folder
4. Enable the plugin in Obsidian Settings → Community plugins

### From Source

```bash
# Clone the repository
git clone https://github.com/yourusername/obsidian-ocr-macos.git
cd obsidian-ocr-macos

# Install dependencies
npm install

# Build everything (Swift CLI + TypeScript)
npm run build:all

# Install to your vault
./install.sh ~/path/to/your/vault
```

## Usage

### Automatic Processing

By default, the plugin automatically processes any new images added to your vault. Extracted text is saved to `_ocr-index/` folder as markdown files (the underscore prefix keeps it at the top of your file explorer, out of the way).

### Manual Processing

- **Command Palette**: "OCR for macOS: Run OCR on current file"
- **Command Palette**: "OCR for macOS: Run OCR on all images in vault"

### Settings

- **Automatic processing**: Toggle auto-OCR on/off
- **Show notifications**: Get notified when OCR completes
- **Index folder**: Where to store extracted text (default: `_ocr-index`)
- **Excluded folders**: Folders to skip during OCR processing

## How Search Works

When you search in Obsidian, it indexes all markdown files including the OCR cache files. Each cache file contains:

```markdown
---
source: "attachments/photo.png"
processed: 2026-01-28T10:30:00Z
---

[Extracted text from the image]
```

So searching for text that appears in an image will find the cache file, which links back to the source image.

## Supported Image Formats

- PNG
- JPEG / JPG
- GIF
- WebP
- BMP
- TIFF

## Building

```bash
# Development (watch mode)
npm run dev

# Production build
npm run build

# Rebuild Swift CLI only
npm run build:swift

# Build everything
npm run build:all
```

## Acknowledgments

This plugin was developed with AI assistance (Claude via Cursor).

## License

MIT License - see [LICENSE](LICENSE) file.
