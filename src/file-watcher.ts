import { TFile, Vault } from "obsidian";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tiff", ".tif"];

export class FileWatcher {
  private vault: Vault;
  private excludedFolders: string[];
  private onImageAdded: (file: TFile) => void;

  constructor(
    vault: Vault,
    excludedFolders: string[],
    onImageAdded: (file: TFile) => void
  ) {
    this.vault = vault;
    this.excludedFolders = excludedFolders;
    this.onImageAdded = onImageAdded;
  }

  /**
   * Update the list of excluded folders
   */
  setExcludedFolders(folders: string[]): void {
    this.excludedFolders = folders;
  }

  /**
   * Check if a file is an image based on extension
   */
  isImage(file: TFile): boolean {
    const ext = file.extension ? `.${file.extension.toLowerCase()}` : "";
    return IMAGE_EXTENSIONS.includes(ext);
  }

  /**
   * Check if a file is in an excluded folder
   */
  isExcluded(file: TFile): boolean {
    const filePath = file.path.toLowerCase();
    return this.excludedFolders.some((folder) => {
      const normalizedFolder = folder.toLowerCase();
      return (
        filePath.startsWith(normalizedFolder + "/") ||
        filePath === normalizedFolder
      );
    });
  }

  /**
   * Handle a file creation event
   */
  handleCreate(file: TFile): void {
    if (this.isImage(file) && !this.isExcluded(file)) {
      this.onImageAdded(file);
    }
  }

  /**
   * Handle a file modification event
   */
  handleModify(file: TFile): void {
    if (this.isImage(file) && !this.isExcluded(file)) {
      this.onImageAdded(file);
    }
  }

  /**
   * Get all images in the vault
   */
  getAllImages(): TFile[] {
    return this.vault.getFiles().filter((file) => {
      return this.isImage(file) && !this.isExcluded(file);
    });
  }
}
