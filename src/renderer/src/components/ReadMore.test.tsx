import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReadMore } from "./ReadMore";

function mockOverflow(scrollHeight: number, clientHeight: number) {
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(
    scrollHeight,
  );
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(
    clientHeight,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ReadMore", () => {
  it("hides the toggle when content fits", () => {
    mockOverflow(40, 40);
    render(<ReadMore collapsedClassName="line-clamp-3">short</ReadMore>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("clamps overflowing content and expands on demand", async () => {
    mockOverflow(200, 60);
    render(<ReadMore collapsedClassName="line-clamp-3">long text</ReadMore>);

    const content = screen.getByText("long text");
    expect(content).toHaveClass("line-clamp-3");

    const toggle = screen.getByRole("button", { name: "Read more" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(toggle);
    expect(content).not.toHaveClass("line-clamp-3");
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});
