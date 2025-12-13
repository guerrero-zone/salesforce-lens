<script lang="ts">
  import type { ScratchOrgInfo } from "../lib/types";
  import { postMessage } from "../lib/vscode";
  import { formatDate, getDaysRemaining } from "../lib/dateUtils";
  import { getExpirationClass } from "../lib/colorUtils";
  import { SearchBox, FilterTabs, SelectFilter, LoadingState, ErrorState, EmptyState } from "./common";

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
  let filterStatus = $state<"active" | "expired" | "all">("active");
  let filterDuration = $state<"all" | "1" | "7" | "14" | "30">("all");
  let isDeleting = $state(false);

  // Filter tab options
  const statusTabs = [
    { value: "active", label: "Active" },
    { value: "expired", label: "Expired" },
    { value: "all", label: "All" },
  ];

  // Duration filter options
  const durationOptions = [
    { value: "all", label: "All" },
    { value: "1", label: "1 day" },
    { value: "7", label: "7 days" },
    { value: "14", label: "14 days" },
    { value: "30", label: "30 days" },
  ];

  // Reset selection when scratchOrgs change (e.g., different devhub)
  $effect(() => {
    scratchOrgs;
    selectedOrgs = new Set();
  });

  const filteredOrgs = $derived.by(() => {
    let result = scratchOrgs;

    // Filter by status
    if (filterStatus === "active") {
      result = result.filter((org) => !org.isExpired && org.status === "Active");
    } else if (filterStatus === "expired") {
      result = result.filter((org) => org.isExpired || org.status !== "Active");
    }

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
          org.edition?.toLowerCase().includes(query)
      );
    }

    return result;
  });

  const allSelected = $derived(
    filteredOrgs.length > 0 && filteredOrgs.every((org) => selectedOrgs.has(org.id))
  );

  const someSelected = $derived(selectedOrgs.size > 0 && !allSelected);

  function toggleSelectAll() {
    if (allSelected) {
      selectedOrgs = new Set();
    } else {
      selectedOrgs = new Set(filteredOrgs.map((org) => org.id));
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
      placeholder="Search by username, alias, creator..."
      onchange={(v) => (searchQuery = v)}
    />

    <FilterTabs
      tabs={statusTabs}
      value={filterStatus}
      onchange={(v) => (filterStatus = v as "active" | "expired" | "all")}
    />

    <SelectFilter
      id="duration-select"
      label="Duration:"
      icon="codicon-calendar"
      value={filterDuration}
      options={durationOptions}
      onchange={(v) => (filterDuration = v as "all" | "1" | "7" | "14" | "30")}
    />

    {#if selectedOrgs.size > 0}
      <button
        class="delete-button"
        onclick={deleteSelected}
        disabled={isDeleting}
      >
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
      message={searchQuery || filterStatus !== "all"
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
            <th>Scratch Org</th>
            <th>Edition</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Created</th>
            <th>Expires</th>
            <th>Created By</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredOrgs as org (org.id)}
            {@const daysRemaining = getDaysRemaining(org.expirationDate)}
            {@const expirationClass = getExpirationClass(org.expirationDate)}
            <tr
              class:selected={selectedOrgs.has(org.id)}
              class:expired={org.isExpired}
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
              <td>
                <span class="status-pill" class:active={org.status === "Active"} class:expired={org.isExpired} class:error={org.status === "Error"}>
                  {org.isExpired ? "Expired" : org.status}
                </span>
              </td>
              <td class="duration-cell">
                <span class="duration-badge">{org.durationDays}d</span>
              </td>
              <td class="date-cell">{formatDate(org.createdDate)}</td>
              <td class="date-cell">
                <span class="expiration {expirationClass}">
                  {formatDate(org.expirationDate)}
                  {#if !org.isExpired}
                    <span class="days-remaining">({daysRemaining}d)</span>
                  {/if}
                </span>
              </td>
              <td class="creator-cell">{org.createdBy || "N/A"}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="table-footer">
      <span class="count-info">
        Showing {filteredOrgs.length} of {scratchOrgs.length} scratch orgs
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
    margin-left: auto;
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

  .org-table tr.expired {
    opacity: 0.5;
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

  .status-pill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 500;
  }

  .status-pill.active {
    background: var(--vscode-testing-iconPassed, #22c55e);
    color: white;
  }

  .status-pill.expired {
    background: var(--vscode-errorForeground, #f14c4c);
    color: white;
  }

  .status-pill.error {
    background: var(--vscode-editorWarning-foreground, #cca700);
    color: black;
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

  .expiration.expired {
    color: var(--vscode-descriptionForeground);
  }

  .days-remaining {
    font-size: 10px;
    opacity: 0.8;
  }

  .creator-cell {
    color: var(--vscode-descriptionForeground);
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
