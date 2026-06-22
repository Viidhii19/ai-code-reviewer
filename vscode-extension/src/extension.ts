import * as vscode from "vscode";
import { reviewFileContent, BackendResponse } from "./api";
import { RepoSageDiagnostics } from "./diagnostics";
import { RepoSageWebviewProvider } from "./webviewProvider";

export function activate(context: vscode.ExtensionContext) {
  console.log("RepoSage extension is now active!");

  const diagnostics = new RepoSageDiagnostics();
  context.subscriptions.push(diagnostics);

  const provider = new RepoSageWebviewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      RepoSageWebviewProvider.viewType,
      provider
    )
  );

  const disposable = vscode.commands.registerCommand(
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

      diagnostics.clear();
      provider.setLoading(true);
      vscode.window.showInformationMessage(
        `RepoSage: Reviewing ${fileName}...`
      );

      const result = await reviewFileContent(fileName, fileContent);

      if (result.success && result.response) {
        try {
          const parsed = JSON.parse(result.response) as BackendResponse;
          diagnostics.updateFromResponse(parsed, fileName);
        } catch {
          vscode.window.showErrorMessage(
            "RepoSage received an unexpected response format."
          );
        }
        provider.setContent(result.response);
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
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
