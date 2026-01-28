import {
  Notice,
  Platform,
  Plugin,
  TFile,
  TFolder,
  normalizePath,
} from "obsidian";
import { OCRService } from "./ocr-service";
import { FileWatcher } from "./file-watcher";
import { OCRSettings, DEFAULT_SETTINGS, OCRSettingTab } from "./settings";

export default class OCRPlugin extends Plugin {
  settings: OCRSettings = DEFAULT_SETTINGS;
  private ocrService!: OCRService;
  private fileWatcher!: FileWatcher;
  private processedFiles: Set<string> = new Set();

  async onload(): Promise<void> {
    // Check if running on macOS
    if (!Platform.isMacOS) {
      new Notice(
        "OCR for macOS requires macOS. This plugin will not work on Windows or Linux.",
        10000
      );
      console.error("OCR Plugin: This plugin only works on macOS");
      return;
    }

    await this.loadSettings();

    // Initialize OCR service with plugin directory
    const pluginDir = this.manifest.dir;
    if (!pluginDir) {
      console.error("OCR Plugin: Could not determine plugin directory");
      return;
    }

    const basePath = (this.app.vault.adapter as any).basePath;
    const fullPluginDir = `${basePath}/${pluginDir}`;
    
    this.ocrService = new OCRService(fullPluginDir);
    
    // Initialize file watcher
    this.fileWatcher = new FileWatcher(
      this.app.vault,
      this.settings.excludedFolders,
      (file) => this.handleNewImage(file)
    );

    // Register event handlers for automatic processing
    if (this.settings.autoProcess) {
      this.registerEvent(
        this.app.vault.on("create", (file) => {
          if (file instanceof TFile) {
            this.fileWatcher.handleCreate(file);
          }
        })
      );

      this.registerEvent(
        this.app.vault.on("modify", (file) => {
          if (file instanceof TFile) {
            this.fileWatcher.handleModify(file);
          }
        })
      );
    }

    // Always handle renames and deletes to keep index in sync
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (file instanceof TFile && this.fileWatcher.isImage(file)) {
          this.handleImageRename(file, oldPath);
        }
      })
    );

    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (file instanceof TFile) {
          this.handleImageDelete(file);
        }
      })
    );

    // Add command to manually process current file
    this.addCommand({
      id: "ocr-current-file",
      name: "Run OCR on current file",
      checkCallback: (checking: boolean) => {
        const file = this.app.workspace.getActiveFile();
        if (file && this.fileWatcher.isImage(file)) {
          if (!checking) {
            this.processImage(file);
          }
          return true;
        }
        return false;
      },
    });

    // Add command to process all images
    this.addCommand({
      id: "ocr-all-images",
      name: "Run OCR on all images in vault",
      callback: () => this.processAllImages(),
    });

    // Add settings tab
    this.addSettingTab(new OCRSettingTab(this.app, this));

    // Load list of already processed files
    await this.loadProcessedFiles();

    console.log("OCR Plugin loaded");
  }

  onunload(): void {
    console.log("OCR Plugin unloaded");
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    // Update file watcher with new excluded folders
    if (this.fileWatcher) {
      this.fileWatcher.setExcludedFolders(this.settings.excludedFolders);
    }
  }

  /**
   * Handle a newly added image
   */
  private async handleNewImage(file: TFile): Promise<void> {
    // Debounce: wait a bit for the file to be fully written
    await sleep(500);
    await this.processImage(file);
  }

  /**
   * Process a single image with OCR
   */
  async processImage(file: TFile): Promise<void> {
    const cacheFilePath = this.getCacheFilePath(file);
    
    // Skip if already processed and cache exists
    if (this.processedFiles.has(file.path)) {
      const cacheExists = await this.app.vault.adapter.exists(cacheFilePath);
      if (cacheExists) {
        return;
      }
    }

    try {
      // Get the full filesystem path
      const basePath = (this.app.vault.adapter as any).basePath;
      const fullPath = `${basePath}/${file.path}`;

      // Run OCR
      const text = await this.ocrService.extractText(fullPath);

      if (text.trim().length === 0) {
        console.log(`OCR: No text found in ${file.path}`);
        return;
      }

      // Save to cache file
      await this.saveCacheFile(file, text);
      
      // Mark as processed
      this.processedFiles.add(file.path);
      await this.saveProcessedFiles();

      if (this.settings.showNotices) {
        new Notice(`OCR complete: ${file.name}`);
      }

      console.log(`OCR: Processed ${file.path}`);
    } catch (error) {
      console.error(`OCR failed for ${file.path}:`, error);
      if (this.settings.showNotices) {
        new Notice(`OCR failed: ${file.name}`);
      }
    }
  }

  /**
   * Process all images in the vault
   */
  async processAllImages(): Promise<void> {
    const images = this.fileWatcher.getAllImages();
    
    if (images.length === 0) {
      new Notice("No images found in vault");
      return;
    }

    new Notice(`Processing ${images.length} images...`);
    
    let processed = 0;
    let failed = 0;

    for (const image of images) {
      try {
        await this.processImage(image);
        processed++;
      } catch {
        failed++;
      }
    }

    new Notice(`OCR complete: ${processed} processed, ${failed} failed`);
  }

  /**
   * Clear all cached OCR files
   */
  async clearCache(): Promise<void> {
    const cacheFolder = normalizePath(this.settings.cacheFolder);
    
    if (await this.app.vault.adapter.exists(cacheFolder)) {
      const folder = this.app.vault.getAbstractFileByPath(cacheFolder);
      if (folder instanceof TFolder) {
        await this.app.vault.delete(folder, true);
      }
    }
    
    this.processedFiles.clear();
    await this.saveProcessedFiles();
    
    new Notice("OCR cache cleared");
  }

  /**
   * Handle image file rename - update the corresponding index file
   */
  private async handleImageRename(file: TFile, oldPath: string): Promise<void> {
    const cacheFolder = normalizePath(this.settings.cacheFolder);
    const oldSafeName = oldPath.replace(/\//g, "_").replace(/\s+/g, "_");
    const oldCacheFilePath = normalizePath(`${cacheFolder}/${oldSafeName}.md`);
    
    // Check if old cache file exists
    if (!(await this.app.vault.adapter.exists(oldCacheFilePath))) {
      return;
    }

    const oldCacheFile = this.app.vault.getAbstractFileByPath(oldCacheFilePath);
    if (!(oldCacheFile instanceof TFile)) {
      return;
    }

    // Read the old cache file content
    const content = await this.app.vault.read(oldCacheFile);
    
    // Update the source path in frontmatter
    const updatedContent = content.replace(
      /^(source:\s*")([^"]+)(")/m,
      `$1${file.path}$3`
    );

    // Get the new cache file path
    const newCacheFilePath = this.getCacheFilePath(file);

    // Create new cache file with updated content
    await this.app.vault.create(newCacheFilePath, updatedContent);
    
    // Delete old cache file
    await this.app.vault.delete(oldCacheFile);

    // Update processed files set
    this.processedFiles.delete(oldPath);
    this.processedFiles.add(file.path);
    await this.saveProcessedFiles();

    console.log(`OCR: Renamed index ${oldPath} -> ${file.path}`);
  }

  /**
   * Handle image file deletion - remove the corresponding index file
   */
  private async handleImageDelete(file: TFile): Promise<void> {
    const cacheFolder = normalizePath(this.settings.cacheFolder);
    const safeName = file.path.replace(/\//g, "_").replace(/\s+/g, "_");
    const cacheFilePath = normalizePath(`${cacheFolder}/${safeName}.md`);

    // Check if cache file exists
    if (!(await this.app.vault.adapter.exists(cacheFilePath))) {
      return;
    }

    const cacheFile = this.app.vault.getAbstractFileByPath(cacheFilePath);
    if (cacheFile instanceof TFile) {
      await this.app.vault.delete(cacheFile);
      console.log(`OCR: Deleted index for ${file.path}`);
    }

    // Remove from processed files
    this.processedFiles.delete(file.path);
    await this.saveProcessedFiles();
  }

  /**
   * Get the cache file path for an image
   */
  private getCacheFilePath(file: TFile): string {
    const cacheFolder = normalizePath(this.settings.cacheFolder);
    // Use the image path as the cache filename to maintain uniqueness
    const safeName = file.path.replace(/\//g, "_").replace(/\s+/g, "_");
    return normalizePath(`${cacheFolder}/${safeName}.md`);
  }

  /**
   * Save OCR text to a cache file
   */
  private async saveCacheFile(file: TFile, text: string): Promise<void> {
    const cacheFilePath = this.getCacheFilePath(file);
    const cacheFolder = normalizePath(this.settings.cacheFolder);

    // Ensure cache folder exists
    if (!(await this.app.vault.adapter.exists(cacheFolder))) {
      await this.app.vault.createFolder(cacheFolder);
    }

    const content = `---
source: "${file.path}"
processed: ${new Date().toISOString()}
---

${text}
`;

    // Create or update the cache file
    if (await this.app.vault.adapter.exists(cacheFilePath)) {
      const existingFile = this.app.vault.getAbstractFileByPath(cacheFilePath);
      if (existingFile instanceof TFile) {
        await this.app.vault.modify(existingFile, content);
      }
    } else {
      await this.app.vault.create(cacheFilePath, content);
    }
  }

  /**
   * Load the list of processed files from storage
   */
  private async loadProcessedFiles(): Promise<void> {
    const data = await this.loadData();
    if (data?.processedFiles) {
      this.processedFiles = new Set(data.processedFiles);
    }
  }

  /**
   * Save the list of processed files to storage
   */
  private async saveProcessedFiles(): Promise<void> {
    const data = await this.loadData() || {};
    data.processedFiles = Array.from(this.processedFiles);
    await this.saveData({ ...this.settings, ...data });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
