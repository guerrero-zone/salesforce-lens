import { exec, ExecOptions } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export type OrgType = "Production" | "Sandbox" | "Scratch" | "Unknown";

export interface OrgInfo {
  username: string;
  orgId: string;
  instanceUrl: string;
  aliases: string[];
  isDevHub: boolean;
  connectedStatus: string;
  orgType: OrgType;
}

/**
 * Determine org type based on instanceUrl
 */
function determineOrgType(instanceUrl: string): OrgType {
  if (!instanceUrl) return "Unknown";
  const url = instanceUrl.toLowerCase();

  // Sandbox patterns
  if (url.includes(".sandbox.") || url.includes("--") || url.includes(".cs")) {
    return "Sandbox";
  }

  // Scratch org patterns (typically have .scratch. or test in subdomain)
  if (url.includes(".scratch.") || url.includes("test.salesforce.com")) {
    return "Scratch";
  }

  // Production patterns
  if (
    url.includes(".my.salesforce.com") ||
    url.includes(".lightning.force.com")
  ) {
    return "Production";
  }

  return "Unknown";
}

export interface ScratchOrgLimits {
  activeScratchOrgs: number;
  maxActiveScratchOrgs: number;
  dailyScratchOrgs: number;
  maxDailyScratchOrgs: number;
}

export interface DevHubInfo extends OrgInfo {
  limits: ScratchOrgLimits;
}

export interface ScratchOrgInfo {
  id: string; // The ScratchOrgInfo record Id (for deletion)
  username: string;
  orgId: string;
  instanceUrl: string;
  alias?: string;
  expirationDate: string;
  devHubUsername: string;
  status: string;
  createdDate: string;
  edition?: string;
  signupUsername?: string;
  createdBy?: string;
  isExpired: boolean;
}

interface SfOrgListResult {
  result: {
    devHubs?: Array<{
      username: string;
      orgId: string;
      instanceUrl: string;
      alias?: string;
      isDevHub: boolean;
      connectedStatus: string;
    }>;
    scratchOrgs?: Array<{
      username: string;
      orgId: string;
      instanceUrl: string;
      alias?: string;
      expirationDate: string;
      devHubUsername?: string;
      status: string;
      createdDate?: string;
      edition?: string;
      isExpired?: boolean;
      signupUsername?: string;
    }>;
    nonScratchOrgs?: Array<{
      username: string;
      orgId: string;
      instanceUrl: string;
      alias?: string;
      isDevHub: boolean;
      connectedStatus: string;
    }>;
  };
}

interface SfLimitsResult {
  result: Array<{
    name: string;
    max: number;
    remaining: number;
  }>;
}

interface SfScratchOrgListResult {
  result: {
    records: Array<{
      Id: string;
      OrgName?: string;
      SignupUsername: string;
      SignupEmail: string;
      Edition: string;
      Status: string;
      ExpirationDate: string;
      CreatedDate: string;
      CreatedBy?: {
        Name: string;
        Username: string;
      };
      ScratchOrg?: string;
    }>;
  };
}

export class SalesforceService {
  private execOptions: ExecOptions = {
    maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    timeout: 60000, // 60 second timeout
  };

  /**
   * Execute a Salesforce CLI command and return parsed JSON result
   */
  private async execSfCommand<T>(command: string): Promise<T> {
    try {
      const { stdout } = await execAsync(command, this.execOptions);
      return JSON.parse(stdout);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`SF CLI command failed: ${command}`, errorMessage);
      throw new Error(`Salesforce CLI command failed: ${errorMessage}`);
    }
  }

  /**
   * Get all authorized orgs from the CLI
   */
  async getAuthorizedOrgs(): Promise<{
    devHubs: OrgInfo[];
    scratchOrgs: ScratchOrgInfo[];
    otherOrgs: OrgInfo[];
  }> {
    const result = await this.execSfCommand<SfOrgListResult>(
      "sf org list --json"
    );

    // Map to collect DevHubs by username and merge their aliases
    const devHubMap = new Map<string, OrgInfo>();

    // Process devHubs array
    for (const org of result.result.devHubs || []) {
      const existing = devHubMap.get(org.username);
      if (existing) {
        // Add alias if it's new and not undefined
        if (org.alias && !existing.aliases.includes(org.alias)) {
          existing.aliases.push(org.alias);
        }
      } else {
        devHubMap.set(org.username, {
          username: org.username,
          orgId: org.orgId,
          instanceUrl: org.instanceUrl,
          aliases: org.alias ? [org.alias] : [],
          isDevHub: true,
          connectedStatus: org.connectedStatus,
          orgType: determineOrgType(org.instanceUrl),
        });
      }
    }

    // Also check nonScratchOrgs for DevHubs and merge aliases
    for (const org of result.result.nonScratchOrgs || []) {
      if (org.isDevHub) {
        const existing = devHubMap.get(org.username);
        if (existing) {
          if (org.alias && !existing.aliases.includes(org.alias)) {
            existing.aliases.push(org.alias);
          }
        } else {
          devHubMap.set(org.username, {
            username: org.username,
            orgId: org.orgId,
            instanceUrl: org.instanceUrl,
            aliases: org.alias ? [org.alias] : [],
            isDevHub: true,
            connectedStatus: org.connectedStatus,
            orgType: determineOrgType(org.instanceUrl),
          });
        }
      }
    }

    const devHubs = Array.from(devHubMap.values());

    const scratchOrgs: ScratchOrgInfo[] =
      result.result.scratchOrgs?.map((org) => ({
        id: org.orgId, // Using orgId as fallback, will be replaced with actual Id from query
        username: org.username,
        orgId: org.orgId,
        instanceUrl: org.instanceUrl,
        alias: org.alias,
        expirationDate: org.expirationDate,
        devHubUsername: org.devHubUsername || "",
        status: org.status,
        createdDate: org.createdDate || "",
        edition: org.edition,
        signupUsername: org.signupUsername,
        isExpired: org.isExpired || false,
      })) || [];

    const otherOrgs: OrgInfo[] =
      result.result.nonScratchOrgs
        ?.filter((org) => !org.isDevHub)
        .map((org) => ({
          username: org.username,
          orgId: org.orgId,
          instanceUrl: org.instanceUrl,
          aliases: org.alias ? [org.alias] : [],
          isDevHub: false,
          connectedStatus: org.connectedStatus,
          orgType: determineOrgType(org.instanceUrl),
        })) || [];

    return { devHubs, scratchOrgs, otherOrgs };
  }

  /**
   * Get just the list of DevHubs (without limits) - fast operation for sidebar
   */
  async getDevHubsList(): Promise<OrgInfo[]> {
    const { devHubs } = await this.getAuthorizedOrgs();
    return devHubs;
  }

  /**
   * Get scratch org limits for a specific DevHub
   */
  async getDevHubLimits(devHubUsername: string): Promise<ScratchOrgLimits> {
    try {
      const result = await this.execSfCommand<SfLimitsResult>(
        `sf org list limits --target-org "${devHubUsername}" --json`
      );

      const limits = result.result;
      const activeScratchOrgLimit = limits.find(
        (l) => l.name === "ActiveScratchOrgs"
      );
      const dailyScratchOrgLimit = limits.find(
        (l) => l.name === "DailyScratchOrgs"
      );

      return {
        activeScratchOrgs: activeScratchOrgLimit
          ? activeScratchOrgLimit.max - activeScratchOrgLimit.remaining
          : 0,
        maxActiveScratchOrgs: activeScratchOrgLimit?.max || 0,
        dailyScratchOrgs: dailyScratchOrgLimit
          ? dailyScratchOrgLimit.max - dailyScratchOrgLimit.remaining
          : 0,
        maxDailyScratchOrgs: dailyScratchOrgLimit?.max || 0,
      };
    } catch {
      console.warn(`Could not fetch limits for DevHub: ${devHubUsername}`);
      return {
        activeScratchOrgs: 0,
        maxActiveScratchOrgs: 0,
        dailyScratchOrgs: 0,
        maxDailyScratchOrgs: 0,
      };
    }
  }

  /**
   * Get all DevHubs with their limits
   */
  async getDevHubsWithLimits(): Promise<DevHubInfo[]> {
    const { devHubs } = await this.getAuthorizedOrgs();

    const devHubsWithLimits: DevHubInfo[] = await Promise.all(
      devHubs.map(async (devHub) => {
        const limits = await this.getDevHubLimits(devHub.username);
        return {
          ...devHub,
          limits,
        };
      })
    );

    return devHubsWithLimits;
  }

  /**
   * Get all scratch orgs for a specific DevHub (from the DevHub itself, not just local)
   */
  async getAllScratchOrgsForDevHub(
    devHubUsername: string
  ): Promise<ScratchOrgInfo[]> {
    try {
      const query = `SELECT Id, OrgName, SignupUsername, SignupEmail, Edition, Status, ExpirationDate, CreatedDate, CreatedBy.Name, CreatedBy.Username, ScratchOrg FROM ScratchOrgInfo WHERE Status != 'Deleted' ORDER BY CreatedDate DESC`;

      const result = await this.execSfCommand<SfScratchOrgListResult>(
        `sf data query --query "${query}" --target-org "${devHubUsername}" --json`
      );

      return result.result.records.map((record) => ({
        id: record.Id, // This is the ScratchOrgInfo record Id needed for deletion
        username: record.SignupUsername,
        orgId: record.ScratchOrg || record.Id,
        instanceUrl: "",
        alias: record.OrgName || undefined,
        expirationDate: record.ExpirationDate,
        devHubUsername,
        status: record.Status,
        createdDate: record.CreatedDate,
        edition: record.Edition,
        signupUsername: record.SignupUsername,
        createdBy: record.CreatedBy?.Name || record.CreatedBy?.Username,
        isExpired: new Date(record.ExpirationDate) < new Date(),
      }));
    } catch (error) {
      console.error(
        `Failed to fetch scratch orgs from DevHub ${devHubUsername}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete a scratch org by deleting the ActiveScratchOrg record from the DevHub
   * This works for any scratch org in the DevHub, not just locally authenticated ones
   */
  async deleteScratchOrg(
    scratchOrgId: string,
    devHubUsername: string
  ): Promise<void> {
    try {
      // First, find the ActiveScratchOrg record by the ScratchOrgInfo Id or ScratchOrg field
      const query = `SELECT Id FROM ActiveScratchOrg WHERE ScratchOrgInfoId = '${scratchOrgId}' OR ScratchOrg = '${scratchOrgId}'`;

      const result = await this.execSfCommand<{
        result: { records: Array<{ Id: string }> };
      }>(
        `sf data query --query "${query}" --target-org "${devHubUsername}" --json`
      );

      if (result.result.records.length === 0) {
        // If no ActiveScratchOrg found, try to mark the ScratchOrgInfo as deleted
        // by using sf org delete scratch if the org is locally authenticated
        try {
          await this.execSfCommand(
            `sf org delete scratch --target-org "${scratchOrgId}" --target-dev-hub "${devHubUsername}" --no-prompt --json`
          );
          return;
        } catch {
          throw new Error(
            `No ActiveScratchOrg record found for ${scratchOrgId}`
          );
        }
      }

      const activeScratchOrgId = result.result.records[0].Id;

      // Delete the ActiveScratchOrg record - this will mark the scratch org for deletion
      await this.execSfCommand(
        `sf data delete record --sobject ActiveScratchOrg --record-id "${activeScratchOrgId}" --target-org "${devHubUsername}" --json`
      );
    } catch (error) {
      console.error(`Failed to delete scratch org ${scratchOrgId}:`, error);
      throw error;
    }
  }

  /**
   * Delete multiple scratch orgs
   */
  async deleteScratchOrgs(
    scratchOrgs: Array<{ id: string; devHubUsername: string }>
  ): Promise<{
    success: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const success: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const org of scratchOrgs) {
      try {
        await this.deleteScratchOrg(org.id, org.devHubUsername);
        success.push(org.id);
      } catch (error) {
        failed.push({
          id: org.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { success, failed };
  }
}

// Singleton instance
export const salesforceService = new SalesforceService();
