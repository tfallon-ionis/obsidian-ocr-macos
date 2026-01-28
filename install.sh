#!/bin/bash

# Install script for Obsidian OCR macOS plugin
# Usage: ./install.sh [vault-path]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_NAME="obsidian-ocr-macos"

# Required files to copy
REQUIRED_FILES=("main.js" "manifest.json" "ocr-cli")

# Check if required files exist
for file in "${REQUIRED_FILES[@]}"; do
    if [[ ! -f "$SCRIPT_DIR/$file" ]]; then
        echo "Error: $file not found. Please build the plugin first:"
        echo "  npm run build:all"
        exit 1
    fi
done

# Get vault path from argument or prompt
if [[ -n "$1" ]]; then
    VAULT_PATH="$1"
else
    echo "Obsidian OCR macOS - Plugin Installer"
    echo "======================================"
    echo ""
    read -p "Enter your Obsidian vault path: " VAULT_PATH
fi

# Expand ~ to home directory
VAULT_PATH="${VAULT_PATH/#\~/$HOME}"

# Validate vault path
if [[ ! -d "$VAULT_PATH" ]]; then
    echo "Error: Directory not found: $VAULT_PATH"
    exit 1
fi

if [[ ! -d "$VAULT_PATH/.obsidian" ]]; then
    echo "Error: Not a valid Obsidian vault (no .obsidian folder found)"
    exit 1
fi

# Create plugins directory if needed
PLUGINS_DIR="$VAULT_PATH/.obsidian/plugins"
PLUGIN_DIR="$PLUGINS_DIR/$PLUGIN_NAME"

mkdir -p "$PLUGIN_DIR"

# Copy plugin files
echo "Installing to: $PLUGIN_DIR"
for file in "${REQUIRED_FILES[@]}"; do
    cp "$SCRIPT_DIR/$file" "$PLUGIN_DIR/"
    echo "  Copied $file"
done

# Make ocr-cli executable
chmod +x "$PLUGIN_DIR/ocr-cli"

echo ""
echo "Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Open Obsidian"
echo "  2. Go to Settings → Community plugins"
echo "  3. Enable 'OCR for macOS'"
