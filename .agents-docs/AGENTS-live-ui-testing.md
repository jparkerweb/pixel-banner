# Live UI Testing
> Part of [AGENTS.md](../AGENTS.md): project guidance for AI coding agents.

Agents can drive a running Obsidian instance to verify changes visually instead of relying only on mocked tests. This uses the official Obsidian CLI (installer 1.12.4+, enabled in Settings > General > Command line interface). Obsidian must be running.

- **Binary**: `obsidian` on PATH, or on Windows `%LOCALAPPDATA%\Programs\Obsidian\Obsidian.com`
- **Plugin id**: `pexels-banner` (not `pixel-banner`)
- **Always pass `vault=pixel-banner-example`** so commands never touch a personal vault that may also be open
- If Obsidian is not running, open the test vault with the URI `obsidian://open?vault=pixel-banner-example`

## Build, reload, verify loop

```bash
npm run test-build
obsidian vault=pixel-banner-example plugin:reload id=pexels-banner
obsidian vault=pixel-banner-example dev:errors
obsidian vault=pixel-banner-example open path="Styling/All Styling Combined.md"
obsidian vault=pixel-banner-example dev:dom selector=".pixel-banner-image" css=height
obsidian vault=pixel-banner-example dev:screenshot path=/path/to/scratch/shot.png
obsidian vault=pixel-banner-example dev:console level=error
```

Write screenshots to a temp/scratch directory, never into the repo or the vault.

## Useful commands

| Command | Purpose |
|---------|---------|
| `commands filter=pexels-banner` | List plugin commands (e.g. `pexels-banner:open-pixel-banner-select`) |
| `command id=<command-id>` | Run a command, e.g. open a plugin modal |
| `eval code="<js>"` | Run JS in the app (`app.plugins.plugins['pexels-banner']`, `app.workspace.getActiveFile()`, etc.) |
| `dev:dom selector=<css> [total\|text\|attr=<name>\|css=<prop>]` | Inspect rendered DOM |
| `dev:css selector=<css> prop=<name>` | Inspect CSS with source locations |
| `dev:screenshot path=<file>` | Capture the window as PNG |
| `dev:errors` / `dev:console level=error` | Read captured errors and console output |
| `dev:mobile on\|off` | Toggle mobile emulation |
| `dev:cdp method=<CDP.method> params=<json>` | Raw Chrome DevTools Protocol call |

Run `obsidian help` for the full list.

## Real mouse clicks

Use CDP input events for genuine user interaction (hover, click, drag) rather than calling `.click()` in `eval`:

```bash
# 1. Get the element center in CSS pixels
obsidian vault=pixel-banner-example eval code="(()=>{const r=document.querySelector('.modal-header-button').getBoundingClientRect();return Math.round(r.x+r.width/2)+','+Math.round(r.y+r.height/2)})()"
# 2. Send mouseMoved, mousePressed, mouseReleased at those coordinates
obsidian vault=pixel-banner-example dev:cdp method=Input.dispatchMouseEvent params='{"type":"mousePressed","x":1109,"y":254,"button":"left","clickCount":1}'
```

Gotchas:
- CDP coordinates are CSS pixels. Screenshots are in device pixels, so do not take coordinates from a screenshot on a scaled display. Always use `getBoundingClientRect()`.
- In Obsidian 1.14+ the modal close button is `.modal-header-button`, not `.modal-close-button`.
