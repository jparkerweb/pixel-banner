import { Modal, Setting } from 'obsidian';


// -------------------------
// -- Release Notes Modal --
// -------------------------
export class ReleaseNotesModal extends Modal {
    constructor(app, version, releaseNotes) {
        super(app);
        this.version = version;
        this.releaseNotes = releaseNotes;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        // Add custom class to the modal element
        this.modalEl.addClass('pixel-banner-release-notes-modal');
        
        // Add CSS styles to document head
        this.addStyles();

        // Header
        contentEl.createEl('h2', { text: `Welcome to 🚩 Pixel Banner v${this.version}` });

        // Message
        contentEl.createEl('p', { 
            text: 'After each update you\'ll be prompted with the release notes. You can disable this in the plugin settings General tab.',
            cls: 'release-notes-instructions'
        });

        const promotionalLinks = contentEl.createEl('div', { cls: 'promotional-links' });

        const equilllabsLink = promotionalLinks.createEl('a', {
            href: 'https://www.equilllabs.com',
            target: 'equilllabs',
        });
        equilllabsLink.createEl('img', {
            attr: {
                height: '36',
                src: 'https://raw.githubusercontent.com/jparkerweb/pixel-banner/refs/heads/main/img/equilllabs.png?raw=true',
                alt: 'eQuill Labs'
            }
        });
        const discordLink = promotionalLinks.createEl('a', {
            href: 'https://discord.gg/sp8AQQhMJ7',
            target: 'discord',
        });
        discordLink.createEl('img', {
            attr: {
                height: '36',
                src: 'https://raw.githubusercontent.com/jparkerweb/pixel-banner/refs/heads/main/img/discord.png?raw=true',
                alt: 'Discord'
            }
        });
        const kofiLink = promotionalLinks.createEl('a', {
            href: 'https://ko-fi.com/Z8Z212UMBI',
            target: 'kofi',
        });
        kofiLink.createEl('img', {
            attr: {
                height: '36',
                src: 'https://raw.githubusercontent.com/jparkerweb/pixel-banner/refs/heads/main/img/support.png?raw=true',
                alt: 'Buy Me a Coffee at ko-fi.com'
            }
        });

        // Release notes content
        const notesContainer = contentEl.createDiv('release-notes-container');
        notesContainer.innerHTML = this.releaseNotes;

        // Add some spacing
        contentEl.createEl('div', { cls: 'release-notes-spacer' });

        // Close button
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Close')
                .onClick(() => this.close()));

        // Set initial position of the modal
        const modalEl = this.modalEl;
        modalEl.style.position = 'absolute';
        modalEl.style.left = `${modalEl.getBoundingClientRect().left}px`;
        modalEl.style.top = `${modalEl.getBoundingClientRect().top}px`;
    }
    
    addStyles() {
        // Create a style element
        const styleEl = document.createElement('style');
        styleEl.id = 'pixel-banner-release-notes-styles';

        // Remove any existing styles with this ID
        const existingStyle = document.getElementById(styleEl.id);
        if (existingStyle) {
            existingStyle.remove();
        }

        // Define the CSS
        styleEl.textContent = `
            .pixel-banner-release-notes-modal {
                max-width: 600px;
                width: 100%;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%);
            }
            
            .promotional-links {
                display: flex;
                flex-direction: row;
                justify-content: space-around;
                margin: 15px 0;
            }
            
            .promotional-links img {
                border: 0;
                height: 36px;
                transition: transform 0.2s ease;
            }
            
            .promotional-links a:hover img {
                transform: scale(1.1);
            }
            
            .release-notes-instructions {
                font-size: 0.75em;
                font-weight: 300;
                letter-spacing: 2px;
                text-align: center;
                margin: 10px 0;
            }

            .release-notes-container {
                max-height: 400px;
                overflow-y: auto;
                padding: 10px;
                margin: 10px 0;
                border-radius: 5px;
                background-color: var(--background-secondary);
            }

            .release-notes-container img {
                max-width: 100%;
            }

            .release-notes-section {
                margin: 10px 0;
            }

            .release-notes-section h4 {
                margin: 15px 0 5px 0;
                color: var(--text-accent-hover);
            }

            .release-notes-container > ul {
                padding-left: 25px;
            }
            
            .release-notes-container ul:not(:last-of-type) {
                padding-bottom: 20px;
            }

            .release-notes-section ul {
                margin: 0;
                padding-left: 20px;
            }

            .release-notes-container li,
            .release-notes-section li {
                margin: 5px 0;
            }

            .release-notes-spacer {
                margin: 10px 0;
                height: 20px;
            }
        `;

        // Add the style element to the document head
        document.head.appendChild(styleEl);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        
        // Remove the styles when the modal is closed
        const styleEl = document.getElementById('pixel-banner-release-notes-styles');
        if (styleEl) {
            styleEl.remove();
        }
    }
}