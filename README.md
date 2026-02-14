# Edge Recent Tab Extension

A fast and lightweight browser extension that helps you quickly access and switch between your recently used tabs in Microsoft Edge browser.

## Features

- **Quick Tab Switching**: Press `Alt+Q` to open the recent tabs popup and cycle through your recently accessed tabs
- **Visual Cycling Interface**: Hold `Alt` and press `Q` repeatedly to cycle, stop for 0.8 seconds to auto-activate
- **Configurable History Size**: Customize how many recent tabs to remember (10, 20, 30, or 50)
- **Cross-Window Support**: Switch to tabs in any Edge window
- **Auto Cleanup**: Automatically removes closed tabs from history
- **Lightweight**: Minimal resource usage, fast performance

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+Q` | Open/cycle through recent tabs popup |
| `Ctrl+Shift+←` | Switch to previous tab in history |
| `Esc` | Close popup |
| `Enter` | Activate selected tab |

## Permissions

The extension requires the following permissions:

- **tabs**: Read and access tab information
- **storage**: Store your recent tabs history and settings
- **scripting**: Inject the floating popup UI into web pages

All data is stored locally on your device and is never transmitted to any external server.

## Installation

1. Download this extension
2. Open Microsoft Edge browser
3. Navigate to `edge://extensions`
4. Enable "Developer mode"
5. Click "Load unpacked"
6. Select the extension folder

## Development

Built with pure JavaScript (no frameworks required) for maximum compatibility and performance.

## License

MIT License

## Changelog

### Version 1.0.0
- Initial release
- Basic tab history tracking
- Floating popup with Alt+Q cycling
- Configurable history size
- Cross-window tab switching
