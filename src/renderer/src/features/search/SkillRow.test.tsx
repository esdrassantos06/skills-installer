import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SkillRow } from "./SkillRow";

const SKILL = {
  id: "anthropics/skills/frontend-design",
  skillId: "frontend-design",
  name: "frontend-design",
  source: "anthropics/skills",
  installs: 1040984,
};

describe("SkillRow", () => {
  it("links the skill name to its detail route", () => {
    render(
      <ul>
        <SkillRow skill={SKILL} onAdd={() => {}} />
      </ul>,
    );
    expect(
      screen.getByRole("link", { name: "frontend-design" }),
    ).toHaveAttribute("href", "#/skills/anthropics/skills/frontend-design");
  });

  it("keeps the add button separate from the link", async () => {
    const onAdd = vi.fn();
    render(
      <ul>
        <SkillRow skill={SKILL} onAdd={onAdd} />
      </ul>,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /add frontend-design/i }),
    );
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
