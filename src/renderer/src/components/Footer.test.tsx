import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "./Footer";

describe("Footer", () => {
  it("renders the three social links with accessible names and correct hrefs", () => {
    render(<Footer />);

    const github = screen.getByRole("link", { name: "GitHub" });
    expect(github).toHaveAttribute("href", "https://github.com/esdrassantos06");

    const linkedin = screen.getByRole("link", { name: "LinkedIn" });
    expect(linkedin).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/esdrassantos06",
    );

    const portfolio = screen.getByRole("link", { name: "Portfolio" });
    expect(portfolio).toHaveAttribute("href", "https://portfolioesdras.com");
  });

  it("opens links in the external browser safely", () => {
    render(<Footer />);
    for (const name of ["GitHub", "LinkedIn", "Portfolio"]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
      expect(link.getAttribute("rel")).toContain("noreferrer");
    }
  });
});
