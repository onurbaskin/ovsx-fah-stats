# Folding@Home Stats

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![VS Code Version](https://img.shields.io/badge/VS%20Code-1.106.0+-blue.svg)](https://code.visualstudio.com/)

A VS Code extension that displays your [Folding@Home](https://foldingathome.org/) statistics directly in the status bar. Track your contributions to scientific research while you code!

## Features

- Real-time statistics in the status bar (score, rank, work units)
- Team tracking (auto-selects largest contribution or specify preferred team)
- Auto-refresh (configurable, default: 5 minutes)
- Interactive welcome page for setup
- Detailed tooltips on hover
- Manual refresh via command palette or status bar click

## Screenshots

<img width="476" height="124" alt="Image" src="https://github.com/user-attachments/assets/1fe1a566-b10a-45ea-9343-33f308ad7cc8" />

## Installation

1. Open VS Code Extensions view (`Cmd+Shift+X` / `Ctrl+Shift+X`)
2. Search for "Folding@Home Stats"
3. Click Install

Or install from the [Open VSX Registry](https://open-vsx.org/extension/your-publisher-name/folding-at-home-stats)

## Configuration

On first install, a welcome page opens automatically. Enter your Folding@Home user ID to get started.

### Manual Configuration

Add to your `settings.json`:

```json
{
  "fahStats.userName": "757802389",           // Required: Your Folding@Home user ID
  "fahStats.teamName": "team-name",           // Optional: Preferred team (auto-selects if omitted)
  "fahStats.passkey": "your-passkey-here",   // Optional: Your passkey
  "fahStats.refreshInterval": 300             // Optional: Refresh interval in seconds (default: 300)
}
```

## Usage

Statistics appear automatically in the status bar. Hover for detailed tooltips. Refresh by clicking the status bar item or using the Command Palette (`Cmd+Shift+P`):

- **Folding@Home Stats: Refresh Folding@Home Stats**
- **Folding@Home Stats: Open Welcome Page**
- **Folding@Home Stats: Reset Configuration**

## Development

### Prerequisites

- VS Code 1.106.0+
- Bun (or Node.js 18+ with npm)

### Setup

```bash
git clone https://github.com/yourusername/ovsx-fah-stats.git
cd ovsx-fah-stats
bun install
bun run compile
code .
```

Press `F5` to launch Extension Development Host.

### Scripts

```bash
bun run compile  # Compile TypeScript
bun run watch    # Watch mode
bun run lint     # Lint code
bun run publish  # Publish to Open VSX
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit and push (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Follow existing code style, add comments for complex logic, and test thoroughly.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- **[Folding@Home](https://foldingathome.org/)** - For their incredible work in distributed computing for scientific research. This extension uses the [Folding@Home API](https://api2.foldingathome.org/) to fetch statistics.
- Built with [VS Code Extension API](https://code.visualstudio.com/api)
- Powered by [TypeScript](https://www.typescriptlang.org/) and [Axios](https://axios-http.com/)

---

**Note**: This extension is not affiliated with or endorsed by Folding@Home. It is an independent project that uses the public Folding@Home API to display statistics.
