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
        titleDiv.innerHTML = "💾 Choose a <strong>Folder</strong> to save the selected Banner in your vault";
        titleDiv.style.margin = "10px 0";
        titleDiv.style.padding = "20px 20px 0";
        titleDiv.style.color = "var(--text-accent)";
        titleDiv.style.borderTop = "1px dashed var(--modal-border-color)";
        this.modalEl.appendChild(titleDiv);

        const descriptionDiv = document.createElement("p");
        descriptionDiv.innerHTML = "If you set a default value in settings it will be pre-filled above.<br>Select any folder in your vault to continue.";
        descriptionDiv.style.margin = "0 0 20px 0";
        descriptionDiv.style.padding = "0 20px";
        descriptionDiv.style.color = "var(--text-muted)";
        descriptionDiv.style.fontSize = ".9em";
        this.modalEl.appendChild(descriptionDiv);

        // Set custom placeholder text
        this.setPlaceholder("Select or type folder path to save Banner Image");

        // Add custom styles
        this.addStyle();
    }

    addStyle() {
        const style = document.createElement('style');
        style.textContent = `
            .prompt.pixel-banner-folder-select-modal {
                top: unset !important;
                padding: 20px !important;
            }
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
        inputEl.focus();
        // inputEl.select();
        // Trigger the search to show matching results
        this.updateSuggestions();
    }
}