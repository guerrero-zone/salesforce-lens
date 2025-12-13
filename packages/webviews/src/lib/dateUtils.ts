/**
 * Date utility functions for formatting and calculating date-related values.
 * Consolidates duplicate implementations from ScratchOrgContent and SnapshotList.
 */

/**
 * Format a date string to a localized short date format.
 * @param dateString - ISO date string
 * @returns Formatted date string (e.g., "Dec 10, 2024") or "N/A" if invalid
 */
export function formatDate(dateString: string): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date string to a localized date-time format.
 * @param dateString - ISO date string
 * @returns Formatted date-time string (e.g., "Dec 10, 2024, 2:30 PM") or "N/A" if invalid
 */
export function formatDateTime(dateString: string): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Calculate the number of days remaining until a given date.
 * @param expirationDate - ISO date string
 * @returns Number of days remaining (negative if past)
 */
export function getDaysRemaining(expirationDate: string): number {
  const expDate = new Date(expirationDate);
  const today = new Date();
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate the number of days until expiration, returning null if no date provided.
 * @param expirationDate - ISO date string
 * @returns Number of days until expiration, or null if no date
 */
export function getDaysUntilExpiration(expirationDate: string): number | null {
  if (!expirationDate) return null;
  return getDaysRemaining(expirationDate);
}

/**
 * Truncate text to a maximum length with ellipsis.
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with "..." if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text || "";
  return text.substring(0, maxLength) + "...";
}
