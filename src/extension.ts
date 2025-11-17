import axios from "axios";
import * as vscode from "vscode";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";
import { WelcomePage } from "./welcomePage";

dayjs.extend(relativeTime);

interface FAHTeam {
	team: number;
	name: string;
	trank: number;
	tscore: number;
	twus: number;
	founder: string;
	url: string;
	logo: string;
	score: number;
	wus: number;
	last: number;
	active_50: number;
	active_7: number;
}

interface FAHStats {
	name?: string;
	id?: number;
	pid?: number;
	score?: number;
	wus?: number;
	rank?: number;
	active_50?: number;
	active_7?: number;
	last?: string;
	users?: number;
	teams?: FAHTeam[];
}

export function activate(context: vscode.ExtensionContext) {
	console.log("Folding@Home Stats extension is now active");

	// Create status bar item
	const statusBarItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		100,
	);
	statusBarItem.command = "fah-stats.refresh";
	statusBarItem.tooltip = "Folding@Home Statistics";
	statusBarItem.show();

	// Function to fetch stats from Folding@Home API
	const fetchFAHStats = (userId: string): Promise<FAHStats> => {
		// Validate user ID is numeric
		if (!/^\d+$/.test(userId.trim())) {
			throw new Error(
				"Invalid user ID format. User ID must be a numeric value.",
			);
		}

		// Build URL - using /uid/{id} endpoint
		const url = `https://api2.foldingathome.org/uid/${userId.trim()}`;

		console.log(`Fetching FAH stats from: ${url}`);

		return axios
			.get<FAHStats>(url, {
				timeout: 10000,
				headers: {
					"User-Agent": "vscode-fah-stats-extension",
					Accept: "application/json",
				},
			})
			.then((response) => {
				console.log("Folding@Home API Response:");
				console.log(JSON.stringify(response.data, null, 2));
				return response.data;
			})
			.catch((error) => {
				if (axios.isAxiosError(error) && error.response) {
					console.error("Folding@Home API Error Response:");
					console.error(JSON.stringify(error.response.data, null, 2));
				}
				if (axios.isAxiosError(error)) {
					if (error.response?.status === 400) {
						const errorData = error.response.data;
						const errorMsg =
							typeof errorData === "string" && errorData
								? errorData
								: typeof errorData === "object" && errorData?.error
									? errorData.error
									: "Bad request - invalid user ID format";
						throw new Error(
							`Invalid request: ${errorMsg}. Please verify your user ID is a valid numeric value (e.g., 123456789).`,
						);
					} else if (error.response?.status === 404) {
						const errorMsg =
							error.response?.data?.error || "User not found";
						throw new Error(
							`User not found: ${errorMsg}. Please verify your user ID is correct.`,
						);
					} else if (error.code === "ECONNABORTED") {
						throw new Error("Request timeout: API did not respond in time");
					} else if (error.response) {
						const errorData = error.response.data;
						const errorMsg =
							typeof errorData === "string" && errorData
								? errorData
								: typeof errorData === "object" && errorData?.error
									? errorData.error
									: `HTTP ${error.response.status}`;
						throw new Error(errorMsg);
					} else {
						throw new Error(
							`Network error: ${error.message}. Please check your internet connection.`,
						);
					}
				}
				throw error instanceof Error
					? error
					: new Error("Unknown error occurred");
			});
	};

	// Function to get all configuration values
	const getFAHConfig = () => {
		const config = vscode.workspace.getConfiguration("fahStats");
		return {
			userName: config.get<string>("userName", ""),
			teamName: config.get<string>("teamName", ""), // Preferred team name to track
			passkey: config.get<string>("passkey", ""),
			refreshInterval: config.get<number>("refreshInterval", 300), // Default 5 minutes in seconds
			showLastWork: config.get<boolean>("showLastWork", true), // Show last work time in status bar
		};
	};

	// Function to select team from stats (largest contribution by default, or preferred team)
	const selectTeam = (
		teams: FAHTeam[] | undefined,
		preferredTeamName?: string,
	): FAHTeam | undefined => {
		if (!teams || teams.length === 0) {
			return undefined;
		}

		// If user specified a preferred team name, try to find it
		if (preferredTeamName) {
			const preferredTeam = teams.find(
				(t) =>
					t.name.toLowerCase() === preferredTeamName.toLowerCase(),
			);
			if (preferredTeam) {
				return preferredTeam;
			}
		}

		// Otherwise, return the team with the largest contribution (score)
		return teams.reduce((max, team) =>
			team.score > (max?.score ?? 0) ? team : max,
		);
	};

	// Function to fetch and update stats
	const updateStats = async () => {
		try {
			statusBarItem.text = "$(sync~spin) Loading FAH Stats...";

			// Get all configuration values
			const fahConfig = getFAHConfig();

			if (!fahConfig.userName) {
				statusBarItem.text = "$(error) FAH: Configure user ID";
				statusBarItem.tooltip =
					"Please configure fahStats.userName (user ID) in settings";
				return;
			}

			// Validate user ID format before making request
			const userId = fahConfig.userName.trim();
			if (!/^\d+$/.test(userId)) {
				statusBarItem.text = "$(error) FAH: Invalid user ID";
				statusBarItem.tooltip =
					"User ID must be numeric (e.g., 123456789). Please update your configuration.";
				statusBarItem.command = "fah-stats.welcome";
				return;
			}

			// Fetch stats from Folding@Home API using user ID
			const stats = await fetchFAHStats(userId);

			// Extract user stats
			const userName = stats.name || fahConfig.userName;
			const userScore = stats.score ?? 0;
			const userWus = stats.wus ?? 0;
			const userRank = stats.rank ?? 0;

			// Select team (preferred team or largest contribution)
			const selectedTeam = selectTeam(
				stats.teams,
				fahConfig.teamName || undefined,
			);

			const scoreFormatted = formatNumber(userScore);
			const rankFormatted = formatNumber(userRank);

			// Build tooltip with configured values and fetched stats
			const tooltipParts: string[] = [];

			// Calculate percentile if total users is available
			const totalUsers = stats.users;
			const percentile =
				totalUsers && userRank > 0
					? ((userRank / totalUsers) * 100).toFixed(2)
					: null;
			const rankDisplay = percentile
				? `Rank: ${userRank.toLocaleString()} (Top ${percentile}%)`
				: `Rank: ${userRank.toLocaleString()}`;

			// User Stats section
			tooltipParts.push("User Stats:");
			tooltipParts.push(`User: ${userName} #${stats.id || fahConfig.userName}`);
			tooltipParts.push(`Score: ${userScore.toLocaleString()}`);
			tooltipParts.push(rankDisplay);
			tooltipParts.push(`Work Units: ${userWus.toLocaleString()}`);
			if (stats.active_50 !== undefined) {
				tooltipParts.push(`Active (50 days): ${stats.active_50}`);
			}
			if (stats.active_7 !== undefined) {
				tooltipParts.push(`Active (7 days): ${stats.active_7}`);
			}

			// Team Stats section (only if team is selected)
			if (selectedTeam) {
				tooltipParts.push("");
				tooltipParts.push("Team Stats:");
				tooltipParts.push(`Team: ${selectedTeam.name} #${selectedTeam.team}`);
				tooltipParts.push(`Score: ${selectedTeam.tscore.toLocaleString()}`);
				tooltipParts.push(`Rank: ${selectedTeam.trank.toLocaleString()}`);
				tooltipParts.push(`Work Units: ${selectedTeam.twus.toLocaleString()}`);
				tooltipParts.push(`Contributions: ${selectedTeam.score.toLocaleString()}`);
				tooltipParts.push(`Contributed WUs: ${selectedTeam.wus.toLocaleString()}`);
			}

			// Status bar text
			const lastWorkFormatted = fahConfig.showLastWork
				? formatRelativeTime(stats.last)
				: null;
			const lastWorkText = lastWorkFormatted
				? `${lastWorkFormatted} • `
				: "";

			const teamRankFormatted = selectedTeam
				? formatNumber(selectedTeam.trank)
				: "";
			const teamScoreFormatted = selectedTeam
				? formatNumber(selectedTeam.tscore)
				: "";
			const teamInfo = selectedTeam
				? ` | ${selectedTeam.name} #${teamRankFormatted} • ${teamScoreFormatted} pts`
				: "";
			statusBarItem.text = `FAH • ${lastWorkText}${userName}: #${rankFormatted} • ${scoreFormatted} pts${teamInfo}`;
			statusBarItem.tooltip = tooltipParts.join("\n");
		} catch (error) {
			console.error("Error fetching FAH stats:", error);
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";

			// Show user-friendly error message
			if (errorMessage.includes("User not found")) {
				statusBarItem.text = "$(error) FAH: User not found";
				statusBarItem.tooltip = `${errorMessage}\n\nClick to open welcome page and update your username.`;
				statusBarItem.command = "fah-stats.welcome";
			} else if (errorMessage.includes("timeout")) {
				statusBarItem.text = "$(error) FAH: Timeout";
				statusBarItem.tooltip = `${errorMessage}\n\nClick to retry.`;
			} else if (errorMessage.includes("Network error")) {
				statusBarItem.text = "$(error) FAH: Network error";
				statusBarItem.tooltip = `${errorMessage}\n\nClick to retry.`;
			} else {
				statusBarItem.text = "$(error) FAH: Error";
				statusBarItem.tooltip = `Failed to fetch Folding@Home statistics\n\n${errorMessage}\n\nClick to retry.`;
			}
			// Reset command to refresh on click
			statusBarItem.command = "fah-stats.refresh";
		}
	};

	// Format large numbers (e.g., 1000 -> 1K, 1000000 -> 1M, 1000000000 -> 1B, 1000000000000 -> 1T)
	const formatNumber = (num: number): string => {
		if (num >= 1000000000000) {
			return `${(num / 1000000000000).toFixed(1)}T`;
		} else if (num >= 1000000000) {
			return `${(num / 1000000000).toFixed(1)}B`;
		} else if (num >= 1000000) {
			return `${(num / 1000000).toFixed(1)}M`;
		} else if (num >= 1000) {
			return `${(num / 1000).toFixed(1)}K`;
		}
		return num.toString();
	};

	// Format relative time (e.g., "12 minutes ago", "2 hours ago", "3 days ago")
	const formatRelativeTime = (dateString: string | undefined): string | null => {
		if (!dateString) {
			return null;
		}

		try {
			// Parse the date string "2025-11-17 16:14:37"
			const date = dayjs(dateString);
			if (!date.isValid()) {
				return null;
			}
			return date.fromNow();
		} catch (error) {
			console.error("Error formatting relative time:", error);
			return null;
		}
	};

	// Register refresh command
	const refreshCommand = vscode.commands.registerCommand(
		"fah-stats.refresh",
		() => {
			updateStats();
		},
	);

	// Register welcome page command
	const welcomeCommand = vscode.commands.registerCommand(
		"fah-stats.welcome",
		() => {
			WelcomePage.show(context);
		},
	);

	// Register reset configuration command
	const resetCommand = vscode.commands.registerCommand(
		"fah-stats.reset",
		async () => {
			const config = vscode.workspace.getConfiguration("fahStats");
			await config.update("userName", undefined, true);
			await config.update("teamName", undefined, true);
			await config.update("passkey", undefined, true);
			await config.update("refreshInterval", undefined, true);
			vscode.window.showInformationMessage(
				"Folding@Home configuration cleared. Welcome page will open.",
			);
			// Show welcome page after clearing
			setTimeout(() => {
				WelcomePage.show(context);
			}, 500);
		},
	);

	context.subscriptions.push(statusBarItem, refreshCommand, welcomeCommand, resetCommand);

	// Check if configuration is needed and show welcome page
	const fahConfig = getFAHConfig();
	if (!fahConfig.userName) {
		// Show welcome page after a short delay to allow UI to initialize
		setTimeout(() => {
			WelcomePage.show(context);
		}, 1000);
	}

	// Initial update
	updateStats();

	// Set up interval based on configuration
	let intervalId: NodeJS.Timeout | undefined;
	const setupInterval = () => {
		if (intervalId) {
			clearInterval(intervalId);
		}
		const fahConfig = getFAHConfig();
		const intervalMs = fahConfig.refreshInterval * 1000; // Convert seconds to milliseconds
		intervalId = setInterval(updateStats, intervalMs);
	};

	setupInterval();

	// Listen for configuration changes
	const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
		if (e.affectsConfiguration("fahStats.refreshInterval")) {
			setupInterval();
		}
	});

	context.subscriptions.push({
		dispose: () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
			configWatcher.dispose();
		},
	});
}

export function deactivate() {
	console.log("Folding@Home Stats extension is now deactivated");
}
