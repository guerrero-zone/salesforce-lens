import type { VsCodeApi } from "./types";

// Acquire the VS Code API once and cache it
let vscode: VsCodeApi | null = null;

export function getVsCodeApi(): VsCodeApi {
  if (!vscode) {
    try {
      vscode = acquireVsCodeApi();
    } catch {
      // Running outside of VS Code (e.g., in a browser for development)
      console.warn("Running outside of VS Code, using mock API");
      vscode = {
        postMessage: (message: object) => {
          console.log("VS Code postMessage:", message);
        },
        getState: () => null,
        setState: () => {},
      };
    }
  }
  return vscode;
}

export function postMessage(message: object): void {
  getVsCodeApi().postMessage(message);
}
