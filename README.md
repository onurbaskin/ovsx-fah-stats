# Folding@Home Stats

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![VS Code Version](https://img.shields.io/badge/VS%20Code-1.74.0+-blue.svg)](https://code.visualstudio.com/)

A VS Code extension that displays your [Folding@Home](https://foldingathome.org/) statistics directly in the status bar. Track your contributions to scientific research while you code!

## Table of Contents

- [Features](#-features)
- [Screenshots](#-screenshots)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)
- [Acknowledgments](#-acknowledgments)

## Features

- **Real-time Statistics**: Display your Folding@Home score, rank, and work units in the VS Code status bar
- **Team Tracking**: Automatically tracks your team with the largest contribution, or specify a preferred team
- **Auto-refresh**: Configurable refresh interval (default: 5 minutes)
- **Interactive Welcome Page**: Beautiful, modern welcome page for easy initial setup
- **Detailed Tooltips**: Hover over the status bar item to see comprehensive statistics
- **Manual Refresh**: Refresh stats on-demand via command palette or by clicking the status bar item
- **Multiple Team Support**: View statistics for all teams you're a member of
- **Native VS Code Styling**: Seamlessly integrates with your VS Code theme

## Screenshots

![status bar displaying the fah stats](https://github.com/onurbaskin/ovsx-fah-stats/media/screenshots/status_bar.png)

## Installation

### From Open VSX

1. Open VS Code
2. Go to Extensions view (`Cmd+Shift+X` / `Ctrl+Shift+X`)
3. Search for "Folding@Home Stats"
4. Click Install

Or install directly from the [Open VSX Registry](https://open-vsx.org/extension/your-publisher-name/folding-at-home-stats)

### Manual Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/ovsx-fah-stats.git
   cd ovsx-fah-stats
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Compile the extension:
   ```bash
   bun run compile
   ```

4. Package the extension:
   ```bash
   bun run package
   ```

5. Install the `.vsix` file:
   - Open VS Code
   - Go to Extensions view
   - Click the `...` menu
   - Select "Install from VSIX..."
   - Choose the generated `.vsix` file

## ⚙️ Configuration

### Quick Setup

When you first install the extension, a welcome page will automatically open. Simply enter your Folding@Home user ID to get started!

### Manual Configuration

1. Open VS Code Settings (`Cmd+,` / `Ctrl+,`)
2. Search for "Folding@Home Stats"
3. Configure the following settings:

#### Required Settings

- **`fahStats.userName`** (required): Your Folding@Home numeric user ID (e.g., `757802389`)

#### Optional Settings

- **`fahStats.teamName`**: Preferred team name to track (if you're a member of multiple teams). If not specified, the team with your largest contribution will be selected automatically.
- **`fahStats.passkey`**: Your Folding@Home passkey (will be partially masked in the status bar for security)
- **`fahStats.refreshInterval`**: Refresh interval in seconds (default: `300` = 5 minutes, minimum: `10` seconds)

### Example Configuration

Add this to your `settings.json`:

```json
{
  "fahStats.userName": "757802389",
  "fahStats.teamName": "team-name",
  "fahStats.passkey": "your-passkey-here",
  "fahStats.refreshInterval": 300
}
```

## 📖 Usage

### Status Bar

Once configured, the extension automatically displays your statistics in the VS Code status bar:

```
$(pulse) FAH: 17.5M pts | Rank: 112K | Team: team-name (17.2M)
```

### Tooltip

Hover over the status bar item to see detailed information:
- User name and ID
- Team information (name, ID, rank)
- Total score and work units
- User rank
- Team contribution and total
- Active status (50 days, 7 days)
- Passkey (partially masked)

### Commands

Access commands via the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

- **Folding@Home Stats: Refresh Folding@Home Stats** - Manually refresh statistics
- **Folding@Home Stats: Open Welcome Page** - Open the configuration welcome page
- **Folding@Home Stats: Reset Configuration** - Clear all configuration and reopen welcome page

### Manual Refresh

You can refresh statistics at any time by:
- Clicking on the status bar item
- Running the "Refresh Folding@Home Stats" command from the command palette

## Development

### Prerequisites

- [VS Code](https://code.visualstudio.com/) 1.74.0 or higher
- [Bun](https://bun.sh/) (or Node.js 18+ with npm)
- TypeScript knowledge

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ovsx-fah-stats.git
   cd ovsx-fah-stats
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Compile TypeScript:
   ```bash
   bun run compile
   ```

4. Open the project in VS Code:
   ```bash
   code .
   ```

5. Press `F5` to launch a new Extension Development Host window

### Available Scripts

```bash
# Compile TypeScript
bun run compile

# Watch mode for development
bun run watch

# Lint code
bun run lint

# Package extension for Open VSX
bun run package

# Publish to Open VSX (requires ovsx CLI)
bun run publish
```

### Project Structure

```
ovsx-fah-stats/
├── src/
│   ├── extension.ts      # Main extension logic
│   └── welcomePage.ts    # Welcome page webview
├── out/                   # Compiled JavaScript
├── package.json          # Extension manifest
├── tsconfig.json         # TypeScript configuration
├── biome.json            # Biome linter/formatter config
└── README.md             # This file
```

### Testing

1. Press `F5` in VS Code to launch the Extension Development Host
2. The extension will be loaded in the new window
3. Configure your Folding@Home user ID in the test window's settings
4. The welcome page will appear automatically if no user ID is configured

### Publishing to Open VSX

1. Install the Open VSX CLI:
   ```bash
   npm install -g @open-vsx/cli
   ```

2. Update `package.json` with your publisher name

3. Package the extension:
   ```bash
   bun run package
   ```

4. Publish to Open VSX:
   ```bash
   ovsx publish
   ```

## Contributing

Contributions are welcome and greatly appreciated! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Commit your changes** (`git commit -m 'Add some amazing feature'`)
5. **Push to the branch** (`git push origin feature/amazing-feature`)
6. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style
- Add comments for complex logic
- Update the README if adding new features
- Test your changes thoroughly
- Ensure all code compiles without errors

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **[Folding@Home](https://foldingathome.org/)** - For their incredible work in distributed computing for scientific research. This extension uses the [Folding@Home API](https://api2.foldingathome.org/) to fetch statistics.
- Built with [VS Code Extension API](https://code.visualstudio.com/api)
- Powered by [TypeScript](https://www.typescriptlang.org/) and [Axios](https://axios-http.com/)

## Links

- [Folding@Home Website](https://foldingathome.org/)
- [Folding@Home API Documentation](https://api2.foldingathome.org/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Open VSX Registry](https://open-vsx.org/)

---

**Note**: This extension is not affiliated with or endorsed by Folding@Home. It is an independent project that uses the public Folding@Home API to display statistics.
