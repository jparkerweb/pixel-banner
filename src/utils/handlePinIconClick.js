// -------------
// -- imports --
// -------------
import { FolderSelectionModal } from '../modal/modals/folderSelectionModal';
import { SaveImageModal } from '../modal/modals/saveImageModal';
import { updateNoteFrontmatter } from './frontmatterUtils';


// ----------------------------------------------------------------------------
// -- helper for pinning an image once chosen from UI or loaded from keyword --
// ----------------------------------------------------------------------------
export async function handlePinIconClick(imageUrl, plugin, usedField = null, suggestedFilename = null) {
    const imageBlob = await fetchImage(imageUrl);
    const { file, useAsBanner } = await saveImageLocally(imageBlob, plugin, suggestedFilename);
    const finalPath = await waitForFileRename(file, plugin);

    if (!finalPath) {
        console.error('❌ Failed to resolve valid file path');
        new Notice('Failed to save image - file not found');
        return null;
    }
    
    if (useAsBanner) {
        await updateNoteFrontmatter(finalPath, plugin, usedField);
        hidePinIcon();
    }

    return finalPath;
}

// -----------------
// -- fetch image --
// -----------------
async function fetchImage(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Image download failed');
    return await response.arrayBuffer();
}


// ------------------------
// -- save image locally --
// ------------------------
async function saveImageLocally(arrayBuffer, plugin, suggestedFilename = null) {
    const format = detectImageFormat(arrayBuffer);
    const vault = plugin.app.vault;
    const defaultFolderPath = plugin.settings.pinnedImageFolder;

    // Prompt for folder selection
    const folderPath = await new Promise((resolve) => {
        const modal = new FolderSelectionModal(plugin.app, defaultFolderPath, (result) => {
            resolve(result);
        });
        modal.open();
    });

    if (!folderPath) {
        throw new Error('No folder selected');
    }

    if (!await vault.adapter.exists(folderPath)) {
        await vault.createFolder(folderPath);
    }

    // Prompt for filename
    const suggestedName = suggestedFilename?.toLowerCase() || plugin.settings.pinnedImageFilename;
    const userInput = await new Promise((resolve) => {
        const modal = new SaveImageModal(plugin.app, suggestedName, (name, useAsBanner) => {
            resolve({ name, useAsBanner });
        });
        modal.open();
    });

    if (!userInput) {
        throw new Error('No filename provided');
    }

    let baseName = userInput.name.replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
    if (!baseName) baseName = 'banner';
    if (!baseName.toLowerCase().endsWith(`.${format}`)) baseName += `.${format}`;

    let fileName = baseName;
    let counter = 1;
    while (await vault.adapter.exists(`${folderPath}/${fileName}`)) {
        const nameWithoutExt = baseName.slice(0, -4);
        fileName = `${nameWithoutExt}-${counter}.${format}`;
        counter++;
    }

    const filePath = `${folderPath}/${fileName}`;
    const savedFile = await vault.createBinary(filePath, arrayBuffer);

    return {
        initialPath: filePath,
        file: savedFile,
        useAsBanner: userInput.useAsBanner
    };
}

// Add this helper function
function detectImageFormat(arrayBuffer) {
    const uint8arr = new Uint8Array(arrayBuffer);
    const signatures = {
        jpeg: [0xFF, 0xD8, 0xFF],
        png: [0x89, 0x50, 0x4E, 0x47],
        gif: [0x47, 0x49, 0x46, 0x38],
        webp: [0x52, 0x49, 0x46, 0x46]
    };

    for (const [format, signature] of Object.entries(signatures)) {
        if (signature.every((byte, i) => uint8arr[i] === byte)) {
            return format === 'jpeg' ? 'jpg' : format;
        }
    }
    
    return 'jpg'; // Default fallback
}

// -------------------
// -- hide pin icon --
// -------------------
function hidePinIcon() {
    const pinIcon = document.querySelector('.pin-icon');
    if (pinIcon) pinIcon.style.display = 'none';
}


// ------------------------------------
// -- wait for potential file rename --
// ------------------------------------
async function waitForFileRename(file, plugin) {
    return new Promise((resolve) => {
        const initialPath = file.path;
        let timeoutId;
        let renamedPath = null;

        const validatePath = async (path) => {
            if (!path) return false;
            return await plugin.app.vault.adapter.exists(path);
        };

        const handleRename = async (theFile) => {
            if (theFile?.path) {
                renamedPath = theFile?.path;
            }
        };

        const cleanup = () => {
            plugin.app.vault.off('rename', handleRename);
        };

        plugin.app.vault.on('rename', handleRename);

        timeoutId = setTimeout(async () => {
            cleanup();

            if (renamedPath) {
                const exists = await validatePath(renamedPath);
                if (exists) {
                    return resolve(renamedPath);
                }
            }

            const initialExists = await validatePath(initialPath);
            if (initialExists) {
                return resolve(initialPath);
            }
            resolve(null);
        }, 100);
    });
}