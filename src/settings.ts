import { App, PluginSettingTab, Setting } from "obsidian";
import type OCRPlugin from "./main";

export interface OCRSettings {
  /** Enable automatic OCR when images are added */
  autoProcess: boolean;
  /** Folders to exclude from OCR processing */
  excludedFolders: string[];
  /** Folder to store OCR cache files */
  cacheFolder: string;
  /** Show notice when OCR completes */
  showNotices: boolean;
}

export const DEFAULT_SETTINGS: OCRSettings = {
  autoProcess: true,
  excludedFolders: [],
  cacheFolder: "_ocr-index",
  showNotices: true,
};

export class OCRSettingTab extends PluginSettingTab {
  plugin: OCRPlugin;

  constructor(app: App, plugin: OCRPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "OCR for macOS Settings" });

    new Setting(containerEl)
      .setName("Automatic processing")
      .setDesc("Automatically run OCR when new images are added to your vault")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoProcess)
          .onChange(async (value) => {
            this.plugin.settings.autoProcess = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Show notifications")
      .setDesc("Show a notice when OCR processing completes")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showNotices)
          .onChange(async (value) => {
            this.plugin.settings.showNotices = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Index folder")
      .setDesc("Folder where OCR text files are stored for search indexing (relative to vault root). Avoid folders starting with '.' as they may not be indexed.")
      .addText((text) =>
        text
          .setPlaceholder("_ocr-index")
          .setValue(this.plugin.settings.cacheFolder)
          .onChange(async (value) => {
            this.plugin.settings.cacheFolder = value || "_ocr-index";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Excluded folders")
      .setDesc("Comma-separated list of folders to exclude from OCR processing")
      .addText((text) =>
        text
          .setPlaceholder("templates, archive")
          .setValue(this.plugin.settings.excludedFolders.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.excludedFolders = value
              .split(",")
              .map((f) => f.trim())
              .filter((f) => f.length > 0);
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl("h3", { text: "Manual Actions" });

    new Setting(containerEl)
      .setName("Process all images")
      .setDesc("Run OCR on all images in your vault (may take a while)")
      .addButton((button) =>
        button.setButtonText("Process All").onClick(async () => {
          await this.plugin.processAllImages();
        })
      );

    new Setting(containerEl)
      .setName("Clear OCR cache")
      .setDesc("Delete all cached OCR text files")
      .addButton((button) =>
        button.setButtonText("Clear Cache").onClick(async () => {
          await this.plugin.clearCache();
        })
      );
  }
}
