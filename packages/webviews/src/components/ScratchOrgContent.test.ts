import { describe, it, expect, beforeEach, vi } from "vitest";
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

import ScratchOrgContent from "./ScratchOrgContent.svelte";
import type { ScratchOrgInfo } from "../lib/types";
import * as exportUtils from "../lib/exportUtils";
import { postMessage } from "../lib/vscode";

describe("ScratchOrgContent export", () => {
  const devHubUsername = "devhub@example.com";
  const onretry = vi.fn();

  const baseOrg: Omit<ScratchOrgInfo, "id" | "username" | "orgId" | "instanceUrl"> = {
    alias: "",
    durationDays: 7,
    expirationDate: "2026-01-01T00:00:00.000Z",
    devHubUsername,
    createdDate: "2025-12-01T00:00:00.000Z",
    edition: "Enterprise",
    signupUsername: "",
    createdBy: "Me",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disables export when the filtered list is empty", () => {
    render(ScratchOrgContent, {
      scratchOrgs: [],
      loading: false,
      error: null,
      devHubUsername,
      onretry,
    });

    const exportButton = screen.getByRole("button", { name: /export/i });
    expect((exportButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("exports only the filtered visible orgs (JSON)", async () => {
    const scratchOrgs: ScratchOrgInfo[] = [
      {
        id: "org-1",
        username: "alpha@example.com",
        orgId: "00Dxx0000000001",
        instanceUrl: "https://alpha.my.salesforce.com",
        ...baseOrg,
        alias: "Alpha",
      },
      {
        id: "org-2",
        username: "beta@example.com",
        orgId: "00Dxx0000000002",
        instanceUrl: "https://beta.my.salesforce.com",
        ...baseOrg,
        alias: "Beta",
      },
    ];

    const jsonSpy = vi.spyOn(exportUtils, "scratchOrgsToJson");

    render(ScratchOrgContent, {
      scratchOrgs,
      loading: false,
      error: null,
      devHubUsername,
      onretry,
    });

    const search = screen.getByPlaceholderText(/search by username, alias, creator/i);
    await fireEvent.input(search, { target: { value: "alpha" } });

    const exportButton = screen.getByRole("button", { name: /export/i });
    expect((exportButton as HTMLButtonElement).disabled).toBe(false);

    await fireEvent.click(exportButton);

    const jsonItem = screen.getByRole("menuitem", { name: /json/i });
    await fireEvent.click(jsonItem);

    expect(jsonSpy).toHaveBeenCalledTimes(1);
    expect(jsonSpy.mock.calls[0][0]).toHaveLength(1);
    expect(jsonSpy.mock.calls[0][0][0].id).toBe("org-1");

    const expectedContent = JSON.stringify([scratchOrgs[0]], null, 2);
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect((postMessage as any).mock.calls[0][0].command).toBe("exportScratchOrgs");
    expect((postMessage as any).mock.calls[0][0].format).toBe("json");
    expect((postMessage as any).mock.calls[0][0].fileName).toMatch(/\.json$/);
    expect((postMessage as any).mock.calls[0][0].content).toBe(expectedContent);
  });
});

