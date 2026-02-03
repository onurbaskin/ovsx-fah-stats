import axios from "axios";
import * as vscode from "vscode";
import {
	formatNumber,
	formatRelativeTime,
	renderStatusBarTemplate,
	type TemplateContext,
} from "./formatting";
import { WelcomePage } from "./welcomePage";

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

interface FAHTeamSnapshot {
	id: number;
	name: string;
	rank: number;
	score: number;
	workUnits: number;
	contributions: number;
	contributedWus: number;
}

interface FAHStatsSnapshot {
	userId: string;
	userName: string;
	userScore: number;
	userWus: number;
	userRank: number;
	userActive50?: number;
	userActive7?: number;
	lastWork?: string;
	totalUsers?: number;
	team?: FAHTeamSnapshot;
}

const USER_ID_REGEX = /^\d+$/;

export function activate(context: vscode.ExtensionContext) {
	const outputChannel = vscode.window.createOutputChannel(
		"Folding@Home Stats",
	);

	const statusBarItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		100,
	);
	statusBarItem.command = "fah-stats.refresh";
	statusBarItem.tooltip = "Folding@Home Statistics";
	statusBarItem.show();

	let isRefreshing = false;
	let isInitialLoad = true;
	let lastSnapshot: FAHStatsSnapshot | null = null;
	let lastUpdatedAtMs: number | null = null;
	let failureCount = 0;
	let intervalId: NodeJS.Timeout | undefined;
	let currentAbort: AbortController | undefined;

	const getFAHConfig = () => {
		const config = vscode.workspace.getConfiguration("fahStats");
		return {
			userId: config.get<string>("userId", ""),
			teamName: config.get<string>("teamName", ""),
			refreshInterval: config.get<number>("refreshInterval", 300),
			paused: config.get<boolean>("paused", false),
			showLastWork: config.get<boolean>("showLastWork", true),
			showTeamInfo: config.get<boolean>("showTeamInfo", true),
			compactStatusBar: config.get<boolean>("compactStatusBar", false),
			statusBarTemplate: config.get<string>("statusBarTemplate", ""),
			tooltipFormat: config.get<"plain" | "markdown">(
				"tooltipFormat",
				"markdown",
			),
		};
	};

	const selectTeam = (
		teams: FAHTeam[] | undefined,
		preferredTeamName?: string,
	): FAHTeam | undefined => {
		if (!teams || teams.length === 0) {
			return undefined;
		}

		if (preferredTeamName) {
			const preferredTeam = teams.find(
				(t) => t.name.toLowerCase() === preferredTeamName.toLowerCase(),
			);
			if (preferredTeam) {
				return preferredTeam;
			}
		}

		return teams.reduce((max, team) =>
			team.score > (max?.score ?? 0) ? team : max,
		);
	};

	const normalizeStats = (
		stats: FAHStats,
		config: ReturnType<typeof getFAHConfig>,
	): FAHStatsSnapshot => {
		const userId = String(stats.id ?? config.userId);
		const userName = stats.name || config.userId;
		const selectedTeam = config.showTeamInfo
			? selectTeam(stats.teams, config.teamName || undefined)
			: undefined;

		return {
			userId,
			userName,
			userScore: stats.score ?? 0,
			userWus: stats.wus ?? 0,
			userRank: stats.rank ?? 0,
			userActive50: stats.active_50,
			userActive7: stats.active_7,
			lastWork: stats.last,
			totalUsers: stats.users,
			team: selectedTeam
				? {
					id: selectedTeam.team,
					name: selectedTeam.name,
					rank: selectedTeam.trank,
					score: selectedTeam.tscore,
					workUnits: selectedTeam.twus,
					contributions: selectedTeam.score,
					contributedWus: selectedTeam.wus,
				}
				: undefined,
		};
	};

	const formatUpdatedAtRelative = (updatedAtMs: number | null): string => {
		if (!updatedAtMs) {
			return "Unknown";
		}
		const deltaMs = Math.max(0, Date.now() - updatedAtMs);
		const seconds = Math.floor(deltaMs / 1000);
		if (seconds < 60) {
			return "Just now";
		}
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) {
			return `${minutes}m ago`;
		}
		const hours = Math.floor(minutes / 60);
		if (hours < 24) {
			return `${hours}h ago`;
		}
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	};

	const escapeMarkdownTable = (value: string): string =>
		value.replace(/\|/g, "\\|").replace(/\n/g, " ");

	const buildTooltip = (
		snapshot: FAHStatsSnapshot,
		config: ReturnType<typeof getFAHConfig>,
		isStale: boolean,
	): vscode.MarkdownString | string => {
		const percentile =
			snapshot.totalUsers && snapshot.userRank > 0
				? ((snapshot.userRank / snapshot.totalUsers) * 100).toFixed(2)
				: null;
		const rankDisplay = percentile
			? `${snapshot.userRank.toLocaleString()} (Top ${percentile}%)`
			: snapshot.userRank.toLocaleString();
		const updatedAtText = formatUpdatedAtRelative(lastUpdatedAtMs);
		const lastWorkFormatted = formatRelativeTime(snapshot.lastWork) ?? "Unknown";
		const statusLine = isStale
			? `Stale (last updated ${updatedAtText})`
			: `Updated ${updatedAtText}`;

		if (config.tooltipFormat === "markdown") {
			const md = new vscode.MarkdownString(undefined, true);
			md.appendMarkdown(`**User Stats**\n\n`);
			md.appendMarkdown(`| Field | Value |\n| --- | --- |\n`);
			md.appendMarkdown(
				`| User | ${escapeMarkdownTable(
					`${snapshot.userName} #${snapshot.userId}`,
				)} |\n`,
			);
			md.appendMarkdown(
				`| Score | ${snapshot.userScore.toLocaleString()} |\n`,
			);
			md.appendMarkdown(`| Rank | ${rankDisplay} |\n`);
			md.appendMarkdown(
				`| Work Units | ${snapshot.userWus.toLocaleString()} |\n`,
			);
			md.appendMarkdown(`| Last Work | ${lastWorkFormatted} |\n`);
			if (snapshot.userActive50 !== undefined) {
				md.appendMarkdown(`| Active (50 days) | ${snapshot.userActive50} |\n`);
			}
			if (snapshot.userActive7 !== undefined) {
				md.appendMarkdown(`| Active (7 days) | ${snapshot.userActive7} |\n`);
			}

			if (config.showTeamInfo && snapshot.team) {
				md.appendMarkdown(`\n**Team Stats**\n\n`);
				md.appendMarkdown(`| Field | Value |\n| --- | --- |\n`);
				md.appendMarkdown(
					`| Team | ${escapeMarkdownTable(
						`${snapshot.team.name} #${snapshot.team.id}`,
					)} |\n`,
				);
				md.appendMarkdown(
					`| Score | ${snapshot.team.score.toLocaleString()} |\n`,
				);
				md.appendMarkdown(
					`| Rank | ${snapshot.team.rank.toLocaleString()} |\n`,
				);
				md.appendMarkdown(
					`| Work Units | ${snapshot.team.workUnits.toLocaleString()} |\n`,
				);
				md.appendMarkdown(
					`| Contributions | ${snapshot.team.contributions.toLocaleString()} |\n`,
				);
				md.appendMarkdown(
					`| Contributed WUs | ${snapshot.team.contributedWus.toLocaleString()} |\n`,
				);
			}

			md.appendMarkdown(`\n_${statusLine}_`);
			return md;
		}

		const lines: string[] = [];
		lines.push("User Stats:");
		lines.push(`User: ${snapshot.userName} #${snapshot.userId}`);
		lines.push(`Score: ${snapshot.userScore.toLocaleString()}`);
		lines.push(`Rank: ${rankDisplay}`);
		lines.push(`Work Units: ${snapshot.userWus.toLocaleString()}`);
		lines.push(`Last Work: ${lastWorkFormatted}`);
		if (snapshot.userActive50 !== undefined) {
			lines.push(`Active (50 days): ${snapshot.userActive50}`);
		}
		if (snapshot.userActive7 !== undefined) {
			lines.push(`Active (7 days): ${snapshot.userActive7}`);
		}

		if (config.showTeamInfo && snapshot.team) {
			lines.push("");
			lines.push("Team Stats:");
			lines.push(`Team: ${snapshot.team.name} #${snapshot.team.id}`);
			lines.push(`Score: ${snapshot.team.score.toLocaleString()}`);
			lines.push(`Rank: ${snapshot.team.rank.toLocaleString()}`);
			lines.push(`Work Units: ${snapshot.team.workUnits.toLocaleString()}`);
			lines.push(
				`Contributions: ${snapshot.team.contributions.toLocaleString()}`,
			);
			lines.push(
				`Contributed WUs: ${snapshot.team.contributedWus.toLocaleString()}`,
			);
		}

		lines.push("");
		lines.push(statusLine);
		return lines.join("\n");
	};

	const buildStatusBarText = (
		snapshot: FAHStatsSnapshot,
		config: ReturnType<typeof getFAHConfig>,
	): string => {
		const scoreFormatted = formatNumber(snapshot.userScore);
		const rankFormatted = formatNumber(snapshot.userRank);
		const lastWorkFormatted = config.showLastWork
			? formatRelativeTime(snapshot.lastWork)
			: null;
		const lastWorkText = lastWorkFormatted ? `${lastWorkFormatted} • ` : "";
		const teamRankFormatted = snapshot.team
			? formatNumber(snapshot.team.rank)
			: "";
		const teamScoreFormatted = snapshot.team
			? formatNumber(snapshot.team.score)
			: "";
		const teamInfo =
			config.showTeamInfo && snapshot.team
				? ` | ${snapshot.team.name} #${teamRankFormatted} • ${teamScoreFormatted} pts`
				: "";

		const template = config.statusBarTemplate.trim();
		if (template) {
			const context: TemplateContext = {
				user: snapshot.userName,
				rank: rankFormatted,
				score: scoreFormatted,
				team: snapshot.team?.name ?? "",
				teamRank: teamRankFormatted,
				teamScore: teamScoreFormatted,
				lastWork: lastWorkFormatted ?? "",
				updatedAt: formatUpdatedAtRelative(lastUpdatedAtMs),
			};
			const rendered = renderStatusBarTemplate(template, context);
			if (rendered) {
				return rendered;
			}
		}

		if (config.compactStatusBar) {
			return `FAH #${rankFormatted} • ${scoreFormatted} pts`;
		}

		return `FAH • ${lastWorkText}${snapshot.userName}: #${rankFormatted} • ${scoreFormatted} pts${teamInfo}`;
	};

	const buildClipboardText = (snapshot: FAHStatsSnapshot): string => {
		const parts = [
			`User: ${snapshot.userName} (#${snapshot.userId})`,
			`Rank: ${snapshot.userRank.toLocaleString()}`,
			`Score: ${snapshot.userScore.toLocaleString()}`,
			`Work Units: ${snapshot.userWus.toLocaleString()}`,
		];
		if (snapshot.team) {
			parts.push(`Team: ${snapshot.team.name} (#${snapshot.team.id})`);
			parts.push(`Team Rank: ${snapshot.team.rank.toLocaleString()}`);
			parts.push(`Team Score: ${snapshot.team.score.toLocaleString()}`);
		}
		return parts.join(" | ");
	};

	const calculateIntervalSeconds = (baseSeconds: number, failures: number) => {
		const resolvedBase =
			Number.isFinite(baseSeconds) && baseSeconds >= 10 ? baseSeconds : 300;
		const cap = 1800;
		if (failures <= 0) {
			return Math.min(resolvedBase, cap);
		}
		if (failures === 1) {
			return Math.min(resolvedBase * 3, cap);
		}
		return Math.min(resolvedBase * 6, cap);
	};

	const rescheduleInterval = (config: ReturnType<typeof getFAHConfig>) => {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = undefined;
		}
		if (config.paused) {
			return;
		}
		const intervalSeconds = calculateIntervalSeconds(
			Number(config.refreshInterval),
			failureCount,
		);
		intervalId = setInterval(() => {
			void updateStats({ showLoading: false, force: false });
		}, intervalSeconds * 1000);
	};

	const fetchFAHStats = async (userId: string): Promise<FAHStats> => {
		if (!USER_ID_REGEX.test(userId.trim())) {
			throw new Error(
				"Invalid user ID format. User ID must be a numeric value.",
			);
		}

		const url = `https://api2.foldingathome.org/uid/${userId.trim()}`;

		if (currentAbort) {
			currentAbort.abort();
		}
		currentAbort = new AbortController();

		const response = await axios.get<FAHStats>(url, {
			timeout: 10000,
			signal: currentAbort.signal,
			headers: {
				"User-Agent": "vscode-fah-stats-extension",
				Accept: "application/json",
			},
		});
		return response.data;
	};

	const renderPausedState = (config: ReturnType<typeof getFAHConfig>) => {
		statusBarItem.text = "$(debug-pause) FAH: Paused";
		statusBarItem.command = "fah-stats.refresh";
		if (lastSnapshot) {
			statusBarItem.tooltip = buildTooltip(lastSnapshot, config, true);
		} else {
			statusBarItem.tooltip =
				"Updates are paused. Toggle pause to resume fetching stats.";
		}
	};

	const updateStats = async (options: { showLoading: boolean; force: boolean }) => {
		if (isRefreshing) {
			return;
		}
		const config = getFAHConfig();
		if (config.paused && !options.force) {
			renderPausedState(config);
			return;
		}

		isRefreshing = true;
		try {
			if (options.showLoading) {
				statusBarItem.text = "$(sync~spin) Loading FAH Stats...";
			}

			if (!config.userId) {
				statusBarItem.text = "$(error) FAH: Configure user ID";
				statusBarItem.tooltip =
					"Please configure fahStats.userId (user ID) in settings";
				return;
			}

			const userId = config.userId.trim();
			if (!USER_ID_REGEX.test(userId)) {
				statusBarItem.text = "$(error) FAH: Invalid user ID";
				statusBarItem.tooltip =
					"User ID must be numeric (e.g., 123456789). Please update your configuration.";
				statusBarItem.command = "fah-stats.welcome";
				return;
			}

			const stats = await fetchFAHStats(userId);
			const snapshot = normalizeStats(stats, config);
			lastSnapshot = snapshot;
			lastUpdatedAtMs = Date.now();
			failureCount = 0;
			rescheduleInterval(config);

			statusBarItem.text = buildStatusBarText(snapshot, config);
			statusBarItem.tooltip = buildTooltip(snapshot, config, false);
			statusBarItem.command = "fah-stats.refresh";
		} catch (error) {
			if (axios.isAxiosError(error) && error.code === "ERR_CANCELED") {
				return;
			}

			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			failureCount += 1;
			rescheduleInterval(config);

			if (lastSnapshot) {
				statusBarItem.text = buildStatusBarText(lastSnapshot, config);
				statusBarItem.tooltip = buildTooltip(lastSnapshot, config, true);
				statusBarItem.command = "fah-stats.refresh";
			} else if (errorMessage.includes("User not found")) {
				statusBarItem.text = "$(error) FAH: User not found";
				statusBarItem.tooltip =
					`${errorMessage}\n\nClick to open welcome page and update your user ID.`;
				statusBarItem.command = "fah-stats.welcome";
			} else if (errorMessage.includes("timeout")) {
				statusBarItem.text = "$(error) FAH: Timeout";
				statusBarItem.tooltip = `${errorMessage}\n\nClick to retry.`;
			} else if (errorMessage.includes("Network error")) {
				statusBarItem.text = "$(error) FAH: Network error";
				statusBarItem.tooltip = `${errorMessage}\n\nClick to retry.`;
			} else {
				statusBarItem.text = "$(error) FAH: Error";
				statusBarItem.tooltip =
					`Failed to fetch Folding@Home statistics\n\n${errorMessage}\n\nClick to retry.`;
			}
			statusBarItem.command = "fah-stats.refresh";
			outputChannel.appendLine(
				`Error fetching Folding@Home stats: ${errorMessage}`,
			);
		} finally {
			isRefreshing = false;
			isInitialLoad = false;
		}
	};

	const refreshCommand = vscode.commands.registerCommand(
		"fah-stats.refresh",
		() => {
			void updateStats({ showLoading: true, force: true });
		},
	);

	const copyStatsCommand = vscode.commands.registerCommand(
		"fah-stats.copyStats",
		async () => {
			if (!lastSnapshot) {
				vscode.window.showInformationMessage(
					"No stats available yet. Try refreshing first.",
				);
				return;
			}
			await vscode.env.clipboard.writeText(buildClipboardText(lastSnapshot));
			vscode.window.showInformationMessage("Stats copied to clipboard.");
		},
	);

	const openProfileCommand = vscode.commands.registerCommand(
		"fah-stats.openProfile",
		async () => {
			const config = getFAHConfig();
			const userId = config.userId.trim();
			if (!USER_ID_REGEX.test(userId)) {
				vscode.window.showErrorMessage(
					"Please configure a valid numeric Folding@Home user ID before opening the profile.",
				);
				return;
			}
			const url = `https://stats.foldingathome.org/donor/${userId}`;
			await vscode.env.openExternal(vscode.Uri.parse(url));
		},
	);

	const pauseUpdatesCommand = vscode.commands.registerCommand(
		"fah-stats.pauseUpdates",
		async () => {
			const config = vscode.workspace.getConfiguration("fahStats");
			const paused = config.get<boolean>("paused", false);
			await config.update("paused", !paused, true);
			const updatedConfig = getFAHConfig();
			if (updatedConfig.paused) {
				renderPausedState(updatedConfig);
			} else {
				rescheduleInterval(updatedConfig);
				void updateStats({ showLoading: false, force: true });
			}
		},
	);

	const welcomeCommand = vscode.commands.registerCommand(
		"fah-stats.welcome",
		() => {
			void WelcomePage.show(context);
		},
	);

	const resetCommand = vscode.commands.registerCommand(
		"fah-stats.reset",
		async () => {
			const config = vscode.workspace.getConfiguration("fahStats");
			await config.update("userId", undefined, true);
			await config.update("teamName", undefined, true);
			await config.update("refreshInterval", undefined, true);
			await config.update("paused", undefined, true);
			await config.update("showLastWork", undefined, true);
			await config.update("showTeamInfo", undefined, true);
			await config.update("compactStatusBar", undefined, true);
			await config.update("statusBarTemplate", undefined, true);
			await config.update("tooltipFormat", undefined, true);
			await context.secrets.delete("fahStats.passkey");
			vscode.window.showInformationMessage(
				"Folding@Home configuration cleared. Welcome page will open.",
			);
			setTimeout(() => {
				void WelcomePage.show(context);
			}, 500);
		},
	);

	context.subscriptions.push(
		statusBarItem,
		refreshCommand,
		copyStatsCommand,
		openProfileCommand,
		pauseUpdatesCommand,
		welcomeCommand,
		resetCommand,
		outputChannel,
	);

	const initialConfig = getFAHConfig();
	if (!initialConfig.userId) {
		setTimeout(() => {
			void WelcomePage.show(context);
		}, 1000);
	}

	void updateStats({ showLoading: isInitialLoad, force: true });
	rescheduleInterval(initialConfig);

	const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
		if (!e.affectsConfiguration("fahStats")) {
			return;
		}
		const updatedConfig = getFAHConfig();
		if (
			e.affectsConfiguration("fahStats.refreshInterval") ||
			e.affectsConfiguration("fahStats.paused")
		) {
			rescheduleInterval(updatedConfig);
		}
		void updateStats({ showLoading: false, force: false });
	});

	context.subscriptions.push({
		dispose: () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
			if (currentAbort) {
				currentAbort.abort();
			}
			configWatcher.dispose();
		},
	});
}

export function deactivate() {
	// No-op
}
