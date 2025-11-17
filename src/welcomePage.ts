import * as vscode from "vscode";

export class WelcomePage {
	private static currentPanel: vscode.WebviewPanel | undefined = undefined;

	public static show(context: vscode.ExtensionContext) {
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
				retainContextWhenHidden: true,
			},
		);

		WelcomePage.currentPanel = panel;

		// Get current configuration
		const config = vscode.workspace.getConfiguration("fahStats");
		const currentConfig = {
			userName: config.get<string>("userName", ""),
			teamName: config.get<string>("teamName", ""),
			passkey: config.get<string>("passkey", ""),
			refreshInterval: config.get<number>("refreshInterval", 300),
			showLastWork: config.get<boolean>("showLastWork", true),
		};

		panel.webview.html = WelcomePage.getWebviewContent(currentConfig);

		// Handle messages from the webview
		panel.webview.onDidReceiveMessage(
			async (message) => {
				switch (message.command) {
					case "saveConfig":
						await WelcomePage.saveConfiguration(message.data);
						vscode.window.showInformationMessage(
							"Folding@Home configuration saved successfully!",
						);
						panel.dispose();
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
	}

	private static async saveConfiguration(data: {
		userName: string;
		teamName: string;
		passkey: string;
		refreshInterval: number;
		showLastWork: boolean;
	}) {
		const config = vscode.workspace.getConfiguration("fahStats");
		await config.update("userName", data.userName, true);
		await config.update("teamName", data.teamName, true);
		await config.update("passkey", data.passkey, true);
		await config.update("refreshInterval", data.refreshInterval, true);
		await config.update("showLastWork", data.showLastWork, true);
	}

	private static getWebviewContent(config: {
		userName: string;
		teamName: string;
		passkey: string;
		refreshInterval: number;
		showLastWork: boolean;
	}): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Folding@Home Stats - Welcome</title>
	<style>
		* {
			box-sizing: border-box;
		}
		body {
			font-family: var(--vscode-font-family);
			padding: 0;
			margin: 0;
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
			display: flex;
			justify-content: center;
			align-items: center;
			min-height: 100vh;
		}
		.container {
			width: 100%;
			max-width: 600px;
			padding: 40px;
		}
		.header {
			margin-bottom: 32px;
			text-align: center;
		}
		.header h1 {
			margin: 0 0 12px 0;
			font-size: 24px;
			font-weight: 600;
			color: var(--vscode-foreground);
		}
		.header p {
			margin: 0;
			font-size: 13px;
			color: var(--vscode-descriptionForeground);
			line-height: 1.5;
		}
		.form-container {
			background-color: var(--vscode-input-background);
			border: 1px solid var(--vscode-input-border);
			border-radius: 4px;
			padding: 24px;
		}
		.form-group {
			margin-bottom: 20px;
		}
		.form-group:last-of-type {
			margin-bottom: 0;
		}
		label {
			display: block;
			margin-bottom: 6px;
			font-weight: 600;
			font-size: 13px;
			color: var(--vscode-foreground);
		}
		.required {
			color: var(--vscode-errorForeground);
			margin-left: 2px;
		}
		input[type="text"],
		input[type="password"],
		input[type="number"] {
			width: 100%;
			padding: 6px 8px;
			border: 1px solid var(--vscode-input-border);
			background-color: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			font-family: var(--vscode-font-family);
			font-size: 13px;
			border-radius: 2px;
			transition: border-color 0.2s;
		}
		input[type="text"]:focus,
		input[type="password"]:focus,
		input[type="number"]:focus {
			outline: none;
			border-color: var(--vscode-focusBorder);
		}
		input[type="checkbox"] {
			width: 16px;
			height: 16px;
			cursor: pointer;
			accent-color: var(--vscode-focusBorder);
		}
		.checkbox-group {
			display: flex;
			align-items: center;
			gap: 8px;
		}
		.checkbox-group label {
			margin-bottom: 0;
			cursor: pointer;
		}
		.help-text {
			font-size: 12px;
			color: var(--vscode-descriptionForeground);
			margin-top: 4px;
			line-height: 1.4;
		}
		.button-group {
			display: flex;
			gap: 8px;
			margin-top: 24px;
			justify-content: flex-end;
		}
		button {
			padding: 6px 14px;
			border: none;
			cursor: pointer;
			font-family: var(--vscode-font-family);
			font-size: 13px;
			border-radius: 2px;
			transition: background-color 0.2s;
		}
		button.primary {
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
		}
		button.primary:hover {
			background-color: var(--vscode-button-hoverBackground);
		}
		button.secondary {
			background-color: transparent;
			color: var(--vscode-foreground);
		}
		button.secondary:hover {
			background-color: var(--vscode-button-secondaryHoverBackground);
		}
		.error {
			color: var(--vscode-errorForeground);
			font-size: 12px;
			margin-top: 4px;
			display: none;
		}
		.error.show {
			display: block;
		}
		.input-with-suffix {
			display: flex;
			align-items: center;
			gap: 8px;
		}
		.input-with-suffix input {
			flex: 1;
		}
		.input-suffix {
			font-size: 12px;
			color: var(--vscode-descriptionForeground);
			white-space: nowrap;
		}
		a {
			color: var(--vscode-textLink-foreground);
			text-decoration: none;
		}
		a:hover {
			text-decoration: underline;
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>Welcome to Folding@Home Stats</h1>
			<p>Configure your Folding@Home details to start tracking your statistics in the VS Code status bar.</p>
			<p style="margin-top: 12px; font-size: 11px; opacity: 0.8;">
				Powered by <a href="https://foldingathome.org/" target="_blank" style="color: var(--vscode-textLink-foreground);">Folding@Home</a> • 
				Data provided by <a href="https://api2.foldingathome.org/" target="_blank" style="color: var(--vscode-textLink-foreground);">Folding@Home API</a>
			</p>
		</div>

		<div class="form-container">
			<form id="configForm">
				<div class="form-group">
					<label for="userName">User ID <span class="required">*</span></label>
					<input type="text" id="userName" name="userName" value="${WelcomePage.escapeHtml(config.userName)}" placeholder="Your Folding@Home user ID (e.g., 123456789)" required>
					<div class="help-text">Required: Your Folding@Home numeric user ID (used to fetch statistics from the API)</div>
					<div class="error" id="userNameError">User ID is required</div>
				</div>

				<div class="form-group">
					<label for="teamName">Preferred Team Name</label>
					<input type="text" id="teamName" name="teamName" value="${WelcomePage.escapeHtml(config.teamName)}" placeholder="Team name to track (optional)">
					<div class="help-text">Optional: If you're a member of multiple teams, specify which team to track. If not specified, the team with your largest contribution will be selected automatically.</div>
				</div>

				<div class="form-group">
					<label for="passkey">Passkey</label>
					<input type="password" id="passkey" name="passkey" value="${WelcomePage.escapeHtml(config.passkey)}" placeholder="Your Folding@Home passkey">
					<div class="help-text">Optional: Your Folding@Home passkey (will be partially masked in the status bar)</div>
				</div>

				<div class="form-group">
					<label for="refreshInterval">Refresh Interval</label>
					<div class="input-with-suffix">
						<input type="number" id="refreshInterval" name="refreshInterval" value="${config.refreshInterval}" min="10" step="1" required>
						<span class="input-suffix">seconds</span>
					</div>
					<div class="help-text">How often to refresh stats (default: 300 seconds = 5 minutes, minimum: 10 seconds)</div>
					<div class="error" id="intervalError">Interval must be at least 10 seconds</div>
				</div>

				<div class="form-group">
					<div class="checkbox-group">
						<input type="checkbox" id="showLastWork" name="showLastWork" ${config.showLastWork ? "checked" : ""}>
						<label for="showLastWork">Show last recorded work time in status bar</label>
					</div>
					<div class="help-text">Display when your last work unit was completed (e.g., "last work 12 minutes ago")</div>
				</div>

				<div class="button-group">
					<button type="button" class="secondary" id="cancelBtn">Cancel</button>
					<button type="submit" class="primary">Save Configuration</button>
				</div>
			</form>
		</div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		
		const form = document.getElementById('configForm');
		const cancelBtn = document.getElementById('cancelBtn');
		const userNameInput = document.getElementById('userName');
		const userNameError = document.getElementById('userNameError');
		const intervalInput = document.getElementById('refreshInterval');
		const intervalError = document.getElementById('intervalError');

		form.addEventListener('submit', (e) => {
			e.preventDefault();
			
			const userName = userNameInput.value.trim();
			if (!userName) {
				userNameError.classList.add('show');
				userNameInput.focus();
				return;
			}
			
			const interval = parseInt(intervalInput.value, 10);
			if (isNaN(interval) || interval < 10) {
				intervalError.classList.add('show');
				intervalInput.focus();
				return;
			}
			
			userNameError.classList.remove('show');
			intervalError.classList.remove('show');

			const formData = {
				userName: userName,
				teamName: document.getElementById('teamName').value.trim(),
				passkey: document.getElementById('passkey').value.trim(),
				refreshInterval: interval,
				showLastWork: document.getElementById('showLastWork').checked
			};

			vscode.postMessage({
				command: 'saveConfig',
				data: formData
			});
		});

		cancelBtn.addEventListener('click', () => {
			vscode.postMessage({
				command: 'cancel'
			});
		});

		userNameInput.addEventListener('input', () => {
			if (userNameInput.value.trim()) {
				userNameError.classList.remove('show');
			}
		});

		intervalInput.addEventListener('input', () => {
			const value = parseInt(intervalInput.value, 10);
			if (!isNaN(value) && value >= 10) {
				intervalError.classList.remove('show');
			}
		});
	</script>
</body>
</html>`;
	}

	private static escapeHtml(text: string): string {
		if (!text) {
			return "";
		}
		return text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}
}
