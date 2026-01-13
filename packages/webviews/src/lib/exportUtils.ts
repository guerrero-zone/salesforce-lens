import type { ScratchOrgInfo } from "./types";

export type ScratchOrgExportFormat = "json" | "csv";

const SCRATCH_ORG_CSV_COLUMNS: Array<{
  key: keyof ScratchOrgInfo;
  header: string;
}> = [
  { key: "alias", header: "Alias" },
  { key: "signupUsername", header: "Signup User" },
  { key: "username", header: "Username" },
  { key: "orgId", header: "Org Id" },
  { key: "edition", header: "Edition" },
  { key: "durationDays", header: "Duration Days" },
  { key: "createdDate", header: "Created Date" },
  { key: "expirationDate", header: "Expiration Date" },
  { key: "createdBy", header: "Created By" },
] as const;

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  // Wrap + escape if it contains characters that would break CSV
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function scratchOrgsToCsv(orgs: ScratchOrgInfo[]): string {
  const header = SCRATCH_ORG_CSV_COLUMNS.map((c) => csvEscape(c.header)).join(
    ","
  );
  const rows = orgs.map((org) =>
    SCRATCH_ORG_CSV_COLUMNS.map((c) => csvEscape(org[c.key])).join(",")
  );
  return [header, ...rows].join("\n");
}

export function scratchOrgsToJson(orgs: ScratchOrgInfo[]): string {
  return JSON.stringify(orgs, null, 2);
}

export function safeFileNamePart(input: string): string {
  const cleaned = input
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "unknown";
}

export function buildScratchOrgsExportFileName(
  devHubUsername: string,
  format: ScratchOrgExportFormat,
  now: Date = new Date()
): string {
  const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const who = safeFileNamePart(devHubUsername);
  return `scratch-orgs-${who}-${date}.${format}`;
}

export function downloadTextFile(
  fileName: string,
  content: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revoke to avoid interfering with download
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
