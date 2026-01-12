import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/svelte";

// Mock the VS Code API before importing App
vi.mock("./lib/vscode", () => ({
  postMessage: vi.fn(),
  getVsCodeApi: () => ({
    postMessage: vi.fn(),
    getState: () => null,
    setState: () => {},
  }),
}));

// Import after mocking
import App from "./App.svelte";
import { postMessage } from "./lib/vscode";

describe("App Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render the main heading", () => {
    render(App);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("Salesforce Lens");
  });

  it("should render the tagline", () => {
    render(App);
    const tagline = screen.getByText(/manage your scratch org ecosystem/i);
    expect(tagline).toBeTruthy();
  });

  it("should render the refresh button", () => {
    render(App);
    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    expect(refreshButton).toBeTruthy();
  });

  it("should show loading state initially", () => {
    render(App);
    const loadingText = screen.getByText(/loading devhubs/i);
    expect(loadingText).toBeTruthy();
  });

  it("should call postMessage to get DevHubs on mount", () => {
    render(App);

    // First message indicates the webview is ready
    expect(postMessage).toHaveBeenNthCalledWith(1, { command: "webviewReady" });
    // Second message actually requests DevHubs
    expect(postMessage).toHaveBeenNthCalledWith(2, {
      command: "getDevHubs",
      forceRefresh: false,
    });
  });
});

describe("App Component Structure", () => {
  it("should have the app container", () => {
    render(App);
    const app = document.querySelector(".app");
    expect(app).toBeTruthy();
  });

  it("should have a dashboard header", () => {
    render(App);
    const header = document.querySelector(".dashboard-header");
    expect(header).toBeTruthy();
  });

  it("should have a logo with codicon", () => {
    render(App);
    const logo = document.querySelector(".logo");
    expect(logo).toBeTruthy();
    const icon = logo?.querySelector(".codicon");
    expect(icon).toBeTruthy();
  });
});
