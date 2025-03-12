import { Modal, Notice, Setting } from 'obsidian';

// ----------------------
// -- save image modal --
// ----------------------
export class SaveImageModal extends Modal {
    constructor(app, suggestedName, onSubmit) {
        super(app);
        this.suggestedName = suggestedName;
        this.onSubmit = onSubmit;
        this.useAsBanner = true;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Save Image', cls: 'margin-top-0' });
        contentEl.createEl('p', { text: 'Enter a name for the image file.' });

        const fileNameSetting = new Setting(contentEl)
            .setName('File name')
            .addText(text => {
                text.setValue(this.suggestedName)
                    .onChange(value => {
                        this.suggestedName = value;
                    })
                    .inputEl.style.width = '100%';
            });

        new Setting(contentEl)
            .setName('Use Saved Image as Banner')
            .setDesc('If disabled, the saved image will be saved to your vault, but not applied to the current note.')
            .addToggle(toggle => {
                toggle
                    .setValue(this.useAsBanner)
                    .onChange(value => {
                        this.useAsBanner = value;
                    });
            });

        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.gap = '8px';
        buttonContainer.style.marginTop = '1em';

        const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
        const saveButton = buttonContainer.createEl('button', {
            text: 'Save',
            cls: 'mod-cta'
        });

        cancelButton.addEventListener('click', () => this.close());
        saveButton.addEventListener('click', () => {
            if (this.suggestedName) {
                this.onSubmit(this.suggestedName, this.useAsBanner);
                this.close();
            } else {
                new Notice('Please enter a file name');
            }
        });

        // Set initial position of the modal
        const modalEl = this.modalEl;
        modalEl.style.position = 'absolute';
        modalEl.style.left = `${modalEl.getBoundingClientRect().left}px`;
        modalEl.style.top = `${modalEl.getBoundingClientRect().top}px`;
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}