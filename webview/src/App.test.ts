import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import App from "./App.svelte";

describe("App Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the main heading", () => {
    render(App);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("Vite + Svelte");
  });

  it("should render the Vite logo with link", () => {
    render(App);
    const viteLink = screen.getByRole("link", { name: /vite logo/i });
    expect(viteLink).toBeTruthy();
    expect(viteLink.getAttribute("href")).toBe("https://vite.dev");
    expect(viteLink.getAttribute("target")).toBe("_blank");
  });

  it("should render the Svelte logo with link", () => {
    render(App);
    const svelteLink = screen.getByRole("link", { name: /svelte logo/i });
    expect(svelteLink).toBeTruthy();
    expect(svelteLink.getAttribute("href")).toBe("https://svelte.dev");
    expect(svelteLink.getAttribute("target")).toBe("_blank");
  });

  it("should render the Counter component", () => {
    render(App);
    const counterButton = screen.getByRole("button", { name: /count is/i });
    expect(counterButton).toBeTruthy();
  });

  it("should render the SvelteKit link", () => {
    render(App);
    const svelteKitLink = screen.getByRole("link", { name: /sveltekit/i });
    expect(svelteKitLink).toBeTruthy();
    expect(svelteKitLink.getAttribute("href")).toBe(
      "https://github.com/sveltejs/kit#readme"
    );
  });

  it("should render the help text", () => {
    render(App);
    const helpText = screen.getByText(/click on the vite and svelte logos/i);
    expect(helpText).toBeTruthy();
  });

  it("should have proper accessibility - logos have alt text", () => {
    render(App);
    const viteImg = screen.getByAltText("Vite Logo");
    const svelteImg = screen.getByAltText("Svelte Logo");
    expect(viteImg).toBeTruthy();
    expect(svelteImg).toBeTruthy();
  });

  it("should have logo images with correct classes", () => {
    render(App);
    const viteImg = screen.getByAltText("Vite Logo");
    const svelteImg = screen.getByAltText("Svelte Logo");

    expect(viteImg.classList.contains("logo")).toBe(true);
    expect(svelteImg.classList.contains("logo")).toBe(true);
    expect(svelteImg.classList.contains("svelte")).toBe(true);
  });
});

describe("App Component Structure", () => {
  it("should have a main element", () => {
    render(App);
    const main = document.querySelector("main");
    expect(main).toBeTruthy();
  });

  it("should have a card div containing the counter", () => {
    render(App);
    const card = document.querySelector(".card");
    expect(card).toBeTruthy();

    // Counter should be inside the card
    const button = card?.querySelector("button");
    expect(button).toBeTruthy();
    expect(button?.textContent).toContain("count is");
  });

  it("should have proper external link security", () => {
    render(App);
    const externalLinks = screen.getAllByRole("link");

    externalLinks.forEach((link) => {
      if (link.getAttribute("target") === "_blank") {
        expect(link.getAttribute("rel")).toContain("noreferrer");
      }
    });
  });
});

