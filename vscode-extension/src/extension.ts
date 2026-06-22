import * as vscode from "vscode";
import { RepoSageWebviewProvider } from "./webviewProvider";
import { reviewFileContent } from "./api";

function getConfig() {
  return vscode.workspace.getConfiguration("reposage");
}

function updateApiKeyStatusBar(statusBarItem: vscode.StatusBarItem) {
  const apiKey = getConfig().get<string>("apiKey", "");
  if (apiKey) {
    statusBarItem.text = "$(key) RepoSage: Connected";
    statusBarItem.tooltip = "RepoSage API key is configured";
    statusBarItem.backgroundColor = undefined;
  } else {
    statusBarItem.text = "$(warning) RepoSage: No API Key";
    statusBarItem.tooltip = "Click to configure your RepoSage API key";
    statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground"
    );
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log("RepoSage extension is now active!");

  const provider = new RepoSageWebviewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      RepoSageWebviewProvider.viewType,
      provider
    )
  );

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = "reposage.configureApiKey";
  updateApiKeyStatusBar(statusBarItem);
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(
    vscode.commands.registerCommand("reposage.configureApiKey", async () => {
      const currentKey = getConfig().get<string>("apiKey", "");
      const key = await vscode.window.showInputBox({
        prompt: "Enter your RepoSage API key",
        password: true,
        placeHolder: "reposage_api_...",
        value: currentKey || undefined,
        ignoreFocusOut: true,
        validateInput: (value: string) => {
          if (value && value.length < 8) {
            return "API key must be at least 8 characters";
          }
          return null;
        },
      });

      if (key !== undefined) {
        const config = getConfig();
        if (key === "") {
          await config.update("apiKey", undefined, vscode.ConfigurationTarget.Global);
          vscode.window.showInformationMessage("RepoSage API key has been cleared.");
        } else {
          await config.update("apiKey", key, vscode.ConfigurationTarget.Global);
          vscode.window.showInformationMessage("RepoSage API key has been configured successfully!");
        }
        updateApiKeyStatusBar(statusBarItem);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "reposage.reviewCurrentFile",
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showInformationMessage(
            "Open a file to review it with RepoSage."
          );
          return;
        }

        const document = editor.document;
        const fileName = document.fileName;
        const fileContent = document.getText();

        provider.setLoading(true);
        vscode.window.showInformationMessage(
          `RepoSage: Reviewing ${fileName}...`
        );

        const result = await reviewFileContent(fileName, fileContent);

        if (result.success) {
          console.log("RepoSage review result:", result.response);
          provider.setContent(result.response || "");
          vscode.window.showInformationMessage(
            "RepoSage review complete! Check the sidebar for details."
          );
        } else {
          provider.setError(result.error || "Unknown error");
          vscode.window.showErrorMessage(
            `RepoSage review failed: ${result.error}`
          );
        }
        provider.setLoading(false);
      }
    )
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("reposage.apiKey")) {
        updateApiKeyStatusBar(statusBarItem);
      }
    })
  );
}

export function deactivate() {}
