import { readFileSync } from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

export class WelcomePage {
	private static currentPanel: vscode.WebviewPanel | undefined = undefined;

	public static async show(context: vscode.ExtensionContext) {
		const columnToShowIn = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		if (WelcomePage.currentPanel) {
			WelcomePage.currentPanel.reveal(columnToShowIn);
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			"fahStatsWelcome",
			"Folding@Home Stats - Welcome",
			columnToShowIn || vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: false,
				localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "media")],
			},
		);

		WelcomePage.currentPanel = panel;

		const config = vscode.workspace.getConfiguration("fahStats");
		const storedPasskey = await context.secrets.get("fahStats.passkey");
		const currentConfig = {
			userId: config.get<string>("userId", ""),
			teamName: config.get<string>("teamName", ""),
			refreshInterval: config.get<number>("refreshInterval", 300),
			showLastWork: config.get<boolean>("showLastWork", true),
			showTeamInfo: config.get<boolean>("showTeamInfo", true),
			compactStatusBar: config.get<boolean>("compactStatusBar", false),
			tooltipFormat: config.get<"plain" | "markdown">("tooltipFormat", "markdown"),
			passkeyStored: Boolean(storedPasskey),
		};

		panel.webview.html = WelcomePage.getWebviewContent(context, panel.webview);

		panel.webview.onDidReceiveMessage(
			async (message) => {
				switch (message.command) {
					case "saveConfig":
						await WelcomePage.saveConfiguration(context, message.data);
						vscode.window.showInformationMessage("Folding@Home configuration saved successfully!");
						panel.dispose();
						break;
					case "ready":
						void panel.webview.postMessage({
							command: "init",
							data: currentConfig,
						});
						break;
					case "cancel":
						panel.dispose();
						break;
				}
			},
			undefined,
			context.subscriptions,
		);

		panel.onDidDispose(
			() => {
				WelcomePage.currentPanel = undefined;
			},
			null,
			context.subscriptions,
		);

		panel.onDidChangeViewState(
			(e) => {
				if (!e.webviewPanel.visible) {
					e.webviewPanel.dispose();
				}
			},
			null,
			context.subscriptions,
		);
	}

	private static async saveConfiguration(
		context: vscode.ExtensionContext,
		data: {
			userId: string;
			teamName: string;
			passkey: string;
			refreshInterval: number;
			showLastWork: boolean;
			showTeamInfo: boolean;
			compactStatusBar: boolean;
			tooltipFormat: "plain" | "markdown";
		},
	) {
		const config = vscode.workspace.getConfiguration("fahStats");
		await config.update("userId", data.userId, true);
		await config.update("teamName", data.teamName, true);
		await config.update("refreshInterval", data.refreshInterval, true);
		await config.update("showLastWork", data.showLastWork, true);
		await config.update("showTeamInfo", data.showTeamInfo, true);
		await config.update("compactStatusBar", data.compactStatusBar, true);
		await config.update("tooltipFormat", data.tooltipFormat, true);

		const passkey = data.passkey.trim();
		if (passkey.length > 0) {
			await context.secrets.store("fahStats.passkey", passkey);
		} else {
			await context.secrets.delete("fahStats.passkey");
		}
	}

	private static getWebviewContent(
		context: vscode.ExtensionContext,
		webview: vscode.Webview,
	): string {
		const htmlPath = path.join(context.extensionPath, "media", "welcome.html");
		const rawHtml = readFileSync(htmlPath, "utf8");
		const nonce = WelcomePage.createNonce();
		return rawHtml.replace(/__NONCE__/g, nonce).replace(/__CSP_SOURCE__/g, webview.cspSource);
	}

	private static createNonce(): string {
		let text = "";
		const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for (let i = 0; i < 32; i += 1) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}
}
