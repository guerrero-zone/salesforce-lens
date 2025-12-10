<script lang="ts">
  import type { SnapshotInfo } from "../lib/types";

  interface Props {
    snapshots: SnapshotInfo[];
    loading: boolean;
    error: string | null;
    unavailable: boolean;
  }

  let { snapshots, loading, error, unavailable }: Props = $props();

  let searchQuery = $state("");
  let filterStatus = $state<string>("all");

  // Get unique statuses for filter dropdown
  const uniqueStatuses = $derived(() => {
    const statuses = new Set(snapshots.map((s) => s.status));
    return Array.from(statuses).sort();
  });

  const filteredSnapshots = $derived.by(() => {
    let result = snapshots;

    // Filter by status
    if (filterStatus !== "all") {
      result = result.filter((snapshot) => snapshot.status === filterStatus);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (snapshot) =>
          snapshot.snapshotName.toLowerCase().includes(query) ||
          snapshot.ownerName.toLowerCase().includes(query) ||
          snapshot.sourceOrg.toLowerCase().includes(query) ||
          snapshot.description.toLowerCase().includes(query) ||
          snapshot.status.toLowerCase().includes(query)
      );
    }

    return result;
  });

  function formatDate(dateString: string): string {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatDateTime(dateString: string): string {
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

  function getStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower === "active") return "status-active";
    if (statusLower === "error" || statusLower === "failed") return "status-error";
    if (statusLower === "creating" || statusLower === "pending" || statusLower === "inprogress") return "status-pending";
    if (statusLower === "deleted") return "status-deleted";
    return "status-default";
  }

  function getDaysUntilExpiration(expirationDate: string): number | null {
    if (!expirationDate) return null;
    const expDate = new Date(expirationDate);
    const today = new Date();
    const diffTime = expDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  function getExpirationClass(expirationDate: string): string {
    const days = getDaysUntilExpiration(expirationDate);
    if (days === null) return "";
    if (days <= 0) return "expired";
    if (days <= 7) return "expiring-soon";
    if (days <= 30) return "expiring-warning";
    return "healthy";
  }

  function truncateText(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text || "";
    return text.substring(0, maxLength) + "...";
  }
</script>

<div class="snapshot-list">
  {#if unavailable}
    <div class="unavailable-state">
      <span class="codicon codicon-lock unavailable-icon"></span>
      <h3>Snapshots Not Available</h3>
      <p>
        Org snapshots are not enabled for this DevHub or you don't have permission to access them.
      </p>
    </div>
  {:else if loading}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading snapshots...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <span class="codicon codicon-warning error-icon"></span>
      <h3>Failed to load snapshots</h3>
      <p>{error}</p>
    </div>
  {:else}
    <div class="controls">
      <div class="search-box">
        <span class="codicon codicon-search search-icon"></span>
        <input
          type="text"
          placeholder="Search by name, owner, source org..."
          bind:value={searchQuery}
        />
      </div>

      <div class="status-filter">
        <label for="status-select" class="filter-label">
          <span class="codicon codicon-filter"></span>
          Status:
        </label>
        <select 
          id="status-select"
          class="status-select"
          bind:value={filterStatus}
        >
          <option value="all">All</option>
          {#each uniqueStatuses() as status}
            <option value={status}>{status}</option>
          {/each}
        </select>
      </div>
    </div>

    {#if filteredSnapshots.length === 0}
      <div class="empty-state">
        <span class="codicon codicon-package empty-icon"></span>
        <h3>No snapshots found</h3>
        <p>
          {#if searchQuery || filterStatus !== "all"}
            Try adjusting your search or filter criteria
          {:else}
            This DevHub doesn't have any org snapshots yet
          {/if}
        </p>
      </div>
    {:else}
      <div class="snapshots-container">
        {#each filteredSnapshots as snapshot (snapshot.id)}
          <div class="snapshot-card">
            <div class="snapshot-header">
              <div class="snapshot-name-row">
                <span class="codicon codicon-package snapshot-icon"></span>
                <h4 class="snapshot-name">{snapshot.snapshotName} <span class="snapshot-id monospace">({snapshot.id})</span></h4>
                <span class="status-pill {getStatusClass(snapshot.status)}">{snapshot.status}</span>
              </div>
              {#if snapshot.description}
                <p class="snapshot-description">{truncateText(snapshot.description, 120)}</p>
              {/if}
            </div>

            <div class="snapshot-details">
              <div class="detail-row">
                <div class="detail-item">
                  <span class="detail-label">
                    <span class="codicon codicon-person"></span>
                    Owner
                  </span>
                  <span class="detail-value">{snapshot.ownerName}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">
                    <span class="codicon codicon-source-control"></span>
                    Source Org
                  </span>
                  <span class="detail-value monospace">{snapshot.sourceOrg || "N/A"}</span>
                </div>
              </div>

              <div class="detail-row">
                <div class="detail-item">
                  <span class="detail-label">
                    <span class="codicon codicon-calendar"></span>
                    Created
                  </span>
                  <span class="detail-value">{formatDateTime(snapshot.createdDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">
                    <span class="codicon codicon-clock"></span>
                    Expires
                  </span>
                  <span class="detail-value {getExpirationClass(snapshot.expirationDate)}">
                    {#if snapshot.expirationDate}
                      {formatDate(snapshot.expirationDate)}
                      {#if getDaysUntilExpiration(snapshot.expirationDate) !== null}
                        <span class="days-remaining">
                          ({getDaysUntilExpiration(snapshot.expirationDate)}d)
                        </span>
                      {/if}
                    {:else}
                      N/A
                    {/if}
                  </span>
                </div>
              </div>

              {#if snapshot.content || snapshot.provider}
                <div class="detail-row">
                  {#if snapshot.content}
                    <div class="detail-item">
                      <span class="detail-label">
                        <span class="codicon codicon-file"></span>
                        Content
                      </span>
                      <span class="detail-value">{snapshot.content}</span>
                    </div>
                  {/if}
                  {#if snapshot.provider}
                    <div class="detail-item">
                      <span class="detail-label">
                        <span class="codicon codicon-cloud"></span>
                        Provider
                      </span>
                      <span class="detail-value">{snapshot.provider}</span>
                    </div>
                  {/if}
                </div>
              {/if}

              {#if snapshot.providerSnapshot || snapshot.providerSnapshotVersion}
                <div class="detail-row">
                  {#if snapshot.providerSnapshot}
                    <div class="detail-item">
                      <span class="detail-label">
                        <span class="codicon codicon-versions"></span>
                        Provider Snapshot
                      </span>
                      <span class="detail-value monospace">{truncateText(snapshot.providerSnapshot, 40)}</span>
                    </div>
                  {/if}
                  {#if snapshot.providerSnapshotVersion}
                    <div class="detail-item">
                      <span class="detail-label">
                        <span class="codicon codicon-tag"></span>
                        Version
                      </span>
                      <span class="detail-value">{snapshot.providerSnapshotVersion}</span>
                    </div>
                  {/if}
                </div>
              {/if}

              {#if snapshot.error}
                <div class="error-row">
                  <span class="codicon codicon-error error-indicator"></span>
                  <span class="error-text">{snapshot.error}</span>
                </div>
              {/if}
            </div>

            <div class="snapshot-footer">
              {#if snapshot.isDeleted}
                <span class="deleted-badge">Deleted</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <div class="list-footer">
        <span class="count-info">
          Showing {filteredSnapshots.length} of {snapshots.length} snapshots
        </span>
      </div>
    {/if}
  {/if}
</div>

<style>
  .snapshot-list {
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

  .status-filter {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .filter-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    white-space: nowrap;
  }

  .filter-label .codicon {
    font-size: 12px;
  }

  .status-select {
    padding: 4px 8px;
    border: 1px solid var(--vscode-input-border, var(--vscode-widget-border));
    border-radius: 3px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    min-width: 100px;
  }

  .status-select:focus {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: -1px;
    border-color: var(--vscode-focusBorder);
  }

  .loading-state,
  .error-state,
  .empty-state,
  .unavailable-state {
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

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-icon,
  .empty-icon,
  .unavailable-icon {
    font-size: 48px;
    margin-bottom: 12px;
    color: var(--vscode-descriptionForeground);
  }

  .error-icon {
    color: var(--vscode-errorForeground);
  }

  .unavailable-icon {
    color: var(--vscode-descriptionForeground);
    opacity: 0.7;
  }

  .error-state h3,
  .empty-state h3,
  .unavailable-state h3 {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
  }

  .error-state p,
  .empty-state p,
  .unavailable-state p {
    margin: 0;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    max-width: 320px;
  }

  .snapshots-container {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 4px 0;
  }

  .snapshot-card {
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-widget-border);
    border-radius: 6px;
    padding: 12px;
    transition: border-color 0.1s;
  }

  .snapshot-card:hover {
    border-color: var(--vscode-focusBorder);
  }

  .snapshot-header {
    margin-bottom: 12px;
  }

  .snapshot-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .snapshot-icon {
    font-size: 16px;
    color: var(--vscode-button-background);
    flex-shrink: 0;
  }

  .snapshot-name {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-foreground);
    flex: 1;
    min-width: 0;
    word-break: break-word;
  }

  .snapshot-description {
    margin: 6px 0 0;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.4;
    padding-left: 24px;
  }

  .status-pill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    flex-shrink: 0;
  }

  .status-pill.status-active {
    background: var(--vscode-testing-iconPassed, #22c55e);
    color: white;
  }

  .status-pill.status-error {
    background: var(--vscode-errorForeground, #f14c4c);
    color: white;
  }

  .status-pill.status-pending {
    background: var(--vscode-editorWarning-foreground, #cca700);
    color: black;
  }

  .status-pill.status-deleted {
    background: var(--vscode-descriptionForeground);
    color: white;
    opacity: 0.7;
  }

  .status-pill.status-default {
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
  }

  .snapshot-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-left: 24px;
  }

  .detail-row {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 120px;
    flex: 1;
  }

  .detail-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .detail-label .codicon {
    font-size: 11px;
    opacity: 0.8;
  }

  .detail-value {
    font-size: 12px;
    color: var(--vscode-foreground);
    word-break: break-word;
  }

  .detail-value.monospace {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
  }

  .detail-value.healthy {
    color: var(--vscode-testing-iconPassed, #22c55e);
  }

  .detail-value.expiring-warning {
    color: var(--vscode-editorWarning-foreground, #cca700);
  }

  .detail-value.expiring-soon {
    color: var(--vscode-errorForeground, #f14c4c);
  }

  .detail-value.expired {
    color: var(--vscode-descriptionForeground);
    opacity: 0.7;
  }

  .days-remaining {
    font-size: 10px;
    opacity: 0.8;
    margin-left: 4px;
  }

  .error-row {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 8px;
    background: rgba(241, 76, 76, 0.1);
    border-radius: 4px;
    margin-top: 4px;
  }

  .error-indicator {
    color: var(--vscode-errorForeground);
    font-size: 14px;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .error-text {
    font-size: 11px;
    color: var(--vscode-errorForeground);
    word-break: break-word;
  }

  .snapshot-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px solid var(--vscode-widget-border);
  }

  .snapshot-id {
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    opacity: 0.7;
  }

  .deleted-badge {
    font-size: 10px;
    padding: 2px 6px;
    background: var(--vscode-errorForeground, #f14c4c);
    color: white;
    border-radius: 3px;
    text-transform: uppercase;
    font-weight: 500;
  }

  .list-footer {
    padding: 8px 0;
    border-top: 1px solid var(--vscode-widget-border);
    margin-top: auto;
  }

  .count-info {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
  }
</style>

