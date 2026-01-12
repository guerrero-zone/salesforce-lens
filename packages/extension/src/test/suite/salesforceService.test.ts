import * as assert from "assert";

// These tests focus on the higher–risk logic in SalesforceService: how it
// shapes org data from the CLI, how it parses limits/snapshots responses, and
// how its caching behaves. They use the same Mocha TDD style as the existing
// extension tests.

suite("SalesforceService – getAuthorizedOrgs", () => {
  test("merges DevHubs from multiple sources and deduplicates aliases", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { salesforceService } = require("../../services/SalesforceService");
    const service: any = salesforceService;

    const originalExec = service.execSfCommand;

    let receivedCommand: string | undefined;
    service.execSfCommand = async (command: string) => {
      receivedCommand = command;
      return {
        result: {
          devHubs: [
            {
              username: "devhub@example.com",
              orgId: "00D000000000001",
              instanceUrl: "https://my.my.salesforce.com",
              alias: "devhub-alias-1",
              isDevHub: true,
              connectedStatus: "Connected",
            },
          ],
          // Same DevHub also appears in nonScratchOrgs with a different alias
          nonScratchOrgs: [
            {
              username: "devhub@example.com",
              orgId: "00D000000000001",
              instanceUrl: "https://my.my.salesforce.com",
              alias: "devhub-alias-2",
              isDevHub: true,
              connectedStatus: "Connected",
            },
            {
              username: "regular@example.com",
              orgId: "00D000000000002",
              // Typical sandbox hostnames include a double‑dash (e.g. MySandbox--dev.my.salesforce.com),
              // which is what determineOrgType() looks for.
              instanceUrl: "https://mycompany--sandbox.my.salesforce.com",
              alias: "regular",
              isDevHub: false,
              connectedStatus: "Connected",
            },
          ],
          scratchOrgs: [
            {
              username: "scratch@example.com",
              orgId: "00D000000000003",
              instanceUrl: "https://test.salesforce.com",
              alias: "scratch-alias",
              expirationDate: "2024-01-01T00:00:00.000Z",
              devHubUsername: "devhub@example.com",
              status: "Active",
              createdDate: "2023-12-31T00:00:00.000Z",
              edition: "Enterprise",
              isExpired: false,
              signupUsername: "signup@example.com",
            },
          ],
        },
      };
    };

    try {
      // Ensure we are not using any stale cache from previous tests
      salesforceService.invalidateCache();

      const result = await salesforceService.getAuthorizedOrgs(true);

      assert.strictEqual(
        receivedCommand,
        "sf org list --json",
        "getAuthorizedOrgs should call the expected sf CLI command",
      );

      // DevHubs
      assert.strictEqual(result.devHubs.length, 1, "Should have a single DevHub");
      const devHub = result.devHubs[0];
      assert.strictEqual(devHub.username, "devhub@example.com");
      assert.strictEqual(devHub.orgId, "00D000000000001");
      assert.deepStrictEqual(
        devHub.aliases.sort(),
        ["devhub-alias-1", "devhub-alias-2"].sort(),
        "Aliases from devHubs and nonScratchOrgs should be merged without duplicates",
      );
      assert.strictEqual(devHub.isDevHub, true);
      assert.strictEqual(devHub.connectedStatus, "Connected");
      assert.strictEqual(
        devHub.orgType,
        "Production",
        "Org type should be derived from the instance URL",
      );

      // Scratch orgs mapping
      assert.strictEqual(
        result.scratchOrgs.length,
        1,
        "Scratch orgs from CLI should be mapped into ScratchOrgInfo",
      );
      const scratch = result.scratchOrgs[0];
      assert.strictEqual(
        scratch.id,
        "00D000000000003",
        "ScratchOrgInfo id should default to orgId from the CLI result",
      );
      assert.strictEqual(scratch.username, "scratch@example.com");
      assert.strictEqual(scratch.devHubUsername, "devhub@example.com");

      // Other orgs mapping
      assert.strictEqual(
        result.otherOrgs.length,
        1,
        "Non‑DevHub nonScratchOrgs should be exposed as otherOrgs",
      );
      const other = result.otherOrgs[0];
      assert.strictEqual(other.username, "regular@example.com");
      assert.strictEqual(other.isDevHub, false);
      assert.deepStrictEqual(other.aliases, ["regular"]);
      assert.strictEqual(other.orgType, "Sandbox");
    } finally {
      service.execSfCommand = originalExec;
      salesforceService.invalidateCache();
    }
  });
});

suite("SalesforceService – getDevHubLimits", () => {
  test("builds correct CLI command and parses limits", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { salesforceService } = require("../../services/SalesforceService");
    const service: any = salesforceService;

    const originalExec = service.execSfCommand;
    const calls: string[] = [];

    service.execSfCommand = async (command: string) => {
      calls.push(command);
      return {
        result: [
          { name: "ActiveScratchOrgs", max: 40, remaining: 35 },
          { name: "DailyScratchOrgs", max: 80, remaining: 75 },
        ],
      };
    };

    try {
      salesforceService.invalidateCache();

      const limits = await salesforceService.getDevHubLimits("devhub@example.com", true);

      assert.strictEqual(calls.length, 1, "Exactly one CLI call should be made");
      assert.strictEqual(
        calls[0],
        'sf org list limits --target-org "devhub@example.com" --json',
        "getDevHubLimits should construct the expected sf CLI command",
      );

      assert.deepStrictEqual(limits, {
        activeScratchOrgs: 5, // 40 - 35
        maxActiveScratchOrgs: 40,
        dailyScratchOrgs: 5, // 80 - 75
        maxDailyScratchOrgs: 80,
      });
    } finally {
      service.execSfCommand = originalExec;
      salesforceService.invalidateCache();
    }
  });

  test("returns zeroed limits when CLI fails", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { salesforceService } = require("../../services/SalesforceService");
    const service: any = salesforceService;

    const originalExec = service.execSfCommand;
    let callCount = 0;

    service.execSfCommand = async () => {
      callCount += 1;
      throw new Error("simulated failure");
    };

    try {
      salesforceService.invalidateCache();

      const limits = await salesforceService.getDevHubLimits("devhub@example.com", true);

      assert.strictEqual(callCount, 1, "CLI should be attempted once");
      assert.deepStrictEqual(limits, {
        activeScratchOrgs: 0,
        maxActiveScratchOrgs: 0,
        dailyScratchOrgs: 0,
        maxDailyScratchOrgs: 0,
      });
    } finally {
      service.execSfCommand = originalExec;
      salesforceService.invalidateCache();
    }
  });
});

suite("SalesforceService – getSnapshotsInfo caching and unavailable status", () => {
  test("marks snapshots as unavailable on OrgSnapshot access errors and caches the result", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { salesforceService } = require("../../services/SalesforceService");
    const service: any = salesforceService;

    const originalExec = service.execSfCommand;
    let callCount = 0;

    service.execSfCommand = async () => {
      callCount += 1;
      const error: any = new Error(
        "sObject type 'OrgSnapshot' is not supported",
      );
      throw error;
    };

    try {
      salesforceService.invalidateCache();

      const first = await salesforceService.getSnapshotsInfo("devhub@example.com", false);
      assert.strictEqual(first.status, "unavailable");
      assert.strictEqual(first.activeCount, 0);
      assert.strictEqual(first.totalCount, 0);
      assert.strictEqual(
        callCount,
        1,
        "First call should invoke the CLI (and then cache the unavailable status)",
      );

      const second = await salesforceService.getSnapshotsInfo("devhub@example.com", false);
      assert.strictEqual(second.status, "unavailable");
      assert.strictEqual(second.activeCount, 0);
      assert.strictEqual(second.totalCount, 0);
      assert.strictEqual(
        callCount,
        1,
        "Second call should use the cache and not hit the CLI again",
      );
    } finally {
      service.execSfCommand = originalExec;
      salesforceService.invalidateCache();
    }
  });
});