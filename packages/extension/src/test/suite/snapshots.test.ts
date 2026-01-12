import * as assert from "assert";
import * as vscode from "vscode";

suite("DashboardPanel snapshot deletion", () => {
  function createDashboardPanelForTest() {
    // Require here so VS Code test environment is already initialized
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/naming-convention
    const { DashboardPanel } = require("../../DashboardPanel");

    const messages: any[] = [];

    const mockPanel: any = {
      webview: {
        postMessage: (message: unknown) => {
          messages.push(message);
        },
      },
      onDidDispose: () => ({ dispose: () => {} }),
    };

    // Bypass constructor so we don't need a real WebviewPanel
    const instance: any = Object.create(DashboardPanel.prototype);
    instance._panel = mockPanel;
    instance._extensionUri = vscode.Uri.file("/");

    return { instance, messages };
  }

  test("_deleteSnapshots prompts for confirmation and handles cancel", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { salesforceService } = require("../../services/SalesforceService");
    const { instance, messages } = createDashboardPanelForTest();

    const snapshots = [{ id: "snap-1", devHubUsername: "devhub@example.com" }];

    const originalShowWarningMessage = vscode.window.showWarningMessage;
    const originalShowInformationMessage = vscode.window.showInformationMessage;
    const originalShowWarning = vscode.window.showWarningMessage;
    const originalDeleteSnapshots = salesforceService.deleteSnapshots;

    let warningArgs: any[] | undefined;
    let infoCalls = 0;

    (vscode.window as any).showWarningMessage = async (...args: any[]) => {
      // First call is the confirmation dialog
      warningArgs = args;
      // Simulate user clicking the cancel/close button
      return undefined;
    };

    (vscode.window as any).showInformationMessage = async () => {
      infoCalls += 1;
      return undefined;
    };

    salesforceService.deleteSnapshots = async () => {
      throw new Error("deleteSnapshots should not be called when user cancels");
    };

    try {
      await instance._deleteSnapshots(snapshots);

      assert.ok(warningArgs, "showWarningMessage should be called for confirmation");
      const [message, options, button] = warningArgs!;
      assert.strictEqual(
        message,
        "Are you sure you want to delete 1 snapshot(s)?",
        "Confirmation message should mention snapshot count",
      );
      assert.deepStrictEqual(
        options,
        { modal: true },
        "Confirmation dialog should be modal",
      );
      assert.strictEqual(button, "Delete", "Confirmation button text should be 'Delete'");

      assert.strictEqual(
        infoCalls,
        0,
        "No information messages should be shown when user cancels",
      );

      assert.strictEqual(messages.length, 1, "One webview message should be sent on cancel");
      assert.deepStrictEqual(messages[0], { command: "snapshotsDeleteCancelled" });
    } finally {
      (vscode.window as any).showWarningMessage = originalShowWarningMessage;
      (vscode.window as any).showInformationMessage = originalShowInformationMessage;
      (vscode.window as any).showWarningMessage = originalShowWarning;
      salesforceService.deleteSnapshots = originalDeleteSnapshots;
    }
  });

  test("_deleteSnapshots deletes snapshots and reports success and failure", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { salesforceService } = require("../../services/SalesforceService");
    const { instance, messages } = createDashboardPanelForTest();

    const snapshots = [
      { id: "snap-success", devHubUsername: "devhub@example.com" },
      { id: "snap-fail", devHubUsername: "devhub@example.com" },
    ];

    const originalShowWarningMessage = vscode.window.showWarningMessage;
    const originalShowInformationMessage = vscode.window.showInformationMessage;
    const originalShowWarning = vscode.window.showWarningMessage;
    const originalDeleteSnapshots = salesforceService.deleteSnapshots;

    const warningCalls: any[][] = [];
    const infoCalls: any[][] = [];

    (vscode.window as any).showWarningMessage = async (...args: any[]) => {
      warningCalls.push(args);
      // First call is confirmation: simulate clicking "Delete"
      if (warningCalls.length === 1) {
        return "Delete" as any;
      }
      // Subsequent calls (e.g. failure notification) just resolve
      return undefined;
    };

    (vscode.window as any).showInformationMessage = async (...args: any[]) => {
      infoCalls.push(args);
      return undefined;
    };

    salesforceService.deleteSnapshots = async (input: any) => {
      assert.deepStrictEqual(
        input,
        snapshots,
        "_deleteSnapshots should pass the snapshots array to salesforceService.deleteSnapshots",
      );
      return {
        success: ["snap-success"],
        failed: [{ id: "snap-fail", error: "boom" }],
      };
    };

    try {
      await instance._deleteSnapshots(snapshots);

      // Confirmation was shown
      assert.ok(warningCalls.length >= 1, "Confirmation dialog should be shown");
      const [confirmMessage, confirmOptions, confirmButton] = warningCalls[0];
      assert.strictEqual(
        confirmMessage,
        "Are you sure you want to delete 2 snapshot(s)?",
      );
      assert.deepStrictEqual(confirmOptions, { modal: true });
      assert.strictEqual(confirmButton, "Delete");

      // Non-modal progress toast + success message
      assert.ok(infoCalls.length >= 2, "Information messages should be shown");
      const deletingMessage = infoCalls[0][0];
      const successMessage = infoCalls[1][0];
      assert.strictEqual(
        deletingMessage,
        "Deleting 2 snapshot(s)...",
        "Should show deleting progress message",
      );
      assert.strictEqual(
        successMessage,
        "Successfully deleted 1 snapshot(s)",
        "Should show success message for successful deletions",
      );

      // Failure warning
      assert.ok(warningCalls.length >= 2, "Failure warning should be shown");
      const failureMessage = warningCalls[1][0];
      assert.strictEqual(
        failureMessage,
        "Failed to delete 1 snapshot(s)",
        "Should show warning for failed deletions",
      );

      // Webview messages
      assert.deepStrictEqual(
        messages[0],
        { command: "snapshotsDeleteStarted" },
        "Should notify webview that deletion has started",
      );
      assert.deepStrictEqual(
        messages[1],
        {
          command: "snapshotsDeleteCompleted",
          success: ["snap-success"],
          failed: [{ id: "snap-fail", error: "boom" }],
        },
        "Should notify webview when deletion is complete with success and failed lists",
      );
    } finally {
      (vscode.window as any).showWarningMessage = originalShowWarningMessage;
      (vscode.window as any).showInformationMessage = originalShowInformationMessage;
      (vscode.window as any).showWarningMessage = originalShowWarning;
      salesforceService.deleteSnapshots = originalDeleteSnapshots;
    }
  });
});

suite("SalesforceService snapshot deletion", () => {
  test("deleteSnapshot calls execSfCommand with correct parameters", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { salesforceService } = require("../../services/SalesforceService");

    const originalExec = (salesforceService as any).execSfCommand;
    let capturedCommand: string | undefined;

    (salesforceService as any).execSfCommand = async (command: string) => {
      capturedCommand = command;
      // Simulate successful CLI execution
      return {};
    };

    try {
      await salesforceService.deleteSnapshot("snapshot-id", "devhub@example.com");

      assert.ok(capturedCommand, "execSfCommand should be called");
      assert.strictEqual(
        capturedCommand,
        'sf data delete record --sobject OrgSnapshot --record-id "snapshot-id" --target-org "devhub@example.com" --json',
        "deleteSnapshot should construct the expected sf CLI command",
      );
    } finally {
      (salesforceService as any).execSfCommand = originalExec;
    }
  });

  test("deleteSnapshots returns correct success and failed lists", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { salesforceService } = require("../../services/SalesforceService");

    const originalDeleteSnapshot = salesforceService.deleteSnapshot.bind(salesforceService);

    const calls: Array<{ id: string; devHubUsername: string }> = [];

    (salesforceService as any).deleteSnapshot = async (
      id: string,
      devHubUsername: string,
    ) => {
      calls.push({ id, devHubUsername });
      if (id === "snap-success") {
        return;
      }
      throw new Error("boom");
    };

    const snapshots = [
      { id: "snap-success", devHubUsername: "devhub-A" },
      { id: "snap-fail", devHubUsername: "devhub-B" },
    ];

    try {
      const result = await salesforceService.deleteSnapshots(snapshots);

      assert.deepStrictEqual(calls, [
        { id: "snap-success", devHubUsername: "devhub-A" },
        { id: "snap-fail", devHubUsername: "devhub-B" },
      ]);

      assert.deepStrictEqual(
        result.success,
        ["snap-success"],
        "Success list should contain only successful IDs",
      );
      assert.strictEqual(result.failed.length, 1, "One snapshot should be in failed list");
      assert.strictEqual(result.failed[0].id, "snap-fail");
      assert.ok(result.failed[0].error, "Failed entry should contain an error message");
    } finally {
      (salesforceService as any).deleteSnapshot = originalDeleteSnapshot;
    }
  });
});
