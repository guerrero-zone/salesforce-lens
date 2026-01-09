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
