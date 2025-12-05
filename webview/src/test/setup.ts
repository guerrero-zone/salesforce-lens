import "@testing-library/svelte/vitest";
import { vi } from "vitest";

// Mock the VS Code API for webview tests
const mockVsCodeApi = {
  postMessage: vi.fn(),
  getState: vi.fn(() => ({})),
  setState: vi.fn(),
};

// Make acquireVsCodeApi available globally
(globalThis as any).acquireVsCodeApi = vi.fn(() => mockVsCodeApi);

// Export for use in tests
export { mockVsCodeApi };

