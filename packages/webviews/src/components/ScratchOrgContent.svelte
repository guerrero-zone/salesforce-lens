<script lang="ts">
  import type { ScratchOrgInfo } from "../lib/types";
  import { postMessage } from "../lib/vscode";
  import { formatDate, getDaysRemaining } from "../lib/dateUtils";
  import { getExpirationClass } from "../lib/colorUtils";
  import {
    buildScratchOrgsExportFileName,
    scratchOrgsToCsv,
    scratchOrgsToJson,
    type ScratchOrgExportFormat,
  } from "../lib/exportUtils";
  import { SearchBox, SelectFilter, LoadingState, ErrorState, EmptyState } from "./common";

  interface Props {
    scratchOrgs: ScratchOrgInfo[];
    loading: boolean;
    error: string | null;
    devHubUsername: string;
    onretry: () => void;
  }

  let { scratchOrgs, loading, error, devHubUsername, onretry }: Props = $props();

  let searchQuery = $state("");
  let selectedOrgs = $state<Set<string>>(new Set());
  let isDeleting = $state(false);
  let exportMenuOpen = $state(false);
  let exportMenuEl: HTMLDivElement | null = null;

  type SortKey =
    | "scratchOrg"
    | "edition"
    | "durationDays"
    | "createdDate"
    | "expirationDate"
    | "createdBy"
    | "pool";
  type SortDirection = "asc" | "desc";

  // Default sort: soonest-expiring first (helps prioritize action)
  let sortKey = $state<SortKey>("expirationDate");
  let sortDirection = $state<SortDirection>("asc");

  // Duration filter options
  const durationOptions = [
    { value: "all", label: "All" },
    { value: "1", label: "1 day" },
    { value: "7", label: "7 days" },
    { value: "14", label: "14 days" },
    { value: "21", label: "21 days" },
    { value: "30", label: "30 days" },
  ] as const;

  type DurationFilter = (typeof durationOptions)[number]["value"];
  let filterDuration = $state<DurationFilter>("all");

  // Reset selection when scratchOrgs change (e.g., different devhub)
  $effect(() => {
    scratchOrgs;
    selectedOrgs = new Set();
  });

  const filteredOrgs = $derived.by(() => {
    let result = scratchOrgs;

    // Filter by duration days
    if (filterDuration !== "all") {
      const targetDuration = parseInt(filterDuration, 10);
      result = result.filter((org) => org.durationDays >= targetDuration);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (org) =>
          org.username.toLowerCase().includes(query) ||
          org.alias?.toLowerCase().includes(query) ||
          org.signupUsername?.toLowerCase().includes(query) ||
          org.createdBy?.toLowerCase().includes(query) ||
          org.edition?.toLowerCase().includes(query) ||
          org.poolName?.toLowerCase().includes(query)
      );
    }

    return result;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortKey = key;
      sortDirection = "asc";
    }
  }

  function getSortValue(org: ScratchOrgInfo, key: SortKey): string | number | null {
    switch (key) {
      case "scratchOrg":
        // Matches what users visually identify first: alias > signup username > username
        return (org.alias || org.signupUsername || org.username || "").toLowerCase();
      case "edition":
        return (org.edition || "").toLowerCase();
      case "durationDays":
        return Number.isFinite(org.durationDays) ? org.durationDays : null;
      case "createdDate": {
        const t = Date.parse(org.createdDate);
        return Number.isFinite(t) ? t : null;
      }
      case "expirationDate": {
        const t = Date.parse(org.expirationDate);
        return Number.isFinite(t) ? t : null;
      }
      case "createdBy":
        return (org.createdBy || "").toLowerCase();
      case "pool":
        // Sort by pool name, with non-pooled orgs at the end
        return org.poolName ? org.poolName.toLowerCase() : null;
      default:
        return null;
    }
  }

  function compareSortValues(a: string | number | null, b: string | number | null): number {
    // Always push "empty" values to the bottom regardless of direction
    const aEmpty = a === null || a === "";
    const bEmpty = b === null || b === "";
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;

    if (typeof a === "number" && typeof b === "number") return a - b;
    return String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
  }

  const visibleOrgs = $derived.by(() => {
    const indexed = filteredOrgs.map((org, idx) => ({ org, idx }));
    indexed.sort((a, b) => {
      const aVal = getSortValue(a.org, sortKey);
      const bVal = getSortValue(b.org, sortKey);
      const base = compareSortValues(aVal, bVal);
      if (base !== 0) return sortDirection === "asc" ? base : -base;
      // Stable sort fallback
      return a.idx - b.idx;
    });
    return indexed.map((x) => x.org);
  });

  const allSelected = $derived(
    visibleOrgs.length > 0 && visibleOrgs.every((org) => selectedOrgs.has(org.id))
  );

  const someSelected = $derived(selectedOrgs.size > 0 && !allSelected);

  function toggleSelectAll() {
    if (allSelected) {
      selectedOrgs = new Set();
    } else {
      selectedOrgs = new Set(visibleOrgs.map((org) => org.id));
    }
  }

  function toggleSelect(orgId: string) {
    const newSet = new Set(selectedOrgs);
    if (newSet.has(orgId)) {
      newSet.delete(orgId);
    } else {
      newSet.add(orgId);
    }
    selectedOrgs = newSet;
  }

  function deleteSelected() {
    const orgsToDelete = scratchOrgs
      .filter((org) => selectedOrgs.has(org.id))
      .map((org) => ({
        id: org.id,
        devHubUsername: devHubUsername,
      }));

    postMessage({
      command: "deleteScratchOrgs",
      scratchOrgs: orgsToDelete,
    });
  }

  const canExport = $derived(visibleOrgs.length > 0 && !loading && !error);

  function exportScratchOrgs(format: ScratchOrgExportFormat) {
    if (!canExport) return;

    const fileName = buildScratchOrgsExportFileName(devHubUsername, format);
    if (format === "json") {
      postMessage({
        command: "exportScratchOrgs",
        format,
        fileName,
        content: scratchOrgsToJson(visibleOrgs),
      });
    } else {
      postMessage({
        command: "exportScratchOrgs",
        format,
        fileName,
        content: scratchOrgsToCsv(visibleOrgs),
      });
    }
    exportMenuOpen = false;
  }

  $effect(() => {
    if (!exportMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!exportMenuEl) return;
      if (e.target instanceof Node && exportMenuEl.contains(e.target)) return;
      exportMenuOpen = false;
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  });

  // Listen for delete messages from extension
  $effect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.command) {
        case "deleteStarted":
          isDeleting = true;
          break;

        case "deleteCompleted":
          isDeleting = false;
          selectedOrgs = new Set();
          break;

        case "deleteCancelled":
        case "deleteError":
          isDeleting = false;
          break;
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  });
</script>

<div class="scratch-org-content">
  <div class="controls">
    <SearchBox
      value={searchQuery}
      placeholder="Search by username, alias, creator, pool..."
      onchange={(v) => (searchQuery = v)}
    />

    <SelectFilter
      id="duration-select"
      label="Duration:"
      icon="codicon-calendar"
      value={filterDuration}
      options={durationOptions}
      onchange={(v) => (filterDuration = v as DurationFilter)}
    />

    <div class="actions">
      <div class="export-menu" bind:this={exportMenuEl}>
        <button
          type="button"
          class="export-button"
          onclick={() => (exportMenuOpen = !exportMenuOpen)}
          disabled={!canExport}
          aria-haspopup="menu"
          aria-expanded={exportMenuOpen}
          title={visibleOrgs.length === 0 ? "No scratch orgs to export" : "Export filtered list"}
        >
          <span class="codicon codicon-export"></span>
          Export
          <span class="codicon codicon-chevron-down"></span>
        </button>

        {#if exportMenuOpen}
          <div class="export-dropdown" role="menu" aria-label="Export format">
            <button type="button" role="menuitem" onclick={() => exportScratchOrgs("json")}>
              JSON (.json)
            </button>
            <button type="button" role="menuitem" onclick={() => exportScratchOrgs("csv")}>
              CSV (.csv)
            </button>
          </div>
        {/if}
      </div>

      {#if selectedOrgs.size > 0}
        <button class="delete-button" onclick={deleteSelected} disabled={isDeleting}>
          {#if isDeleting}
            <span class="spinner"></span>
            Deleting...
          {:else}
            <span class="codicon codicon-trash"></span>
            Delete ({selectedOrgs.size})
          {/if}
        </button>
      {/if}
    </div>
  </div>

  {#if loading}
    <LoadingState message="Loading scratch orgs..." />
  {:else if error}
    <ErrorState
      title="Failed to load scratch orgs"
      message={error}
      {onretry}
    />
  {:else if filteredOrgs.length === 0}
    <EmptyState
      title="No scratch orgs found"
      message={searchQuery || filterDuration !== "all"
        ? "Try adjusting your search or filter criteria"
        : "This DevHub doesn't have any scratch orgs yet"}
    />
  {:else}
    <div class="org-table-container">
      <table class="org-table">
        <thead>
          <tr>
            <th class="checkbox-cell">
              <input
                type="checkbox"
                checked={allSelected}
                indeterminate={someSelected}
                onchange={toggleSelectAll}
              />
            </th>
            <th
              class="sortable"
              aria-sort={sortKey === "scratchOrg"
                ? sortDirection === "asc"
                  ? "ascending"
                  : "descending"
                : "none"}
            >
              <button
                type="button"
                class="sort-button"
                class:active={sortKey === "scratchOrg"}
                onclick={() => toggleSort("scratchOrg")}
                title="Sort by Scratch Org"
              >
                Scratch Org
                <span class="sort-indicator" class:placeholder={sortKey !== "scratchOrg"}>
                  <span
                    class="codicon {sortKey === "scratchOrg" && sortDirection === "desc"
                      ? "codicon-triangle-down"
                      : "codicon-triangle-up"}"
                  ></span>
                </span>
              </button>
            </th>
            <th
              class="sortable"
              aria-sort={sortKey === "edition"
                ? sortDirection === "asc"
                  ? "ascending"
                  : "descending"
                : "none"}
            >
              <button
                type="button"
                class="sort-button"
                class:active={sortKey === "edition"}
                onclick={() => toggleSort("edition")}
                title="Sort by Edition"
              >
                Edition
                <span class="sort-indicator" class:placeholder={sortKey !== "edition"}>
                  <span
                    class="codicon {sortKey === "edition" && sortDirection === "desc"
                      ? "codicon-triangle-down"
                      : "codicon-triangle-up"}"
                  ></span>
                </span>
              </button>
            </th>
            <th
              class="sortable"
              aria-sort={sortKey === "durationDays"
                ? sortDirection === "asc"
                  ? "ascending"
                  : "descending"
                : "none"}
            >
              <button
                type="button"
                class="sort-button"
                class:active={sortKey === "durationDays"}
                onclick={() => toggleSort("durationDays")}
                title="Sort by Duration"
              >
                Duration
                <span class="sort-indicator" class:placeholder={sortKey !== "durationDays"}>
                  <span
                    class="codicon {sortKey === "durationDays" && sortDirection === "desc"
                      ? "codicon-triangle-down"
                      : "codicon-triangle-up"}"
                  ></span>
                </span>
              </button>
            </th>
            <th
              class="sortable"
              aria-sort={sortKey === "createdDate"
                ? sortDirection === "asc"
                  ? "ascending"
                  : "descending"
                : "none"}
            >
              <button
                type="button"
                class="sort-button"
                class:active={sortKey === "createdDate"}
                onclick={() => toggleSort("createdDate")}
                title="Sort by Created date"
              >
                Created
                <span class="sort-indicator" class:placeholder={sortKey !== "createdDate"}>
                  <span
                    class="codicon {sortKey === "createdDate" && sortDirection === "desc"
                      ? "codicon-triangle-down"
                      : "codicon-triangle-up"}"
                  ></span>
                </span>
              </button>
            </th>
            <th
              class="sortable"
              aria-sort={sortKey === "expirationDate"
                ? sortDirection === "asc"
                  ? "ascending"
                  : "descending"
                : "none"}
            >
              <button
                type="button"
                class="sort-button"
                class:active={sortKey === "expirationDate"}
                onclick={() => toggleSort("expirationDate")}
                title="Sort by Expiration date"
              >
                Expires
                <span class="sort-indicator" class:placeholder={sortKey !== "expirationDate"}>
                  <span
                    class="codicon {sortKey === "expirationDate" && sortDirection === "desc"
                      ? "codicon-triangle-down"
                      : "codicon-triangle-up"}"
                  ></span>
                </span>
              </button>
            </th>
            <th
              class="sortable"
              aria-sort={sortKey === "createdBy"
                ? sortDirection === "asc"
                  ? "ascending"
                  : "descending"
                : "none"}
            >
              <button
                type="button"
                class="sort-button"
                class:active={sortKey === "createdBy"}
                onclick={() => toggleSort("createdBy")}
                title="Sort by Created By"
              >
                Created By
                <span class="sort-indicator" class:placeholder={sortKey !== "createdBy"}>
                  <span
                    class="codicon {sortKey === "createdBy" && sortDirection === "desc"
                      ? "codicon-triangle-down"
                      : "codicon-triangle-up"}"
                  ></span>
                </span>
              </button>
            </th>
            <th
              class="sortable"
              aria-sort={sortKey === "pool"
                ? sortDirection === "asc"
                  ? "ascending"
                  : "descending"
                : "none"}
            >
              <button
                type="button"
                class="sort-button"
                class:active={sortKey === "pool"}
                onclick={() => toggleSort("pool")}
                title="Sort by Pool"
              >
                Pool
                <span class="sort-indicator" class:placeholder={sortKey !== "pool"}>
                  <span
                    class="codicon {sortKey === "pool" && sortDirection === "desc"
                      ? "codicon-triangle-down"
                      : "codicon-triangle-up"}"
                  ></span>
                </span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {#each visibleOrgs as org (org.id)}
            {@const daysRemaining = getDaysRemaining(org.expirationDate)}
            {@const expirationClass = getExpirationClass(org.expirationDate)}
            <tr
              class:selected={selectedOrgs.has(org.id)}
            >
              <td class="checkbox-cell">
                <input
                  type="checkbox"
                  checked={selectedOrgs.has(org.id)}
                  onchange={() => toggleSelect(org.id)}
                />
              </td>
              <td class="org-cell">
                <div class="org-details">
                  {#if org.alias}
                    <span class="org-alias">{org.alias}</span>
                  {/if}
                  <span class="org-username-small">{org.signupUsername || org.username}</span>
                </div>
              </td>
              <td>
                <span class="edition-badge">{org.edition || "N/A"}</span>
              </td>
              <td class="duration-cell">
                <span class="duration-badge">{org.durationDays}d</span>
              </td>
              <td class="date-cell">{formatDate(org.createdDate)}</td>
              <td class="date-cell">
                <span class="expiration {expirationClass}">
                  {formatDate(org.expirationDate)}
                  <span class="days-remaining">({daysRemaining}d)</span>
                </span>
              </td>
              <td class="creator-cell">{org.createdBy || "N/A"}</td>
              <td class="pool-cell">
                {#if org.poolName}
                  <div class="pool-info">
                    <span class="pool-name">{org.poolName}</span>
                    <span class="pool-status" class:available={org.poolStatus === "Available"} class:in-use={org.poolStatus === "In Use"}>
                      {org.poolStatus}
                    </span>
                  </div>
                {:else}
                  <span class="no-pool">—</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="table-footer">
      <span class="count-info">
        Showing {visibleOrgs.length} of {scratchOrgs.length} scratch orgs
      </span>
    </div>
  {/if}
</div>

<style>
  .scratch-org-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    flex-wrap: wrap;
  }

  .actions {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .export-menu {
    position: relative;
    display: inline-flex;
  }

  .export-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: var(--vscode-button-secondaryBackground);
    border: 1px solid var(--vscode-button-secondaryBackground);
    border-radius: 3px;
    color: var(--vscode-button-secondaryForeground);
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
  }

  .export-button:hover:not(:disabled) {
    background: var(--vscode-button-secondaryHoverBackground);
  }

  .export-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .export-button .codicon {
    font-size: 14px;
  }

  .export-dropdown {
    position: absolute;
    right: 0;
    top: calc(100% + 4px);
    min-width: 160px;
    background: var(--vscode-menu-background, var(--vscode-editor-background));
    border: 1px solid var(--vscode-menu-border, var(--vscode-widget-border));
    border-radius: 4px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    padding: 4px;
    z-index: 10;
  }

  .export-dropdown button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    background: transparent;
    border: none;
    color: var(--vscode-foreground);
    font-size: 12px;
    cursor: pointer;
    text-align: left;
    border-radius: 3px;
  }

  .export-dropdown button:hover {
    background: var(--vscode-list-hoverBackground);
  }

  .delete-button {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: var(--vscode-errorForeground, #f14c4c);
    border: none;
    border-radius: 3px;
    color: white;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
  }

  .delete-button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .delete-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .delete-button .codicon {
    font-size: 14px;
  }

  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .org-table-container {
    flex: 1;
    overflow: auto;
  }

  .org-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  .org-table th {
    position: sticky;
    top: 0;
    background: var(--vscode-editor-background);
    padding: 8px 12px;
    text-align: left;
    font-weight: 600;
    color: var(--vscode-foreground);
    border-bottom: 1px solid var(--vscode-widget-border);
    white-space: nowrap;
  }

  .org-table th.sortable {
    padding: 0;
  }

  .sort-button {
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    background: transparent;
    border: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    border-radius: 0;
  }

  .sort-button:hover {
    background: var(--vscode-list-hoverBackground);
  }

  .sort-button:focus-visible {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: -1px;
  }

  .sort-indicator {
    display: inline-flex;
    align-items: center;
    width: 14px;
    justify-content: center;
    opacity: 0.75;
  }

  .sort-indicator.placeholder {
    opacity: 0;
  }

  .sort-button.active .sort-indicator {
    opacity: 1;
    color: var(--vscode-foreground);
  }

  .sort-indicator .codicon {
    font-size: 12px;
  }

  .org-table td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--vscode-widget-border);
    vertical-align: middle;
  }

  .org-table tbody tr {
    transition: background 0.1s;
  }

  .org-table tbody tr:hover {
    background: var(--vscode-list-hoverBackground);
  }

  .org-table tr.selected {
    background: var(--vscode-list-activeSelectionBackground);
  }

  .org-table tr.selected td {
    color: var(--vscode-list-activeSelectionForeground, var(--vscode-foreground));
  }

  .checkbox-cell {
    width: 32px;
    text-align: center;
  }

  .checkbox-cell input {
    width: 14px;
    height: 14px;
    cursor: pointer;
    accent-color: var(--vscode-button-background);
  }

  .org-cell {
    min-width: 180px;
  }

  .org-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .org-alias {
    font-weight: 600;
    color: var(--vscode-foreground);
  }

  .org-username-small {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-editor-font-family, monospace);
  }

  .edition-badge {
    display: inline-block;
    padding: 2px 6px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border-radius: 3px;
    font-size: 11px;
  }

  .duration-cell {
    text-align: center;
  }

  .duration-badge {
    display: inline-block;
    padding: 2px 6px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border-radius: 3px;
    font-size: 11px;
    font-weight: 500;
  }

  .date-cell {
    white-space: nowrap;
    color: var(--vscode-descriptionForeground);
  }

  .expiration {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .expiration.healthy {
    color: var(--vscode-testing-iconPassed, #22c55e);
  }

  .expiration.warning {
    color: var(--vscode-editorWarning-foreground, #cca700);
  }

  .expiration.critical {
    color: var(--vscode-errorForeground, #f14c4c);
  }

  .days-remaining {
    font-size: 10px;
    opacity: 0.8;
  }

  .creator-cell {
    color: var(--vscode-descriptionForeground);
  }

  .pool-cell {
    white-space: nowrap;
  }

  .pool-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .pool-name {
    font-weight: 500;
    color: var(--vscode-foreground);
  }

  .pool-status {
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 3px;
    display: inline-block;
    width: fit-content;
  }

  .pool-status.available {
    /* background: var(--vscode-testing-iconPassed, #22c55e); */
    color: var(--vscode-testing-iconPassed, #22c55e); /* white; */
  }

  .pool-status.in-use {
    /* background: var(--vscode-editorWarning-foreground, #cca700); */
    color: var(--vscode-testing-iconPassed, #cca700); /* white; */
  }

  .no-pool {
    color: var(--vscode-descriptionForeground);
    opacity: 0.5;
  }

  .table-footer {
    padding: 8px 0;
    border-top: 1px solid var(--vscode-widget-border);
  }

  .count-info {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
  }
</style>
