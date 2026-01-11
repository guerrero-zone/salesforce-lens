<script lang="ts">
  import type { SnapshotInfo } from "../lib/types";
  import { formatDate, formatDateTime, getDaysUntilExpiration, truncateText } from "../lib/dateUtils";
  import { getSnapshotExpirationClass, getStatusClass } from "../lib/colorUtils";
  import { SearchBox, SelectFilter, LoadingState, ErrorState, EmptyState } from "./common";
  import { postMessage } from "../lib/vscode";

  interface Props {
    snapshots: SnapshotInfo[];
    loading: boolean;
    error: string | null;
    unavailable: boolean;
    devHubUsername: string;
  }

  let { snapshots, loading, error, unavailable, devHubUsername }: Props = $props();

  let searchQuery = $state("");
  let filterStatus = $state<string>("all");
  let selectedSnapshots = $state<Set<string>>(new Set());
  let isDeleting = $state(false);

  // Reset selection when snapshots change
  $effect(() => {
    snapshots;
    selectedSnapshots = new Set();
  });

  // Get unique statuses for filter dropdown
  const uniqueStatuses = $derived(() => {
    const statuses = new Set(snapshots.map((s) => s.status));
    return Array.from(statuses).sort();
  });

  // Build status filter options
  const statusOptions = $derived.by(() => {
    const options = [{ value: "all", label: "All" }];
    for (const status of uniqueStatuses()) {
      options.push({ value: status, label: status });
    }
    return options;
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

  const allSelected = $derived(
    filteredSnapshots.length > 0 &&
      filteredSnapshots.every((snapshot) => selectedSnapshots.has(snapshot.id))
  );

  const someSelected = $derived(
    selectedSnapshots.size > 0 && !allSelected
  );

  function toggleSelectAll() {
    if (allSelected) {
      selectedSnapshots = new Set();
    } else {
      selectedSnapshots = new Set(filteredSnapshots.map((s) => s.id));
    }
  }

  function toggleSelect(snapshotId: string) {
    const next = new Set(selectedSnapshots);
    if (next.has(snapshotId)) {
      next.delete(snapshotId);
    } else {
      next.add(snapshotId);
    }
    selectedSnapshots = next;
  }

  function deleteSelected() {
    const snapshotsToDelete = snapshots
      .filter((snapshot) => selectedSnapshots.has(snapshot.id))
      .map((snapshot) => ({
        id: snapshot.id,
        devHubUsername,
      }));

    if (snapshotsToDelete.length === 0) {
      return;
    }

    postMessage({
      command: "deleteSnapshots",
      snapshots: snapshotsToDelete,
    });
  }

  // Listen for snapshot delete lifecycle messages from the extension
  $effect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.command) {
        case "snapshotsDeleteStarted":
          isDeleting = true;
          break;

        case "snapshotsDeleteCompleted":
          isDeleting = false;
          selectedSnapshots = new Set();
          break;

        case "snapshotsDeleteCancelled":
        case "snapshotsDeleteError":
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

<div class="snapshot-list">
  {#if unavailable}
    <EmptyState
      icon="codicon-lock"
      title="Snapshots Not Available"
      message="Org snapshots are not enabled for this DevHub or you don't have permission to access them."
    />
  {:else if loading}
    <LoadingState message="Loading snapshots..." />
  {:else if error}
    <ErrorState title="Failed to load snapshots" message={error} />
  {:else}
    <div class="controls">
      <SearchBox
        value={searchQuery}
        placeholder="Search by name, owner, source org..."
        onchange={(v) => (searchQuery = v)}
      />

      <SelectFilter
        id="status-select"
        label="Status:"
        icon="codicon-filter"
        value={filterStatus}
        options={statusOptions}
        onchange={(v) => (filterStatus = v)}
      />

      {#if selectedSnapshots.size > 0}
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
            Delete ({selectedSnapshots.size})
          {/if}
        </button>
      {/if}
    </div>

    {#if filteredSnapshots.length === 0}
      <EmptyState
        icon="codicon-package"
        title="No snapshots found"
        message={searchQuery || filterStatus !== "all"
          ? "Try adjusting your search or filter criteria"
          : "This DevHub doesn't have any org snapshots yet"}
      />
    {:else}
      <div class="snapshots-container">
        {#each filteredSnapshots as snapshot (snapshot.id)}
          {@const daysUntilExp = getDaysUntilExpiration(snapshot.expirationDate)}
          {@const expClass = getSnapshotExpirationClass(snapshot.expirationDate)}
          {@const statusClass = getStatusClass(snapshot.status)}
          <div class="snapshot-card" class:selected={selectedSnapshots.has(snapshot.id)}>
            <div class="snapshot-header">
              <div class="snapshot-name-row">
                <input
                  type="checkbox"
                  class="snapshot-checkbox"
                  checked={selectedSnapshots.has(snapshot.id)}
                  onchange={() => toggleSelect(snapshot.id)}
                  title="Select snapshot for deletion"
                />
                <span class="codicon codicon-package snapshot-icon"></span>
                <h4 class="snapshot-name">{snapshot.snapshotName} <span class="snapshot-id monospace">({snapshot.id})</span></h4>
                <span class="status-pill {statusClass}">{snapshot.status}</span>
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
                  <span class="detail-value {expClass}">
                    {#if snapshot.expirationDate}
                      {formatDate(snapshot.expirationDate)}
                      {#if daysUntilExp !== null}
                        <span class="days-remaining">({daysUntilExp}d)</span>
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
    transition: border-color 0.1s, background 0.1s;
  }

  .snapshot-card:hover {
    border-color: var(--vscode-focusBorder);
  }

  .snapshot-card.selected {
    border-color: var(--vscode-list-activeSelectionBackground);
    background: var(--vscode-list-activeSelectionBackground);
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

  .snapshot-checkbox {
    width: 14px;
    height: 14px;
    cursor: pointer;
    accent-color: var(--vscode-button-background);
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

  .monospace {
    font-family: var(--vscode-editor-font-family, monospace);
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
