export type OrgType = "Production" | "Sandbox" | "Scratch" | "Unknown";

export interface ScratchOrgLimits {
  activeScratchOrgs: number;
  maxActiveScratchOrgs: number;
  dailyScratchOrgs: number;
  maxDailyScratchOrgs: number;
}

export interface DevHubInfo {
  username: string;
  orgId: string;
  instanceUrl: string;
  aliases: string[];
  isDevHub: boolean;
  connectedStatus: string;
  orgType: OrgType;
  edition?: string;
  limits: ScratchOrgLimits;
  snapshots?: SnapshotsInfo;
}

export interface ScratchOrgInfo {
  id: string;
  username: string;
  orgId: string;
  instanceUrl: string;
  alias?: string;
  durationDays: number;
  expirationDate: string;
  devHubUsername: string;
  createdDate: string;
  edition?: string;
  signupUsername?: string;
  createdBy?: string;
  // Pool information (from sfp plugin, if available)
  poolName?: string;
  poolStatus?: "Available" | "In Use" | string;
}

/**
 * Pool scratch org info from sfp plugin
 */
export interface PoolScratchOrgInfo {
  tag: string; // Pool name/tag
  orgId: string;
  username: string;
  expiryDate: string;
  status: string; // "Available", "In use", etc.
  loginURL?: string;
}

/**
 * Pool support status for a DevHub
 */
export type PoolSupportStatus = "available" | "unavailable" | "loading";

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

export type SnapshotStatus = "available" | "unavailable" | "loading";

export interface SnapshotsInfo {
  status: SnapshotStatus;
  activeCount: number;
  totalCount: number;
}

export interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare global {
  function acquireVsCodeApi(): VsCodeApi;
}
