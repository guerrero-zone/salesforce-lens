import { exec, ExecOptions } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Simple in-memory cache with TTL support
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isRefreshing?: boolean;
}

class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;

  constructor(ttlSeconds: number = 30) {
    this.ttlMs = ttlSeconds * 1000;
  }

  get(key: string): { data: T; isStale: boolean } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isStale = Date.now() - entry.timestamp > this.ttlMs;
    return { data: entry.data, isStale };
  }

  set(key: string, data: T, timestamp: number = Date.now()): void {
    this.cache.set(key, {
      data,
      timestamp,
    });
  }

  markRefreshing(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.isRefreshing = true;
    }
  }

  isRefreshing(key: string): boolean {
    return this.cache.get(key)?.isRefreshing ?? false;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}

export type OrgType = "Production" | "Sandbox" | "Scratch" | "Unknown";

export interface OrgInfo {
  username: string;
  orgId: string;
  instanceUrl: string;
  aliases: string[];
  isDevHub: boolean;
  connectedStatus: string;
  orgType: OrgType;
  edition?: string;
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
      DurationDays: number;
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

interface SfOrganizationQueryResult {
  result: {
    records: Array<{
      OrganizationType: string;
    }>;
  };
}

export interface SnapshotInfo {
  id: string;
  ownerName: string;
  isDeleted: boolean;
  createdDate: string;
  snapshotName: string;
  sourceOrg: string;
  content: string;
  status: string;
  provider: string;
  providerSnapshot: string;
  error: string;
  providerSnapshotVersion: string;
  expirationDate: string;
  description: string;
}

export interface SnapshotsInfo {
  status: "available" | "unavailable" | "loading";
  activeCount: number;
  totalCount: number;
}

interface SfSnapshotQueryResult {
  result: {
    records: Array<{
      Id: string;
      "Owner.Name"?: string;
      Owner?: {
        Name: string;
      };
      IsDeleted: boolean;
      CreatedDate: string;
      SnapshotName: string;
      SourceOrg: string;
      Content?: string;
      Status: string;
      Provider?: string;
      ProviderSnapshot?: string;
      Error?: string;
      ProviderSnapshotVersion?: string;
      ExpirationDate?: string;
      Description?: string;
    }>;
    totalSize: number;
  };
}

interface SfSnapshotCountResult {
  result: {
    records: Array<{
      expr0: number;
    }>;
    totalSize: number;
  };
}

// Callback types for streaming updates
export type DevHubsLoadedCallback = (devHubs: OrgInfo[]) => void;
export type EditionLoadedCallback = (
  username: string,
  edition: string | undefined
) => void;
export type LimitsLoadedCallback = (
  username: string,
  limits: ScratchOrgLimits,
  error?: boolean
) => void;
export type SnapshotsInfoLoadedCallback = (
  username: string,
  snapshotsInfo: SnapshotsInfo
) => void;

export class SalesforceService {
  private execOptions: ExecOptions = {
    maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    timeout: 60000, // 60 second timeout
  };

  // Optional persistent cache directory (provided by extension host)
  private storageDir?: string;

  // Caches with appropriate TTLs
  private orgsCache = new SimpleCache<{
    devHubs: OrgInfo[];
    scratchOrgs: ScratchOrgInfo[];
    otherOrgs: OrgInfo[];
  }>(60); // 60 seconds for org list
  private limitsCache = new SimpleCache<ScratchOrgLimits>(30); // 30 seconds for limits
  private snapshotsInfoCache = new SimpleCache<SnapshotsInfo>(60); // 60 seconds for snapshots info
  private editionsCache = new SimpleCache<string | undefined>(300); // 5 minutes for editions (rarely changes)

  /**
   * Provide a directory path for persistent caching (usually VS Code globalStorageUri.fsPath).
   * This enables fast cold-start by hydrating in-memory cache from disk.
   */
  setStorageDir(storageDir: string): void {
    this.storageDir = storageDir;
    try {
      fs.mkdirSync(storageDir, { recursive: true });
    } catch (error) {
      console.warn("Could not create storage directory for cache:", error);
      this.storageDir = undefined;
    }
  }

  private getOrgsCacheFilePath(): string | undefined {
    if (!this.storageDir) return undefined;
    return path.join(this.storageDir, "orgs-cache.json");
  }

  private loadPersistedOrgsCache(): {
    timestamp: number;
    data: {
      devHubs: OrgInfo[];
      scratchOrgs: ScratchOrgInfo[];
      otherOrgs: OrgInfo[];
    };
  } | null {
    const filePath = this.getOrgsCacheFilePath();
    if (!filePath) return null;
    try {
      if (!fs.existsSync(filePath)) return null;
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw) as {
        timestamp: number;
        data: {
          devHubs: OrgInfo[];
          scratchOrgs: ScratchOrgInfo[];
          otherOrgs: OrgInfo[];
        };
      };

      if (!parsed || typeof parsed.timestamp !== "number" || !parsed.data)
        return null;
      if (!Array.isArray(parsed.data.devHubs)) return null;
      if (!Array.isArray(parsed.data.scratchOrgs)) return null;
      if (!Array.isArray(parsed.data.otherOrgs)) return null;
      return parsed;
    } catch (error) {
      console.warn("Failed to load persisted orgs cache:", error);
      return null;
    }
  }

  private savePersistedOrgsCache(data: {
    devHubs: OrgInfo[];
    scratchOrgs: ScratchOrgInfo[];
    otherOrgs: OrgInfo[];
  }): void {
    const filePath = this.getOrgsCacheFilePath();
    if (!filePath) return;
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(
        filePath,
        JSON.stringify({ timestamp: Date.now(), data }, null, 2),
        "utf8"
      );
    } catch (error) {
      console.warn("Failed to save persisted orgs cache:", error);
    }
  }

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
   * Invalidate all caches (useful when data changes, e.g., after delete)
   */
  invalidateCache(): void {
    this.orgsCache.invalidateAll();
    this.limitsCache.invalidateAll();
    this.snapshotsInfoCache.invalidateAll();
  }

  /**
   * Get all authorized orgs from the CLI (with caching)
   */
  async getAuthorizedOrgs(forceRefresh = false): Promise<{
    devHubs: OrgInfo[];
    scratchOrgs: ScratchOrgInfo[];
    otherOrgs: OrgInfo[];
  }> {
    const cacheKey = "orgs";

    // Check cache first
    if (!forceRefresh) {
      const cached = this.orgsCache.get(cacheKey);
      if (cached && !cached.isStale) {
        return cached.data;
      }
    }

    // Cold-start optimization: hydrate from persisted cache on disk
    if (!forceRefresh) {
      const persisted = this.loadPersistedOrgsCache();
      if (persisted) {
        this.orgsCache.set(cacheKey, persisted.data, persisted.timestamp);

        // If persisted data is stale, refresh in background to keep UI snappy
        const inMemory = this.orgsCache.get(cacheKey);
        if (inMemory?.isStale && !this.orgsCache.isRefreshing(cacheKey)) {
          this.orgsCache.markRefreshing(cacheKey);
          this.getAuthorizedOrgs(true)
            .then(() => {
              // no-op; getAuthorizedOrgs(true) updates caches + persisted cache
            })
            .catch((error) => {
              console.warn("Background org refresh failed:", error);
            });
        }

        return persisted.data;
      }
    }

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

    const data = { devHubs, scratchOrgs, otherOrgs };
    this.orgsCache.set(cacheKey, data);
    this.savePersistedOrgsCache(data);
    return data;
  }

  /**
   * Get the edition of an org by querying the Organization object (with caching)
   */
  async getOrgEdition(username: string): Promise<string | undefined> {
    // Check cache first
    const cached = this.editionsCache.get(username);
    if (cached && !cached.isStale) {
      return cached.data;
    }

    try {
      const query = "SELECT OrganizationType FROM Organization LIMIT 1";
      const result = await this.execSfCommand<SfOrganizationQueryResult>(
        `sf data query --query "${query}" --target-org "${username}" --json`
      );

      let edition: string | undefined;
      if (result.result.records.length > 0) {
        edition = result.result.records[0].OrganizationType;
      }
      this.editionsCache.set(username, edition);
      return edition;
    } catch {
      console.warn(`Could not fetch edition for org: ${username}`);
      this.editionsCache.set(username, undefined);
      return undefined;
    }
  }

  /**
   * Get just the list of DevHubs (without limits) - fast operation for sidebar
   */
  async getDevHubsList(): Promise<OrgInfo[]> {
    const { devHubs } = await this.getAuthorizedOrgs();
    return devHubs;
  }

  /**
   * Get just the list of DevHubs with their editions - for sidebar
   */
  async getDevHubsListWithEdition(): Promise<OrgInfo[]> {
    const { devHubs } = await this.getAuthorizedOrgs();

    // Fetch editions in parallel
    const devHubsWithEdition = await Promise.all(
      devHubs.map(async (devHub) => {
        const edition = await this.getOrgEdition(devHub.username);
        return {
          ...devHub,
          edition,
        };
      })
    );

    return devHubsWithEdition;
  }

  /**
   * Get scratch org limits for a specific DevHub (with caching)
   */
  async getDevHubLimits(
    devHubUsername: string,
    forceRefresh = false
  ): Promise<ScratchOrgLimits> {
    const cacheKey = `limits:${devHubUsername}`;

    // Check cache first
    if (!forceRefresh) {
      const cached = this.limitsCache.get(cacheKey);
      if (cached && !cached.isStale) {
        return cached.data;
      }
    }

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

      const data: ScratchOrgLimits = {
        activeScratchOrgs: activeScratchOrgLimit
          ? activeScratchOrgLimit.max - activeScratchOrgLimit.remaining
          : 0,
        maxActiveScratchOrgs: activeScratchOrgLimit?.max || 0,
        dailyScratchOrgs: dailyScratchOrgLimit
          ? dailyScratchOrgLimit.max - dailyScratchOrgLimit.remaining
          : 0,
        maxDailyScratchOrgs: dailyScratchOrgLimit?.max || 0,
      };

      this.limitsCache.set(cacheKey, data);
      return data;
    } catch {
      console.warn(`Could not fetch limits for DevHub: ${devHubUsername}`);
      const fallback: ScratchOrgLimits = {
        activeScratchOrgs: 0,
        maxActiveScratchOrgs: 0,
        dailyScratchOrgs: 0,
        maxDailyScratchOrgs: 0,
      };
      return fallback;
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
      const query = `SELECT Id, OrgName, SignupUsername, SignupEmail, Edition, Status, DurationDays, ExpirationDate, CreatedDate, CreatedBy.Name, CreatedBy.Username, ScratchOrg FROM ScratchOrgInfo WHERE Status != 'Deleted' ORDER BY CreatedDate DESC`;

      const result = await this.execSfCommand<SfScratchOrgListResult>(
        `sf data query --query "${query}" --target-org "${devHubUsername}" --json`
      );

      return result.result.records.map((record) => ({
        id: record.Id, // This is the ScratchOrgInfo record Id needed for deletion
        username: record.SignupUsername,
        orgId: record.ScratchOrg || record.Id,
        instanceUrl: "",
        alias: record.OrgName || undefined,
        durationDays: record.DurationDays,
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

    // Invalidate limits cache for affected DevHubs since counts changed
    if (success.length > 0) {
      const affectedDevHubs = new Set(scratchOrgs.map((o) => o.devHubUsername));
      for (const devHub of affectedDevHubs) {
        this.limitsCache.invalidate(`limits:${devHub}`);
      }
    }

    return { success, failed };
  }

  /**
   * Get snapshot counts for a DevHub (for dashboard card) - with caching
   * Returns unavailable status if snapshots are not enabled or user lacks permissions
   */
  async getSnapshotsInfo(
    devHubUsername: string,
    forceRefresh = false
  ): Promise<SnapshotsInfo> {
    const cacheKey = `snapshots-info:${devHubUsername}`;

    // Check cache first
    if (!forceRefresh) {
      const cached = this.snapshotsInfoCache.get(cacheKey);
      if (cached && !cached.isStale) {
        return cached.data;
      }
    }

    try {
      // Query for active snapshots count
      const activeQuery = `SELECT COUNT(Id) FROM OrgSnapshot WHERE Status = 'Active'`;
      const activeResult = await this.execSfCommand<SfSnapshotCountResult>(
        `sf data query --query "${activeQuery}" --target-org "${devHubUsername}" --json`
      );

      // Query for total snapshots count
      const totalQuery = `SELECT COUNT(Id) FROM OrgSnapshot`;
      const totalResult = await this.execSfCommand<SfSnapshotCountResult>(
        `sf data query --query "${totalQuery}" --target-org "${devHubUsername}" --json`
      );

      const data: SnapshotsInfo = {
        status: "available",
        activeCount: activeResult.result.records[0]?.expr0 || 0,
        totalCount: totalResult.result.records[0]?.expr0 || 0,
      };

      this.snapshotsInfoCache.set(cacheKey, data);
      return data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // Check if it's an access/permission error or object doesn't exist
      const unavailableData: SnapshotsInfo = {
        status: "unavailable",
        activeCount: 0,
        totalCount: 0,
      };

      if (
        errorMessage.includes("sObject type 'OrgSnapshot' is not supported") ||
        errorMessage.includes("INVALID_TYPE") ||
        errorMessage.includes("insufficient access") ||
        errorMessage.includes("not authorized") ||
        errorMessage.includes("INSUFFICIENT_ACCESS")
      ) {
        console.warn(
          `Snapshots not available for DevHub ${devHubUsername}: ${errorMessage}`
        );
        this.snapshotsInfoCache.set(cacheKey, unavailableData);
        return unavailableData;
      }
      // For other errors, also return unavailable
      console.error(
        `Salesforce Service: Failed to fetch snapshots info for ${devHubUsername}:`,
        errorMessage
      );
      this.snapshotsInfoCache.set(cacheKey, unavailableData);
      return unavailableData;
    }
  }

  /**
   * Get all snapshots for a specific DevHub
   */
  async getAllSnapshotsForDevHub(devHubUsername: string): Promise<{
    snapshots: SnapshotInfo[];
    status: "available" | "unavailable";
  }> {
    try {
      const query = `SELECT Id, Owner.Name, IsDeleted, CreatedDate, SnapshotName, SourceOrg, Content, Status, Provider, ProviderSnapshot, Error, ProviderSnapshotVersion, ExpirationDate, Description FROM OrgSnapshot ORDER BY CreatedDate DESC`;

      const result = await this.execSfCommand<SfSnapshotQueryResult>(
        `sf data query --query "${query}" --target-org "${devHubUsername}" --json`
      );

      const snapshots: SnapshotInfo[] = result.result.records.map((record) => ({
        id: record.Id,
        ownerName: record.Owner?.Name || record["Owner.Name"] || "Unknown",
        isDeleted: record.IsDeleted,
        createdDate: record.CreatedDate,
        snapshotName: record.SnapshotName,
        sourceOrg: record.SourceOrg || "",
        content: record.Content || "",
        status: record.Status,
        provider: record.Provider || "",
        providerSnapshot: record.ProviderSnapshot || "",
        error: record.Error || "",
        providerSnapshotVersion: record.ProviderSnapshotVersion || "",
        expirationDate: record.ExpirationDate || "",
        description: record.Description || "",
      }));

      return { snapshots, status: "available" };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // Check if it's an access/permission error or object doesn't exist
      if (
        errorMessage.includes("sObject type 'OrgSnapshot' is not supported") ||
        errorMessage.includes("INVALID_TYPE") ||
        errorMessage.includes("insufficient access") ||
        errorMessage.includes("not authorized") ||
        errorMessage.includes("INSUFFICIENT_ACCESS")
      ) {
        console.warn(
          `Snapshots not available for DevHub ${devHubUsername}: ${errorMessage}`
        );
      } else {
        console.error(
          `Failed to fetch snapshots for DevHub ${devHubUsername}:`,
          errorMessage
        );
      }
      // throw error;
      return { snapshots: [], status: "unavailable" };
    }
  }

  /**
   * Stream DevHubs data progressively with callbacks for each update.
   * This method optimizes perceived performance by:
   * 1. Immediately sending cached data if available
   * 2. Sending DevHubs list as soon as it's available
   * 3. Streaming editions, limits, and snapshots info as they load in parallel
   */
  async streamDevHubsData(callbacks: {
    onDevHubsLoaded: DevHubsLoadedCallback;
    onEditionLoaded: EditionLoadedCallback;
    onLimitsLoaded: LimitsLoadedCallback;
    onSnapshotsInfoLoaded: SnapshotsInfoLoadedCallback;
    onComplete?: () => void;
    onError?: (error: string) => void;
  }): Promise<void> {
    try {
      // Check if we have cached org data
      const cachedOrgs = this.orgsCache.get("orgs");
      if (cachedOrgs) {
        // Send cached data immediately for instant UI update
        callbacks.onDevHubsLoaded(cachedOrgs.data.devHubs);

        // Send cached editions immediately
        for (const devHub of cachedOrgs.data.devHubs) {
          const cachedEdition = this.editionsCache.get(devHub.username);
          if (cachedEdition) {
            callbacks.onEditionLoaded(devHub.username, cachedEdition.data);
          }
        }

        // Send cached limits and snapshots immediately
        for (const devHub of cachedOrgs.data.devHubs) {
          const cachedLimits = this.limitsCache.get(
            `limits:${devHub.username}`
          );
          if (cachedLimits) {
            callbacks.onLimitsLoaded(devHub.username, cachedLimits.data);
          }

          const cachedSnapshots = this.snapshotsInfoCache.get(
            `snapshots-info:${devHub.username}`
          );
          if (cachedSnapshots) {
            callbacks.onSnapshotsInfoLoaded(
              devHub.username,
              cachedSnapshots.data
            );
          }
        }

        // If data is stale, refresh in background
        if (cachedOrgs.isStale) {
          this.refreshDevHubsInBackground(callbacks);
        } else {
          callbacks.onComplete?.();
        }
        return;
      }

      // No cache - fetch fresh data
      await this.fetchAndStreamDevHubs(callbacks);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      callbacks.onError?.(errorMessage);
    }
  }

  /**
   * Fetch and stream DevHubs data from fresh API calls
   */
  private async fetchAndStreamDevHubs(callbacks: {
    onDevHubsLoaded: DevHubsLoadedCallback;
    onEditionLoaded: EditionLoadedCallback;
    onLimitsLoaded: LimitsLoadedCallback;
    onSnapshotsInfoLoaded: SnapshotsInfoLoadedCallback;
    onComplete?: () => void;
    onError?: (error: string) => void;
  }): Promise<void> {
    // Get DevHubs list first (fast operation)
    const { devHubs } = await this.getAuthorizedOrgs();

    // Send DevHubs immediately
    callbacks.onDevHubsLoaded(devHubs);

    if (devHubs.length === 0) {
      callbacks.onComplete?.();
      return;
    }

    // Fetch editions, limits, and snapshots info IN PARALLEL for all DevHubs
    const promises: Promise<void>[] = [];

    for (const devHub of devHubs) {
      // Edition fetch
      promises.push(
        this.getOrgEdition(devHub.username)
          .then((edition) => {
            callbacks.onEditionLoaded(devHub.username, edition);
          })
          .catch(() => {
            callbacks.onEditionLoaded(devHub.username, undefined);
          })
      );

      // Limits fetch
      promises.push(
        this.getDevHubLimits(devHub.username)
          .then((limits) => {
            callbacks.onLimitsLoaded(devHub.username, limits);
          })
          .catch(() => {
            callbacks.onLimitsLoaded(
              devHub.username,
              {
                activeScratchOrgs: 0,
                maxActiveScratchOrgs: 0,
                dailyScratchOrgs: 0,
                maxDailyScratchOrgs: 0,
              },
              true
            );
          })
      );

      // Snapshots info fetch
      promises.push(
        this.getSnapshotsInfo(devHub.username)
          .then((snapshotsInfo) => {
            callbacks.onSnapshotsInfoLoaded(devHub.username, snapshotsInfo);
          })
          .catch(() => {
            callbacks.onSnapshotsInfoLoaded(devHub.username, {
              status: "unavailable",
              activeCount: 0,
              totalCount: 0,
            });
          })
      );
    }

    // Wait for all parallel fetches to complete
    await Promise.all(promises);
    callbacks.onComplete?.();
  }

  /**
   * Refresh DevHubs data in background (when cache is stale)
   */
  private async refreshDevHubsInBackground(callbacks: {
    onDevHubsLoaded: DevHubsLoadedCallback;
    onEditionLoaded: EditionLoadedCallback;
    onLimitsLoaded: LimitsLoadedCallback;
    onSnapshotsInfoLoaded: SnapshotsInfoLoadedCallback;
    onComplete?: () => void;
    onError?: (error: string) => void;
  }): Promise<void> {
    try {
      // Force refresh of org list
      const { devHubs } = await this.getAuthorizedOrgs(true);
      callbacks.onDevHubsLoaded(devHubs);

      if (devHubs.length === 0) {
        callbacks.onComplete?.();
        return;
      }

      // Refresh all data in parallel
      const promises: Promise<void>[] = [];

      for (const devHub of devHubs) {
        promises.push(
          this.getOrgEdition(devHub.username)
            .then((edition) =>
              callbacks.onEditionLoaded(devHub.username, edition)
            )
            .catch(() => callbacks.onEditionLoaded(devHub.username, undefined))
        );

        promises.push(
          this.getDevHubLimits(devHub.username, true)
            .then((limits) => callbacks.onLimitsLoaded(devHub.username, limits))
            .catch(() =>
              callbacks.onLimitsLoaded(
                devHub.username,
                {
                  activeScratchOrgs: 0,
                  maxActiveScratchOrgs: 0,
                  dailyScratchOrgs: 0,
                  maxDailyScratchOrgs: 0,
                },
                true
              )
            )
        );

        promises.push(
          this.getSnapshotsInfo(devHub.username, true)
            .then((info) =>
              callbacks.onSnapshotsInfoLoaded(devHub.username, info)
            )
            .catch(() =>
              callbacks.onSnapshotsInfoLoaded(devHub.username, {
                status: "unavailable",
                activeCount: 0,
                totalCount: 0,
              })
            )
        );
      }

      await Promise.all(promises);
      callbacks.onComplete?.();
    } catch (error) {
      // Background refresh failed - not critical since we already showed cached data
      console.warn("Background refresh failed:", error);
      callbacks.onComplete?.();
    }
  }
}

// Singleton instance
export const salesforceService = new SalesforceService();
