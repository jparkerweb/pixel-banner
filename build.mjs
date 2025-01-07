import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

async function copyFiles() {
    const targetDir = '.vault/pixel-banner-example/.obsidian/plugins/pexels-banner';
    const files = ['styles.css', 'main.js', 'manifest.json'];

    // Ensure target directory exists
    await fs.mkdir(targetDir, { recursive: true });

    // Copy each file
    for (const file of files) {
        await fs.copyFile(file, path.join(targetDir, file));
    }
}

// First run esbuild
const esbuild = spawn('node', ['esbuild.config.mjs', 'production'], {
    stdio: 'inherit',
    shell: true
});

esbuild.on('close', async (code) => {
    if (code === 0) {
        try {
            await copyFiles();
            console.log('Build completed successfully!');
        } catch (err) {
            console.error('Error copying files:', err);
            process.exit(1);
        }
    } else {
        console.error('esbuild failed');
        process.exit(code);
    }
});
