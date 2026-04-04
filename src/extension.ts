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
	const outputChannel = vscode.window.createOutputChannel("Folding@Home Stats");

	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.command = "fah-stats.refresh";
	statusBarItem.tooltip = "Folding@Home Statistics";
	statusBarItem.show();

	let isRefreshing = false;
	let isInitialLoad = true;
	let lastSnapshot: FAHStatsSnapshot | null = null;
	let lastUpdatedAtMs: number | null = null;
	let lastTooltipHash: string | null = null;
	let lastTooltip: vscode.MarkdownString | string | null = null;
	let failureCount = 0;
	let intervalId: NodeJS.Timeout | undefined;
	let currentAbort: AbortController | undefined;
	const clearIntervalIfSet = () => {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = undefined;
		}
	};

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
			tooltipFormat: config.get<"plain" | "markdown">("tooltipFormat", "markdown"),
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

		return teams.reduce((max, team) => (team.score > (max?.score ?? 0) ? team : max));
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
		return `${Math.floor(hours / 24)}d ago`;
	};

	const escapeMarkdownTable = (value: string): string =>
		value.replace(/\|/g, "\\|").replace(/\n/g, " ");

	const getTooltip = (
		snapshot: FAHStatsSnapshot,
		config: ReturnType<typeof getFAHConfig>,
		isStale: boolean,
	) => {
		const percentile =
			snapshot.totalUsers && snapshot.userRank > 0
				? ((snapshot.userRank / snapshot.totalUsers) * 100).toFixed(2)
				: null;
		const rankDisplay = percentile
			? `${snapshot.userRank.toLocaleString()} (Top ${percentile}%)`
			: snapshot.userRank.toLocaleString();
		const updatedAtText = formatUpdatedAtRelative(lastUpdatedAtMs);
		const updatedAtAbsolute = lastUpdatedAtMs
			? new Date(lastUpdatedAtMs).toLocaleString()
			: "Unknown";
		const lastWorkFormatted = formatRelativeTime(snapshot.lastWork) ?? "Unknown";
		const statusLine = isStale ? `Stale (last updated ${updatedAtText})` : `Updated ${updatedAtText}`;
		const team = config.showTeamInfo ? snapshot.team : undefined;
		const hash = [
			snapshot.userId,
			snapshot.userName,
			snapshot.userScore,
			snapshot.userWus,
			snapshot.userRank,
			snapshot.userActive50 ?? "",
			snapshot.userActive7 ?? "",
			snapshot.lastWork ?? "",
			snapshot.totalUsers ?? "",
			config.tooltipFormat,
			config.showTeamInfo ? "1" : "0",
			lastUpdatedAtMs ?? "",
			isStale ? "1" : "0",
			team
				? [
						team.id,
						team.name,
						team.rank,
						team.score,
						team.workUnits,
						team.contributions,
						team.contributedWus,
					].join(",")
				: "",
		].join("|");
		if (lastTooltip && hash === lastTooltipHash) {
			return lastTooltip;
		}

		if (config.tooltipFormat === "markdown") {
			const md = new vscode.MarkdownString(undefined, true);
			md.appendMarkdown(`**User Stats**\n\n`);
			md.appendMarkdown(`| Field | Value |\n| --- | --- |\n`);
			md.appendMarkdown(
				`| User | ${escapeMarkdownTable(`${snapshot.userName} #${snapshot.userId}`)} |\n`,
			);
			md.appendMarkdown(`| Score | ${snapshot.userScore.toLocaleString()} |\n`);
			md.appendMarkdown(`| Rank | ${rankDisplay} |\n`);
			md.appendMarkdown(`| Work Units | ${snapshot.userWus.toLocaleString()} |\n`);
			md.appendMarkdown(`| Last Work | ${lastWorkFormatted} |\n`);
			md.appendMarkdown(`| Last Refresh | ${updatedAtAbsolute} |\n`);
			if (snapshot.userActive50 !== undefined) {
				md.appendMarkdown(`| Active (50 days) | ${snapshot.userActive50} |\n`);
			}
			if (snapshot.userActive7 !== undefined) {
				md.appendMarkdown(`| Active (7 days) | ${snapshot.userActive7} |\n`);
			}

			if (team) {
				md.appendMarkdown(`\n**Team Stats**\n\n`);
				md.appendMarkdown(`| Field | Value |\n| --- | --- |\n`);
				md.appendMarkdown(`| Team | ${escapeMarkdownTable(`${team.name} #${team.id}`)} |\n`);
				md.appendMarkdown(`| Score | ${team.score.toLocaleString()} |\n`);
				md.appendMarkdown(`| Rank | ${team.rank.toLocaleString()} |\n`);
				md.appendMarkdown(`| Work Units | ${team.workUnits.toLocaleString()} |\n`);
				md.appendMarkdown(`| Contributions | ${team.contributions.toLocaleString()} |\n`);
				md.appendMarkdown(`| Contributed WUs | ${team.contributedWus.toLocaleString()} |\n`);
			}

			md.appendMarkdown(`\n_${statusLine}_`);
			lastTooltip = md;
			lastTooltipHash = hash;
			return md;
		}

		const lines: string[] = [
			"User Stats:",
			`User: ${snapshot.userName} #${snapshot.userId}`,
			`Score: ${snapshot.userScore.toLocaleString()}`,
			`Rank: ${rankDisplay}`,
			`Work Units: ${snapshot.userWus.toLocaleString()}`,
			`Last Work: ${lastWorkFormatted}`,
			`Last Refresh: ${updatedAtAbsolute}`,
		];
		if (snapshot.userActive50 !== undefined) {
			lines.push(`Active (50 days): ${snapshot.userActive50}`);
		}
		if (snapshot.userActive7 !== undefined) {
			lines.push(`Active (7 days): ${snapshot.userActive7}`);
		}

		if (team) {
			lines.push("");
			lines.push("Team Stats:");
			lines.push(`Team: ${team.name} #${team.id}`);
			lines.push(`Score: ${team.score.toLocaleString()}`);
			lines.push(`Rank: ${team.rank.toLocaleString()}`);
			lines.push(`Work Units: ${team.workUnits.toLocaleString()}`);
			lines.push(`Contributions: ${team.contributions.toLocaleString()}`);
			lines.push(`Contributed WUs: ${team.contributedWus.toLocaleString()}`);
		}

		lines.push("");
		lines.push(statusLine);
		const tooltip = lines.join("\n");
		lastTooltip = tooltip;
		lastTooltipHash = hash;
		return tooltip;
	};

	const buildStatusBarText = (
		snapshot: FAHStatsSnapshot,
		config: ReturnType<typeof getFAHConfig>,
	): string => {
		const scoreFormatted = formatNumber(snapshot.userScore);
		const rankFormatted = formatNumber(snapshot.userRank);
		const lastWorkFormatted = config.showLastWork
			? (formatRelativeTime(snapshot.lastWork) ?? "")
			: "";
		const lastWorkText = lastWorkFormatted ? `${lastWorkFormatted} • ` : "";
		const team = config.showTeamInfo ? snapshot.team : undefined;
		const teamRankFormatted = team ? formatNumber(team.rank) : "";
		const teamScoreFormatted = team ? formatNumber(team.score) : "";
		const teamName = team?.name ?? "";
		const teamInfo = team ? ` | ${team.name} #${teamRankFormatted} • ${teamScoreFormatted} pts` : "";

		const template = config.statusBarTemplate.trim();
		if (template) {
			const context: TemplateContext = {
				user: snapshot.userName,
				rank: rankFormatted,
				score: scoreFormatted,
				team: teamName,
				teamRank: teamRankFormatted,
				teamScore: teamScoreFormatted,
				lastWork: lastWorkFormatted,
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

	const buildClipboardText = (
		snapshot: FAHStatsSnapshot,
		config: ReturnType<typeof getFAHConfig>,
	): string => {
		const parts = [
			`User: ${snapshot.userName} (#${snapshot.userId})`,
			`Rank: ${snapshot.userRank.toLocaleString()}`,
			`Score: ${snapshot.userScore.toLocaleString()}`,
			`Work Units: ${snapshot.userWus.toLocaleString()}`,
		];
		const team = config.showTeamInfo ? snapshot.team : undefined;
		if (team) {
			parts.push(`Team: ${team.name} (#${team.id})`);
			parts.push(`Team Rank: ${team.rank.toLocaleString()}`);
			parts.push(`Team Score: ${team.score.toLocaleString()}`);
		}
		return parts.join(" | ");
	};

	const calculateIntervalSeconds = (baseSeconds: number, failures: number) => {
		const resolvedBase = Number.isFinite(baseSeconds) && baseSeconds >= 10 ? baseSeconds : 300;
		const cap = 1800;
		if (failures <= 0) {
			return Math.min(resolvedBase, cap);
		}
		if (failures === 1) {
			return Math.min(resolvedBase * 3, cap);
		}
		if (failures === 2) {
			return Math.min(resolvedBase * 6, cap);
		}
		return cap;
	};

	const rescheduleInterval = (config: ReturnType<typeof getFAHConfig>) => {
		clearIntervalIfSet();
		if (config.paused) {
			return;
		}
		const intervalSeconds = calculateIntervalSeconds(Number(config.refreshInterval), failureCount);
		intervalId = setInterval(() => {
			void updateStats(false);
		}, intervalSeconds * 1000);
	};

	const fetchFAHStats = async (userId: string): Promise<FAHStats> => {
		if (!USER_ID_REGEX.test(userId.trim())) {
			throw new Error("Invalid user ID format. User ID must be a numeric value.");
		}

		const url = `https://api2.foldingathome.org/uid/${userId.trim()}`;

		if (currentAbort) {
			currentAbort.abort();
		}
		currentAbort = new AbortController();
		let timeoutId: ReturnType<typeof setTimeout> | undefined;
		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(() => {
				currentAbort?.abort();
				reject(new Error("timeout"));
			}, 10000);
		});

		try {
			const response = (await Promise.race([
				fetch(url, {
					signal: currentAbort.signal,
					headers: {
						"User-Agent": "vscode-fah-stats-extension",
						Accept: "application/json",
					},
				}),
				timeoutPromise,
			])) as Response;
			const bodyText = await response.text();
			if (!response.ok) {
				let message = "";
				try {
					const parsed = JSON.parse(bodyText) as { error?: string };
					if (typeof parsed?.error === "string") {
						message = parsed.error;
					}
				} catch {
					// ignore JSON parse errors
				}
				message = message || bodyText || `Request failed with status ${response.status}`;
				throw new Error(message);
			}
			return bodyText ? (JSON.parse(bodyText) as FAHStats) : ({} as FAHStats);
		} finally {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		}
	};

	const setStatus = (
		text: string,
		tooltip: vscode.MarkdownString | string,
		command = "fah-stats.refresh",
	) => {
		statusBarItem.text = text;
		statusBarItem.tooltip = tooltip;
		statusBarItem.command = command;
	};

	const updateStats = async (showLoading: boolean) => {
		if (isRefreshing) {
			return;
		}
		const config = getFAHConfig();
		if (config.paused) {
			setStatus(
				"$(debug-pause) FAH: Paused",
				lastSnapshot
					? getTooltip(lastSnapshot, config, true)
					: "Updates are paused. Toggle pause to resume fetching stats.",
			);
			return;
		}

		isRefreshing = true;
		try {
			if (showLoading) {
				statusBarItem.text = "$(sync~spin) Loading FAH Stats...";
			}

			if (!config.userId) {
				setStatus(
					"$(error) FAH: Configure user ID",
					"Please configure fahStats.userId (user ID) in settings",
				);
				return;
			}

			const userId = config.userId.trim();
			if (!USER_ID_REGEX.test(userId)) {
				setStatus(
					"$(error) FAH: Invalid user ID",
					"User ID must be numeric (e.g., 123456789). Please update your configuration.",
					"fah-stats.welcome",
				);
				return;
			}

			const stats = await fetchFAHStats(userId);
			const snapshot = normalizeStats(stats, config);
			lastSnapshot = snapshot;
			lastUpdatedAtMs = Date.now();
			lastTooltipHash = null;
			lastTooltip = null;
			failureCount = 0;
			rescheduleInterval(config);

			setStatus(buildStatusBarText(snapshot, config), getTooltip(snapshot, config, false));
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
				return;
			}

			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			failureCount += 1;
			rescheduleInterval(config);

			if (lastSnapshot) {
				setStatus(buildStatusBarText(lastSnapshot, config), getTooltip(lastSnapshot, config, true));
			} else {
				const cases = [
					{
						test: (message: string) => message.includes("User not found"),
						text: "$(error) FAH: User not found",
						tooltip: `${errorMessage}\n\nClick to open welcome page and update your user ID.`,
						command: "fah-stats.welcome",
					},
					{
						test: (message: string) => message.includes("timeout"),
						text: "$(error) FAH: Timeout",
						tooltip: `${errorMessage}\n\nClick to retry.`,
					},
					{
						test: (message: string) => message.includes("Network error"),
						text: "$(error) FAH: Network error",
						tooltip: `${errorMessage}\n\nClick to retry.`,
					},
				];
				const match = cases.find((entry) => entry.test(errorMessage));
				setStatus(
					match?.text ?? "$(error) FAH: Error",
					match?.tooltip ??
						`Failed to fetch Folding@Home statistics\n\n${errorMessage}\n\nClick to retry.`,
					match?.command,
				);
			}
			outputChannel.appendLine(`Error fetching Folding@Home stats: ${errorMessage}`);
		} finally {
			isRefreshing = false;
			isInitialLoad = false;
		}
	};

	const refreshCommand = vscode.commands.registerCommand("fah-stats.refresh", () => {
		void updateStats(true);
	});

	const copyStatsCommand = vscode.commands.registerCommand("fah-stats.copyStats", async () => {
		if (!lastSnapshot) {
			vscode.window.showInformationMessage("No stats available yet. Try refreshing first.");
			return;
		}
		const config = getFAHConfig();
		await vscode.env.clipboard.writeText(buildClipboardText(lastSnapshot, config));
		vscode.window.showInformationMessage("Stats copied to clipboard.");
	});

	const openProfileCommand = vscode.commands.registerCommand("fah-stats.openProfile", async () => {
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
	});

	const pauseUpdatesCommand = vscode.commands.registerCommand("fah-stats.pauseUpdates", async () => {
		const config = vscode.workspace.getConfiguration("fahStats");
		const paused = config.get<boolean>("paused", false);
		await config.update("paused", !paused, true);
		const updatedConfig = getFAHConfig();
		if (updatedConfig.paused) {
			setStatus(
				"$(debug-pause) FAH: Paused",
				lastSnapshot
					? getTooltip(lastSnapshot, updatedConfig, true)
					: "Updates are paused. Toggle pause to resume fetching stats.",
			);
		} else {
			rescheduleInterval(updatedConfig);
			void updateStats(false);
		}
	});

	const welcomeCommand = vscode.commands.registerCommand("fah-stats.welcome", () => {
		void WelcomePage.show(context);
	});

	const resetCommand = vscode.commands.registerCommand("fah-stats.reset", async () => {
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
	});

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

	void updateStats(isInitialLoad);
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
		if (updatedConfig.paused) {
			setStatus(
				"$(debug-pause) FAH: Paused",
				lastSnapshot
					? getTooltip(lastSnapshot, updatedConfig, true)
					: "Updates are paused. Toggle pause to resume fetching stats.",
			);
			return;
		}
		void updateStats(false);
	});

	context.subscriptions.push({
		dispose: () => {
			clearIntervalIfSet();
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
