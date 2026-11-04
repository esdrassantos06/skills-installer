import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "./SearchBar";

function renderBar() {
  render(
    <SearchBar
      query=""
      onQueryChange={() => {}}
      loading={false}
      sort="installs-desc"
      onSortChange={() => {}}
      onClear={() => {}}
      clearDisabled
    />,
  );
}

describe("SearchBar", () => {
  it("focuses the search with Cmd+J or Ctrl+J", async () => {
    renderBar();
    const input = screen.getByLabelText("Search query");
    await userEvent.keyboard("{Meta>}j{/Meta}");
    expect(input).toHaveFocus();
    input.blur();
    await userEvent.keyboard("{Control>}j{/Control}");
    expect(input).toHaveFocus();
  });

  it("does not steal focus while its page is hidden", async () => {
    render(
      <div className="hidden">
        <SearchBar
          query=""
          onQueryChange={() => {}}
          loading={false}
          sort="installs-desc"
          onSortChange={() => {}}
          onClear={() => {}}
          clearDisabled
        />
      </div>,
    );
    await userEvent.keyboard("{Meta>}j{/Meta}");
    expect(screen.getByLabelText("Search query")).not.toHaveFocus();
  });
});
