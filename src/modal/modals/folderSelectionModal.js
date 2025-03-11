import { FuzzySuggestModal } from "obsidian";


// ----------------------------
// -- Folder Selection Modal --
// ----------------------------
export class FolderSelectionModal extends FuzzySuggestModal {
    constructor(app, defaultFolder, onChoose) {
        super(app);
        this.defaultFolder = defaultFolder;
        this.onChoose = onChoose;
        
        // Add class for custom styling
        this.modalEl.addClass('pixel-banner-folder-select-modal');
        
        const titleDiv = document.createElement("p");
        titleDiv.textContent = "💾 Choose a folder to save the Banner Image";
        titleDiv.style.padding = "0 20px";
        titleDiv.style.color = "var(--text-accent)";
        this.modalEl.appendChild(titleDiv);

        // Set custom placeholder text
        this.setPlaceholder("Select or type folder path to save Banner Image");

        // Add custom styles
        this.addStyle();
    }

    addStyle() {
        const style = document.createElement('style');
        style.textContent = `
            .pixel-banner-folder-select-modal .prompt {
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
            }
        `;
        document.head.appendChild(style);
        this.style = style;
    }

    onClose() {
        if (this.style) {
            this.style.remove();
        }
    }

    getItems() {
        // Get all folder paths including the default folder
        const folderPaths = this.app.vault.getAllLoadedFiles()
            .filter(file => file.children)
            .map(folder => folder.path);
        
        // Add default folder if it's not already in the list
        if (!folderPaths.includes(this.defaultFolder)) {
            folderPaths.unshift(this.defaultFolder);
        }
        
        return folderPaths;
    }

    getItemText(item) {
        return item;
    }

    onChooseItem(item) {
        this.onChoose(item);
    }

    onOpen() {
        super.onOpen();
        // Pre-populate the search with the default folder
        const inputEl = this.inputEl;
        inputEl.value = this.defaultFolder;
        inputEl.select();
        // Trigger the search to show matching results
        this.updateSuggestions();
    }
}