import * as vscode from "vscode";
import { BackendResponse, ReviewItem } from "./api";

export class RepoSageDiagnostics {
  private _collection: vscode.DiagnosticCollection;

  constructor() {
    this._collection =
      vscode.languages.createDiagnosticCollection("reposage");
  }

  public updateFromResponse(
    response: BackendResponse,
    targetFile: string
  ): void {
    this._collection.clear();

    const uri = vscode.Uri.file(targetFile);

    const fileReview = response.analysis?.fileReviews?.[targetFile];
    if (!fileReview) {
      this._collection.set(uri, []);
      return;
    }

    const diagnostics: vscode.Diagnostic[] = [];

    const addItems = (
      items: ReviewItem[],
      severity: vscode.DiagnosticSeverity,
      category: string
    ) => {
      for (const item of items) {
        const line = Math.max(0, item.line - 1);
        const range = new vscode.Range(line, 0, line, 65535);
        const diagnostic = new vscode.Diagnostic(
          range,
          `[${category}] ${item.description}`,
          severity
        );
        diagnostic.source = "RepoSage";
        diagnostic.code = item.type;
        if (item.suggestion) {
          diagnostic.message += `\nSuggestion: ${item.suggestion}`;
        }
        diagnostics.push(diagnostic);
      }
    };

    addItems(
      fileReview.security || [],
      vscode.DiagnosticSeverity.Error,
      "Security"
    );
    addItems(
      fileReview.bugs || [],
      vscode.DiagnosticSeverity.Error,
      "Bug"
    );
    addItems(
      fileReview.optimization || [],
      vscode.DiagnosticSeverity.Warning,
      "Optimization"
    );
    addItems(
      fileReview.styling || [],
      vscode.DiagnosticSeverity.Information,
      "Styling"
    );

    this._collection.set(uri, diagnostics);

    const count = diagnostics.length;
    if (count > 0) {
      vscode.window.showWarningMessage(
        `RepoSage found ${count} issue${count === 1 ? "" : "s"} in the current file.`
      );
    } else {
      vscode.window.showInformationMessage(
        "RepoSage found no issues in the current file."
      );
    }
  }

  public clear(): void {
    this._collection.clear();
  }

  public dispose(): void {
    this._collection.dispose();
  }
}
