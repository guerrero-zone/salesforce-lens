import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import Counter from "./Counter.svelte";

describe("Counter Component", () => {
  beforeEach(() => {
    // Clean up before each test
  });

  it("should render with initial count of 0", () => {
    render(Counter);
    const button = screen.getByRole("button");
    expect(button.textContent).toContain("count is 0");
  });

  it("should increment count when clicked", async () => {
    render(Counter);
    const button = screen.getByRole("button");

    // Initial state
    expect(button.textContent).toContain("count is 0");

    // Click the button
    await fireEvent.click(button);

    // Count should be incremented
    expect(button.textContent).toContain("count is 1");
  });

  it("should increment count multiple times", async () => {
    render(Counter);
    const button = screen.getByRole("button");

    // Click multiple times
    await fireEvent.click(button);
    await fireEvent.click(button);
    await fireEvent.click(button);

    // Count should be 3
    expect(button.textContent).toContain("count is 3");
  });

  it("should render as a button element", () => {
    render(Counter);
    const button = screen.getByRole("button");
    expect(button.tagName).toBe("BUTTON");
  });
});

