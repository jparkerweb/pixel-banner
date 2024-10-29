import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import fs from "fs";
import { marked } from 'marked';

const banner =
`/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/
`;

const prod = process.argv[2] === "production";

// Read and convert UPDATE.md content
const updateContent = fs.readFileSync('UPDATE.md', 'utf8');
const htmlContent = marked(updateContent, {
    gfm: true,
    breaks: true,
    mangle: false,
    headerIds: false
});

// Create a virtual module for the release notes
const virtualModule = {
    name: 'release-notes',
    setup(build) {
        build.onResolve({ filter: /^virtual:release-notes$/ }, args => ({
            path: args.path,
            namespace: 'virtual-module',
        }));

        build.onLoad({ filter: /^virtual:release-notes$/, namespace: 'virtual-module' }, () => ({
            contents: `export const releaseNotes = ${JSON.stringify(htmlContent)};`,
            loader: 'js',
        }));
    },
};

const context = await esbuild.context({
    banner: {
        js: banner,
    },
    entryPoints: ["src/main.js"],
    bundle: true,
    external: [
        "obsidian",
        "electron",
        "@codemirror/autocomplete",
        "@codemirror/collab",
        "@codemirror/commands",
        "@codemirror/language",
        "@codemirror/lint",
        "@codemirror/search",
        "@codemirror/state",
        "@codemirror/view",
        "@lezer/common",
        "@lezer/highlight",
        "@lezer/lr",
        ...builtins],
    format: "cjs",
    target: "es2018",
    logLevel: "info",
    sourcemap: prod ? false : "inline",
    treeShaking: true,
    outfile: "main.js",
    plugins: [virtualModule],
});

if (prod) {
    await context.rebuild();
    process.exit(0);
} else {
    await context.watch();
}