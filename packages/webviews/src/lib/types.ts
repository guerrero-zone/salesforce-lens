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
  limits: ScratchOrgLimits;
}

export interface ScratchOrgInfo {
  id: string;
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

export interface VsCodeApi {
  postMessage(message: object): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare global {
  function acquireVsCodeApi(): VsCodeApi;
}
