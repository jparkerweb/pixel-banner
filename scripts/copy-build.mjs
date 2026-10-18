import fs from 'fs';
import path from 'path';

const targetDir = '.vault/pixel-banner-example/.obsidian/plugins/pexels-banner';
const filesToCopy = ['styles.css', 'main.js', 'manifest.json'];

// Ensure target directory exists
fs.mkdirSync(targetDir, { recursive: true });

// Copy each file
filesToCopy.forEach(file => {
    fs.copyFileSync(file, path.join(targetDir, file));
    console.log(`Copied ${file} to ${targetDir}`);
});
