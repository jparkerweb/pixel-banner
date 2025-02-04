import { FuzzySuggestModal } from "obsidian";


// ----------------------------
// -- Folder Selection Modal --
// ----------------------------
export class FolderSelectionModal extends FuzzySuggestModal {
    constructor(app, defaultFolder, onChoose) {
        super(app);
        this.defaultFolder = defaultFolder;
        this.onChoose = onChoose;
        
        // Set custom placeholder text
        this.setPlaceholder("Select or type folder path to save Banner Image");
        
        // Set modal title
        this.titleEl.setText("Choose Folder to save Banner Image");
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

        // Set initial position of the modal
        const modalEl = this.modalEl;
        modalEl.style.position = 'absolute';
        modalEl.style.left = `${modalEl.getBoundingClientRect().left}px`;
        modalEl.style.top = `${modalEl.getBoundingClientRect().top}px`;
    }
}