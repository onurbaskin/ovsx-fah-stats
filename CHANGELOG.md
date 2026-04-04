# Changelog

All notable changes to this project will be documented in this file.

## [2026-04-04]
- chore: updated changelog format
- chore: exluded some dirs
- chore: update readme
- chore: ran biome to format files
- chore: upgraded biome config to 2.4.10
- chore: made biome the sole formatter/linter of the repo
- chore: upgraded dependencies

## [2026-02-03]
- feat: Merge pull request #1 from onurbaskin/feature/2026-02-03-codex-improvements
- chore: updated packages and published the new version
- fix: fahStats settings handling
- refactor: Replace axios and dayjs with native
- perf: Reduce extension size and replace ps
- chore: saving codex changes

## [2025-11-17]
- chore: Update .gitignore and .vscodeignore to include 'packages/' directory; modify package.json script to create 'packages/' before packaging. This ensures proper handling of output files during the packaging process.
- chore: Update version to 0.1.14 in package.json
- docs: Update status bar screenshot in README.md to reflect version 0.1.13, enhancing visual consistency with the latest design.
- chore: Update status bar screenshot to reflect recent design changes, improving visual consistency across the extension.
- chore: Update version to 0.1.13 in package.json
- docs: Update screenshot in README.md to enhance visual representation of the extension, replacing the previous image with a new status bar screenshot.
- docs: Update screenshot in README.md to improve visual representation of the extension. Adjusted image dimensions for better display quality.
- feat: Enhance tooltip display in extension.ts to include user rank percentile. Updated rank formatting to show percentile when total users are available, improving clarity in user stats presentation.
- feat: Add dayjs dependency and implement last work time feature
- docs: Update user ID examples in README.md, extension.ts, and welcomePage.ts to reflect the new user ID format. This change ensures consistency across documentation and error messages.
- refactor: Refactor tooltip construction in extension.ts to enhance user and team stats display. Organized stats into distinct sections for improved readability and clarity.
- feat: Enhance number formatting in extension.ts to support trillions and billions. Updated formatNumber function to handle values up to 1T and 1B for improved readability.
- chore: Update version to 0.1.12 in package.json and adjust VS Code version requirement to 1.99.0 in README.md

## [2025-11-16]
- chore: Update version to 0.1.11 in package.json
- docs: Refactor README.md for clarity and consistency. Updated installation and configuration sections, streamlined usage instructions, and corrected the GitHub repository link.
- chore: Refactor package.json scripts for improved publishing workflow. Consolidated publish commands and removed obsolete scripts.
- chore: Update package.json and package-lock.json to include vsce version 2.15.0. The extension now available in VS Code Marketplace
- chore: Update version to 0.1.10 in package.json and package-lock.json, replace status bar text format in extension.ts for improved clarity, and update screenshot in README.md for better visibility.
- chore: Update version to 0.1.9 in package.json, add package-lock.json, and upgrade dependencies including axios, eslint, and typescript-eslint packages for improved functionality and compatibility.
- chore: Update version to 0.1.8 in package.json, add esbuild for bundling, and create esbuild.config.js for build configuration.
- chore: Update version to 0.1.7 in package.json and streamline README.md for clarity and conciseness.
- chore: Update version to 0.1.6 in package.json and add category for refresh command in VS Code extension.
- chore: Update version to 0.1.5 in package.json and README.md, and adjust VS Code version requirement to 1.106.0
- chore: Update version in package.json to 0.1.4
- docs: Update README.md to replace the status bar screenshot with a new image link for better visibility.
- feat: Initial commit of Folding@Home Stats VS Code extension, including core functionality, configuration, and UI components. Added ESLint and Biome configurations, along with necessary project files such as package.json, README.md, and TypeScript setup.
- chore: Initial commit