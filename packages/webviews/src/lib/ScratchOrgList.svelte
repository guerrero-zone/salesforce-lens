<script lang="ts">
  import type { DevHubInfo, ScratchOrgInfo } from "./types";
  import { postMessage } from "./vscode";

  interface Props {
    devHub: DevHubInfo;
    onback: () => void;
  }

  let { devHub, onback }: Props = $props();

  let scratchOrgs = $state<ScratchOrgInfo[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let searchQuery = $state("");
  let selectedOrgs = $state<Set<string>>(new Set());
  let filterStatus = $state<"active" | "expired" | "all">("active");
  let isDeleting = $state(false);

  const filteredOrgs = $derived.by(() => {
    let result = scratchOrgs;

    // Filter by status
    if (filterStatus === "active") {
      result = result.filter((org) => !org.isExpired && org.status === "Active");
    } else if (filterStatus === "expired") {
      result = result.filter((org) => org.isExpired || org.status !== "Active");
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
    filteredOrgs.length > 0 &&
      filteredOrgs.every((org) => selectedOrgs.has(org.id))
  );

  const someSelected = $derived(
    selectedOrgs.size > 0 && !allSelected
  );

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
        devHubUsername: devHub.username,
      }));

    postMessage({
      command: "deleteScratchOrgs",
      scratchOrgs: orgsToDelete,
    });
  }

  function formatDate(dateString: string): string {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function getDaysRemaining(expirationDate: string): number {
    const expDate = new Date(expirationDate);
    const today = new Date();
    const diffTime = expDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  function getExpirationClass(expirationDate: string): string {
    const days = getDaysRemaining(expirationDate);
    if (days <= 0) return "expired";
    if (days <= 3) return "critical";
    if (days <= 7) return "warning";
    return "healthy";
  }

  function loadScratchOrgs() {
    loading = true;
    error = null;
    selectedOrgs = new Set();
    postMessage({
      command: "getScratchOrgs",
      devHubUsername: devHub.username,
    });
  }

  function refreshList() {
    loadScratchOrgs();
  }

  // Listen for messages from extension
  $effect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.command) {
        case "scratchOrgsLoading":
          if (message.devHubUsername === devHub.username) {
            loading = true;
            error = null;
          }
          break;

        case "scratchOrgsData":
          if (message.devHubUsername === devHub.username) {
            scratchOrgs = message.scratchOrgs;
            loading = false;
          }
          break;

        case "scratchOrgsError":
          if (message.devHubUsername === devHub.username) {
            error = message.error;
            loading = false;
          }
          break;

        case "deleteStarted":
          isDeleting = true;
          break;

        case "deleteCompleted":
          isDeleting = false;
          // Remove deleted orgs from the list
          const deletedIds = new Set(message.success);
          scratchOrgs = scratchOrgs.filter(
            (org) => !deletedIds.has(org.id)
          );
          selectedOrgs = new Set();
          break;

        case "deleteCancelled":
        case "deleteError":
          isDeleting = false;
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    loadScratchOrgs();

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  });

  function getDevHubDisplayName(): string {
    if (devHub.aliases.length > 0) {
      return devHub.aliases[0];
    }
    return devHub.username;
  }
</script>

<div class="scratch-org-list">
  <header class="list-header">
    <button class="back-button" onclick={onback} title="Back to Dashboard">
      <span class="codicon codicon-arrow-left"></span>
      Back
    </button>

    <div class="header-info">
      <h2>{getDevHubDisplayName()}</h2>
      <span class="subtitle">Scratch Orgs</span>
    </div>

    <button class="refresh-button" onclick={refreshList} disabled={loading} title="Refresh scratch orgs">
      <span class="codicon codicon-refresh" class:spinning={loading}></span>
      Refresh
    </button>
  </header>

  <div class="controls">
    <div class="search-box">
      <span class="codicon codicon-search search-icon"></span>
      <input
        type="text"
        placeholder="Search by username, alias, creator..."
        bind:value={searchQuery}
      />
    </div>

    <div class="filter-tabs">
      <button
        class="filter-tab"
        class:active={filterStatus === "active"}
        onclick={() => (filterStatus = "active")}
      >
        Active
      </button>
      <button
        class="filter-tab"
        class:active={filterStatus === "expired"}
        onclick={() => (filterStatus = "expired")}
      >
        Expired
      </button>
      <button
        class="filter-tab"
        class:active={filterStatus === "all"}
        onclick={() => (filterStatus = "all")}
      >
        All
      </button>
    </div>

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
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading scratch orgs...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <span class="codicon codicon-warning error-icon"></span>
      <h3>Failed to load scratch orgs</h3>
      <p>{error}</p>
      <button class="retry-button" onclick={loadScratchOrgs}>
        Try Again
      </button>
    </div>
  {:else if filteredOrgs.length === 0}
    <div class="empty-state">
      <span class="codicon codicon-inbox empty-icon"></span>
      <h3>No scratch orgs found</h3>
      <p>
        {#if searchQuery || filterStatus !== "all"}
          Try adjusting your search or filter criteria
        {:else}
          This DevHub doesn't have any scratch orgs yet
        {/if}
      </p>
    </div>
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
            <th>Created</th>
            <th>Expires</th>
            <th>Created By</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredOrgs as org (org.id)}
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
              <td class="date-cell">{formatDate(org.createdDate)}</td>
              <td class="date-cell">
                <span class="expiration {getExpirationClass(org.expirationDate)}">
                  {formatDate(org.expirationDate)}
                  {#if !org.isExpired}
                    <span class="days-remaining">
                      ({getDaysRemaining(org.expirationDate)}d)
                    </span>
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
  .scratch-org-list {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: var(--vscode-editor-background);
  }

  .list-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--vscode-widget-border);
    background: var(--vscode-editor-background);
  }

  .back-button {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: transparent;
    border: 1px solid var(--vscode-button-secondaryBackground, var(--vscode-widget-border));
    border-radius: 3px;
    color: var(--vscode-foreground);
    cursor: pointer;
    font-size: 12px;
    transition: background 0.1s;
  }

  .back-button:hover {
    background: var(--vscode-list-hoverBackground);
  }

  .back-button .codicon {
    font-size: 14px;
  }

  .header-info {
    flex: 1;
  }

  .header-info h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
  }

  .header-info .subtitle {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
  }

  .refresh-button {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: var(--vscode-button-secondaryBackground);
    border: 1px solid var(--vscode-button-secondaryBackground);
    border-radius: 3px;
    color: var(--vscode-button-secondaryForeground);
    cursor: pointer;
    font-size: 12px;
    transition: background 0.1s;
  }

  .refresh-button:hover:not(:disabled) {
    background: var(--vscode-button-secondaryHoverBackground);
  }

  .refresh-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .refresh-button .codicon {
    font-size: 14px;
  }

  .refresh-button .codicon.spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--vscode-sideBar-background);
    flex-wrap: wrap;
    border-bottom: 1px solid var(--vscode-widget-border);
  }

  .search-box {
    position: relative;
    flex: 1;
    min-width: 180px;
    max-width: 320px;
  }

  .search-icon {
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 14px;
    color: var(--vscode-input-placeholderForeground);
  }

  .search-box input {
    width: 100%;
    padding: 5px 8px 5px 28px;
    border: 1px solid var(--vscode-input-border, var(--vscode-widget-border));
    border-radius: 3px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    font-size: 12px;
    font-family: inherit;
  }

  .search-box input:focus {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: -1px;
    border-color: var(--vscode-focusBorder);
  }

  .search-box input::placeholder {
    color: var(--vscode-input-placeholderForeground);
  }

  .filter-tabs {
    display: flex;
    border: 1px solid var(--vscode-widget-border);
    border-radius: 3px;
    overflow: hidden;
  }

  .filter-tab {
    padding: 4px 10px;
    border: none;
    background: transparent;
    color: var(--vscode-foreground);
    font-size: 12px;
    cursor: pointer;
    border-right: 1px solid var(--vscode-widget-border);
  }

  .filter-tab:last-child {
    border-right: none;
  }

  .filter-tab:hover {
    background: var(--vscode-list-hoverBackground);
  }

  .filter-tab.active {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
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

  .loading-state,
  .error-state,
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    text-align: center;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 2px solid var(--vscode-widget-border);
    border-top-color: var(--vscode-progressBar-background, var(--vscode-button-background));
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 12px;
  }

  .error-icon,
  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
    color: var(--vscode-descriptionForeground);
  }

  .error-icon {
    color: var(--vscode-errorForeground);
  }

  .error-state h3,
  .empty-state h3 {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
  }

  .error-state p,
  .empty-state p {
    margin: 0;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
  }

  .retry-button {
    margin-top: 12px;
    padding: 5px 12px;
    background: var(--vscode-button-background);
    border: none;
    border-radius: 3px;
    color: var(--vscode-button-foreground);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
  }

  .retry-button:hover {
    background: var(--vscode-button-hoverBackground);
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
    padding: 8px 16px;
    border-top: 1px solid var(--vscode-widget-border);
    background: var(--vscode-sideBar-background);
  }

  .count-info {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
  }
</style>
