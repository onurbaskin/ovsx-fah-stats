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

<img width="458" height="69" alt="Image" src="https://github.com/user-attachments/assets/28671f9d-b3ad-4b3d-a1cb-717a316db95c" />

## Installation

1. Open Extensions view (`Cmd+Shift+X` / `Ctrl+Shift+X`)
2. Search for "Folding@Home Stats"
3. Click Install

## Setup

On first install, a welcome page opens automatically. Enter your Folding@Home user ID to get started.

### Manual Setup

Add to your `settings.json`:

```json
{
  "fahStats.userName": "123456789",           // Required: Your Folding@Home user ID
  "fahStats.teamName": "team-name",           // Optional: Preferred team (auto-selects if omitted)
  "fahStats.passkey": "your-passkey-here",   // Optional: Your passkey
  "fahStats.refreshInterval": 300             // Optional: Refresh interval in seconds (default: 300)
}
```

## Usage

Statistics appear automatically in the status bar. Hover for tooltips. Click the status bar item or use Command Palette (`Cmd+Shift+P`) to refresh.

## Development

### Prerequisites

- VS Code 1.99.0+
- Bun (or Node.js 18+ with npm)

### Setup

```bash
git clone https://github.com/onurbaskin/ovsx-fah-stats.git
cd ovsx-fah-stats
bun install
bun run compile
```

Press `F5` in VS Code to launch Extension Development Host.

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

**[Folding@Home](https://foldingathome.org/)** - For their work in distributed computing for scientific research. This extension uses the [Folding@Home API](https://api2.foldingathome.org/) to fetch statistics.

---

**Note**: This extension is not affiliated with or endorsed by Folding@Home. It is an independent project that uses the public Folding@Home API to display statistics.
