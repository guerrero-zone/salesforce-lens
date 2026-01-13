import { describe, it, expect } from "vitest";
import type { ScratchOrgInfo } from "./types";
import { scratchOrgsToCsv, scratchOrgsToJson, safeFileNamePart } from "./exportUtils";

describe("exportUtils", () => {
  it("serializes scratch orgs to JSON (pretty printed)", () => {
    const orgs: ScratchOrgInfo[] = [
      {
        id: "1",
        username: "user@example.com",
        orgId: "00Dxx0000000001",
        instanceUrl: "https://example.my.salesforce.com",
        alias: "My Org",
        durationDays: 7,
        expirationDate: "2026-01-01T00:00:00.000Z",
        devHubUsername: "devhub@example.com",
        createdDate: "2025-12-01T00:00:00.000Z",
        edition: "Enterprise",
        signupUsername: "signup@example.com",
        createdBy: "Me",
      },
    ];

    expect(scratchOrgsToJson(orgs)).toBe(JSON.stringify(orgs, null, 2));
  });

  it("serializes scratch orgs to CSV with escaping", () => {
    const orgs: ScratchOrgInfo[] = [
      {
        id: "1",
        username: 'user,with,comma@example.com',
        orgId: "00Dxx0000000001",
        instanceUrl: "https://example.my.salesforce.com",
        alias: 'Alias "quoted"\nnew line',
        durationDays: 7,
        expirationDate: "2026-01-01T00:00:00.000Z",
        devHubUsername: "devhub@example.com",
        createdDate: "2025-12-01T00:00:00.000Z",
        edition: "Enterprise",
        signupUsername: "",
        createdBy: "",
      },
    ];

    const csv = scratchOrgsToCsv(orgs);
    const header = csv.split("\n")[0];

    // Header should include known columns
    expect(header).toContain("alias");
    expect(header).toContain("username");
    expect(header).toContain("expirationDate");

    // Values with commas/quotes/newlines must be quoted + quotes doubled
    expect(csv).toContain('"user,with,comma@example.com"');
    expect(csv).toContain('"Alias ""quoted""\nnew line"');
  });

  it("sanitizes filename parts safely", () => {
    expect(safeFileNamePart("devhub@example.com")).toBe("devhub_example.com");
    expect(safeFileNamePart("   ")).toBe("unknown");
    expect(safeFileNamePart("a/b\\c:d*e?f")).toBe("a_b_c_d_e_f");
  });
});

