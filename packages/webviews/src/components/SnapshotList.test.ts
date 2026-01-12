import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";

// Mock VS Code messaging API used by the component
vi.mock("../lib/vscode", () => ({
  postMessage: vi.fn(),
  getVsCodeApi: () => ({
    postMessage: vi.fn(),
    getState: () => null,
    setState: () => {},
  }),
}));

import SnapshotList from "./SnapshotList.svelte";
import { postMessage } from "../lib/vscode";

const baseSnapshot = {
  ownerName: "Owner",
  isDeleted: false,
  createdDate: "2024-01-01T00:00:00.000Z",
  snapshotName: "Snapshot",
  sourceOrg: "00D000000000001",
  content: "Metadata",
  status: "Active",
  provider: "",
  providerSnapshot: "",
  error: "",
  providerSnapshotVersion: "",
  expirationDate: "2024-12-31T00:00:00.000Z",
  description: "Test snapshot",
} as const;

describe("SnapshotList component", () => {
  const devHubUsername = "devhub@example.com";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("selects snapshots and sends deleteSnapshots command with correct payload", async () => {
    const snapshots = [
      { id: "snap-1", ...baseSnapshot },
      { id: "snap-2", ...baseSnapshot, snapshotName: "Other snapshot" },
    ];

    render(SnapshotList, {
      snapshots,
      loading: false,
      error: null,
      unavailable: false,
      devHubUsername,
    });

    const checkboxes = screen.getAllByRole("checkbox", {
      name: /select snapshot for deletion/i,
    });

    // Select both snapshots
    await fireEvent.click(checkboxes[0]);
    await fireEvent.click(checkboxes[1]);

    // Delete button should reflect selected count
    const deleteButton = screen.getByRole("button", { name: /delete \(2\)/i });
    expect(deleteButton).toBeTruthy();

    // Trigger deletion
    await fireEvent.click(deleteButton);

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({
      command: "deleteSnapshots",
      snapshots: [
        { id: "snap-1", devHubUsername },
        { id: "snap-2", devHubUsername },
      ],
    });
  });

  it("does not send deleteSnapshots command when nothing is selected", async () => {
    const snapshots = [{ id: "snap-1", ...baseSnapshot }];

    render(SnapshotList, {
      snapshots,
      loading: false,
      error: null,
      unavailable: false,
      devHubUsername,
    });

    // There should be no delete button when nothing is selected
    const deleteButtons = screen.queryAllByRole("button", { name: /delete \(/i });
    expect(deleteButtons.length).toBe(0);

    expect(postMessage).not.toHaveBeenCalled();
  });
});
