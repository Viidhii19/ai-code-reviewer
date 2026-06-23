import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Starting RepoSage extension tests.");

  test("Extension should be present", () => {
    assert.ok(vscode.extensions.getExtension("reposage.reposage-vscode"));
  });

  test("Activate extension and check commands", async () => {
    const ext = vscode.extensions.getExtension("reposage.reposage-vscode");
    if (ext) {
      await ext.activate();
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes("reposage.reviewCurrentFile"));
    }
  });
});
