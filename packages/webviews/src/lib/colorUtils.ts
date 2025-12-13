/**
 * Color and CSS class utility functions.
 * Consolidates duplicate implementations across components.
 */

/**
 * Get the appropriate CSS color for a progress bar based on percentage.
 * @param percentage - Value from 0-100
 * @returns CSS color variable string
 */
export function getProgressColor(percentage: number): string {
  if (percentage >= 90) return "var(--vscode-errorForeground, #f14c4c)";
  if (percentage >= 70) return "var(--vscode-editorWarning-foreground, #cca700)";
  return "var(--vscode-testing-iconPassed, #22c55e)";
}

/**
 * Expiration status types for styling
 */
export type ExpirationStatus = "expired" | "critical" | "warning" | "healthy";

/**
 * Get the expiration CSS class based on days remaining.
 * Used for scratch org expiration styling.
 * @param expirationDate - ISO date string
 * @returns CSS class name for expiration status
 */
export function getExpirationClass(expirationDate: string): ExpirationStatus {
  const expDate = new Date(expirationDate);
  const today = new Date();
  const diffTime = expDate.getTime() - today.getTime();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (days <= 0) return "expired";
  if (days <= 3) return "critical";
  if (days <= 7) return "warning";
  return "healthy";
}

/**
 * Snapshot expiration status types for styling
 */
export type SnapshotExpirationStatus = "expired" | "expiring-soon" | "expiring-warning" | "healthy" | "";

/**
 * Get the expiration CSS class for snapshots.
 * Uses different thresholds than scratch orgs.
 * @param expirationDate - ISO date string
 * @returns CSS class name for expiration status
 */
export function getSnapshotExpirationClass(expirationDate: string): SnapshotExpirationStatus {
  if (!expirationDate) return "";
  
  const expDate = new Date(expirationDate);
  const today = new Date();
  const diffTime = expDate.getTime() - today.getTime();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (days <= 0) return "expired";
  if (days <= 7) return "expiring-soon";
  if (days <= 30) return "expiring-warning";
  return "healthy";
}

/**
 * Status class types for status pills
 */
export type StatusClass = "status-active" | "status-error" | "status-pending" | "status-deleted" | "status-default";

/**
 * Get the CSS class for a snapshot status.
 * @param status - Status string from the API
 * @returns CSS class name for status styling
 */
export function getStatusClass(status: string): StatusClass {
  const statusLower = status.toLowerCase();
  if (statusLower === "active") return "status-active";
  if (statusLower === "error" || statusLower === "failed") return "status-error";
  if (statusLower === "creating" || statusLower === "pending" || statusLower === "inprogress") return "status-pending";
  if (statusLower === "deleted") return "status-deleted";
  return "status-default";
}

