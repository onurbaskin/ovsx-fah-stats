# Folding@Home Stats

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![VS Code Version](https://img.shields.io/badge/VS%20Code-1.99.0+-blue.svg)](https://code.visualstudio.com/)

A VS Code extension that displays your [Folding@Home](https://foldingathome.org/) statistics directly in the status bar. Track your contributions to scientific research while you code!

## Features

- Real-time statistics in the status bar (score, rank, work units)
- Team tracking (auto-selects largest contribution or specify preferred team)
- Auto-refresh (configurable, default: 5 minutes)
- Interactive welcome page for setup
- Detailed tooltips on hover (markdown or plain text)
- Manual refresh via command palette or status bar click
- Copy stats to clipboard, open profile, and pause updates commands
- Status bar template customization
- Cached stats shown during transient errors with a stale indicator

## Why This Extension

Folding@Home had a big moment when the community rallied around COVID-19 research, and I was folding while coding. I spend most of my time in VS Code, so I wanted a tiny, no‑nonsense way to glance at my stats without opening a browser. Out of boredom (and curiosity), I built this extension to keep the numbers in my peripheral vision. It’s simple, does exactly what it says, and stays out of the way—plus the bundled extension code is under ~14kb.

## Screenshots

![Status Bar](https://raw.githubusercontent.com/onurbaskin/ovsx-fah-stats/main/media/screenshots/status_bar_v0_1_13.png)

## Installation

1. Open Extensions view (`Cmd+Shift+X` / `Ctrl+Shift+X`)
2. Search for "Folding@Home Stats"
3. Click Install

## Setup

On first install, a welcome page opens automatically. Enter your Folding@Home user ID to get started. Optional passkeys are stored securely in your system keychain via the welcome page. You can find your user ID on the Folding@Home stats site by searching for your donor name.

### Manual Setup

Add to your `settings.json`:

```json
{
  "fahStats.userId": "123456789",             // Required: Your Folding@Home user ID
  "fahStats.teamName": "team-name",           // Optional: Preferred team (auto-selects if omitted)
  "fahStats.refreshInterval": 300,            // Optional: Refresh interval in seconds (default: 300)
  "fahStats.paused": false,                   // Optional: Pause automatic updates (global)
  "fahStats.showLastWork": true,              // Optional: Show last recorded work time
  "fahStats.showTeamInfo": true,              // Optional: Show team stats in tooltip/status bar (disable to hide team info)
  "fahStats.compactStatusBar": false,         // Optional: Shorter status bar text
  "fahStats.statusBarTemplate": "",           // Optional: Template with {user}, {rank}, {score}, {team}, {teamRank}, {teamScore}, {lastWork}, {updatedAt}
  "fahStats.tooltipFormat": "markdown"        // Optional: Tooltip format ("markdown" or "plain")
}
```

## Usage

Statistics appear automatically in the status bar. Hover for tooltips. Click the status bar item or use Command Palette (`Cmd+Shift+P`) to refresh. If the API is temporarily unavailable, the last successful snapshot is shown as stale until the next refresh.

Available commands:
- `Folding@Home Stats: Refresh Folding@Home Stats`
- `Folding@Home Stats: Copy Folding@Home Stats to Clipboard`
- `Folding@Home Stats: Open Folding@Home Profile`
- `Folding@Home Stats: Toggle Pause Updates`

## Development

### Prerequisites

- VS Code 1.99.0+
- Bun

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
