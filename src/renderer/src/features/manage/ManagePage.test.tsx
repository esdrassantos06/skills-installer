import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { installMockApi, type MockApi } from "../../test/mockApi";
import { ManagePage } from "./ManagePage";
import type { InstalledSkill } from "../../../../main/installedList";

const SKILLS: InstalledSkill[] = [
  { name: "zeta", source: "acme/tools", agents: ["Claude Code", "Cursor"] },
  { name: "alpha", source: null, agents: ["Claude Code"] },
];

type RemoveResult = { skills: InstalledSkill[] | null; error: string | null };

let mock: MockApi;

beforeEach(() => {
  mock = installMockApi();
  vi.mocked(mock.api.listInstalled).mockResolvedValue({
    skills: SKILLS,
    error: null,
  });
});

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

async function openAgent(name: RegExp) {
  await userEvent.click(await screen.findByRole("button", { name }));
  return screen.getByRole("region", { name });
}

describe("ManagePage", () => {
  it("shows one collapsed section per agent with its skill count", async () => {
    render(<ManagePage />);

    const claude = await screen.findByRole("button", { name: /Claude Code/ });
    expect(claude).toHaveAttribute("aria-expanded", "false");
    expect(claude).toHaveTextContent("2");
    expect(screen.getByRole("button", { name: /Cursor/ })).toHaveTextContent(
      "1",
    );
    expect(screen.queryByText("alpha")).not.toBeInTheDocument();
  });

  it("groups agents that share ~/.agents/skills into one Shared section", async () => {
    vi.mocked(mock.api.listInstalled).mockResolvedValue({
      skills: [{ name: "x", source: null, agents: ["Cursor", "Codex"] }],
      error: null,
    });
    render(<ManagePage />);

    const header = await screen.findByRole("button", { name: /Shared/ });
    expect(header).toHaveTextContent(/Codex.*Cursor/);
    expect(
      screen.getAllByRole("button", { name: /Shared|Cursor|Codex/ }),
    ).toHaveLength(1);
  });

  it("lists the agent's skills when its section opens", async () => {
    render(<ManagePage />);
    const region = await openAgent(/Claude Code/);

    const items = within(region).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining("alpha"),
      expect.stringContaining("zeta"),
    ]);
    expect(within(region).getByText("acme/tools")).toBeInTheDocument();
  });

  it("filters by name or source and opens the matching sections", async () => {
    render(<ManagePage />);
    await screen.findByRole("button", { name: /Claude Code/ });

    await userEvent.type(screen.getByLabelText("Filter skills"), "ALP");

    expect(screen.queryByRole("button", { name: /Cursor/ })).toBeNull();
    const region = screen.getByRole("region", { name: /Claude Code/ });
    expect(within(region).getByText("alpha")).toBeInTheDocument();
    expect(within(region).queryByText("zeta")).toBeNull();
  });

  it("keeps a section the user opened open while searching", async () => {
    render(<ManagePage />);
    await openAgent(/Claude Code/);

    await userEvent.type(screen.getByLabelText("Filter skills"), "alp");

    expect(
      screen.getByRole("region", { name: /Claude Code/ }),
    ).toBeInTheDocument();
  });

  it("removes a skill from one agent optimistically after confirming", async () => {
    const pending = deferred<RemoveResult>();
    vi.mocked(mock.api.removeSkills).mockReturnValue(pending.promise);
    render(<ManagePage />);
    const region = await openAgent(/Claude Code/);

    await userEvent.click(
      within(region).getByRole("button", { name: "Delete zeta" }),
    );
    expect(mock.api.removeSkills).not.toHaveBeenCalled();
    await userEvent.click(
      within(region).getByRole("button", { name: "Confirm delete zeta" }),
    );

    expect(mock.api.removeSkills).toHaveBeenCalledWith(
      [{ name: "zeta", agentIds: ["claude-code"] }],
      null,
    );
    expect(within(region).queryByText("zeta")).toBeNull();

    pending.resolve({
      skills: [{ ...SKILLS[0], agents: ["Cursor"] }, SKILLS[1]],
      error: null,
    });
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Claude Code/ }),
      ).toHaveTextContent("1"),
    );
    expect(within(region).queryByText("zeta")).toBeNull();
    expect(screen.getByRole("button", { name: /Cursor/ })).toHaveTextContent(
      "1",
    );
  });

  it("puts the skill back and shows the error when removal fails", async () => {
    vi.mocked(mock.api.removeSkills).mockResolvedValue({
      skills: SKILLS,
      error: "boom",
    });
    render(<ManagePage />);
    const region = await openAgent(/Claude Code/);

    await userEvent.click(
      within(region).getByRole("button", { name: "Delete zeta" }),
    );
    await userEvent.click(
      within(region).getByRole("button", { name: "Confirm delete zeta" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("boom");
    expect(within(region).getByText("zeta")).toBeInTheDocument();
  });

  it("shows selection actions once a skill is selected", async () => {
    render(<ManagePage />);
    const region = await openAgent(/Claude Code/);
    expect(screen.queryByText(/selected/)).toBeNull();

    await userEvent.click(
      within(region).getByRole("checkbox", { name: "Select alpha" }),
    );

    const bar = screen.getByRole("toolbar", { name: "Selection" });
    expect(bar).toHaveTextContent("1 selected");
    await userEvent.click(
      within(bar).getByRole("button", { name: "Select all (2)" }),
    );
    expect(bar).toHaveTextContent("2 selected");
    expect(
      within(region).getByRole("checkbox", { name: "Select zeta" }),
    ).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: /Shared/ }));
    const sharedRegion = screen.getByRole("region", { name: /Shared/ });
    expect(
      within(sharedRegion).getByRole("checkbox", { name: "Select zeta" }),
    ).not.toBeChecked();

    await userEvent.click(within(bar).getByRole("button", { name: "Clear" }));
    expect(screen.queryByRole("toolbar", { name: "Selection" })).toBeNull();
  });

  it("selects all only among filtered skills of the sections with a selection", async () => {
    render(<ManagePage />);
    const region = await openAgent(/Claude Code/);
    await userEvent.click(
      within(region).getByRole("checkbox", { name: "Select alpha" }),
    );
    await userEvent.type(screen.getByLabelText("Filter skills"), "zeta");

    await userEvent.click(
      screen.getByRole("button", { name: "Select all (1)" }),
    );
    expect(
      screen.getByRole("toolbar", { name: "Selection" }),
    ).toHaveTextContent("2 selected");
  });

  it("deletes every selected skill in one batch, optimistically", async () => {
    const pending = deferred<RemoveResult>();
    vi.mocked(mock.api.removeSkills).mockReturnValue(pending.promise);
    render(<ManagePage />);
    const region = await openAgent(/Claude Code/);

    await userEvent.click(
      within(region).getByRole("checkbox", { name: "Select alpha" }),
    );
    await userEvent.click(
      within(region).getByRole("checkbox", { name: "Select zeta" }),
    );
    const bar = screen.getByRole("toolbar", { name: "Selection" });
    await userEvent.click(
      within(bar).getByRole("button", { name: "Delete selected (2)" }),
    );
    expect(mock.api.removeSkills).not.toHaveBeenCalled();
    await userEvent.click(
      within(bar).getByRole("button", { name: "Confirm delete 2 skills" }),
    );

    expect(mock.api.removeSkills).toHaveBeenCalledWith(
      [
        { name: "alpha", agentIds: ["claude-code"] },
        { name: "zeta", agentIds: ["claude-code"] },
      ],
      null,
    );
    expect(screen.queryByRole("button", { name: /Claude Code/ })).toBeNull();
    expect(screen.queryByRole("toolbar", { name: "Selection" })).toBeNull();

    pending.resolve({
      skills: [{ ...SKILLS[0], agents: ["Cursor"] }],
      error: null,
    });
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Cursor/ }),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: /Claude Code/ })).toBeNull();
  });

  it("lists global skills by default", async () => {
    render(<ManagePage />);
    await screen.findByRole("button", { name: /Claude Code/ });
    expect(mock.api.listInstalled).toHaveBeenCalledWith(null);
    expect(screen.getByRole("tab", { name: "Global" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("asks to add a project on the Project tab when none is listed", async () => {
    render(<ManagePage />);
    await userEvent.click(screen.getByRole("tab", { name: "Project" }));

    expect(screen.getByText("No projects yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Folder" })).toBeVisible();
    expect(mock.api.listInstalled).not.toHaveBeenCalledWith(expect.any(String));
  });

  it("shows one section per project, named after its folder", async () => {
    vi.mocked(mock.api.chooseFolder)
      .mockResolvedValueOnce("/work/proj")
      .mockResolvedValueOnce("/work/other");
    render(<ManagePage />);
    await userEvent.click(screen.getByRole("tab", { name: "Project" }));
    await userEvent.click(screen.getByRole("button", { name: "Add Folder" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Add Folder" }),
    );

    const proj = await screen.findByRole("button", { name: /^proj/ });
    expect(proj).toHaveTextContent("/work/proj");
    expect(proj).toHaveTextContent("3");
    expect(
      await screen.findByRole("button", { name: /^other/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Claude Code/ })).toBeNull();
    expect(mock.api.listInstalled).toHaveBeenCalledWith("/work/proj");
    expect(mock.api.listInstalled).toHaveBeenCalledWith("/work/other");
  });

  it("lists a project's skills tagged with their agent and deletes from that project", async () => {
    vi.mocked(mock.api.chooseFolder).mockResolvedValue("/work/proj");
    vi.mocked(mock.api.removeSkills).mockResolvedValue({
      skills: [SKILLS[0]],
      error: null,
    });
    render(<ManagePage />);
    await userEvent.click(screen.getByRole("tab", { name: "Project" }));
    await userEvent.click(screen.getByRole("button", { name: "Add Folder" }));

    const region = await openAgent(/^proj/);
    const rows = within(region).getAllByRole("listitem");
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringMatching(/alpha.*Claude Code/),
      expect.stringMatching(/zeta.*Claude Code/),
      expect.stringMatching(/zeta.*Shared/),
    ]);

    await userEvent.click(
      within(rows[0]).getByRole("button", { name: "Delete alpha" }),
    );
    await userEvent.click(
      within(rows[0]).getByRole("button", { name: "Confirm delete alpha" }),
    );
    expect(mock.api.removeSkills).toHaveBeenCalledWith(
      [{ name: "alpha", agentIds: ["claude-code"] }],
      "/work/proj",
    );
  });

  it("takes a project off the list without deleting anything", async () => {
    vi.mocked(mock.api.chooseFolder).mockResolvedValue("/work/proj");
    render(<ManagePage />);
    await userEvent.click(screen.getByRole("tab", { name: "Project" }));
    await userEvent.click(screen.getByRole("button", { name: "Add Folder" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Remove proj from list" }),
    );

    expect(screen.queryByRole("button", { name: /^proj/ })).toBeNull();
    expect(mock.api.removeSkills).not.toHaveBeenCalled();
    expect(screen.getByText("No projects yet")).toBeInTheDocument();
  });

  it("focuses the filter with Cmd+J or Ctrl+J", async () => {
    render(<ManagePage />);
    await screen.findByRole("button", { name: /Claude Code/ });
    const filter = screen.getByLabelText("Filter skills");

    await userEvent.keyboard("{Meta>}j{/Meta}");
    expect(filter).toHaveFocus();
    filter.blur();
    await userEvent.keyboard("{Control>}j{/Control}");
    expect(filter).toHaveFocus();
  });

  it("drives the selection bar with A, C and D", async () => {
    render(<ManagePage />);
    const region = await openAgent(/Claude Code/);
    const pick = () =>
      userEvent.click(
        within(region).getByRole("checkbox", { name: "Select alpha" }),
      );

    await pick();
    await userEvent.keyboard("a");
    expect(
      screen.getByRole("toolbar", { name: "Selection" }),
    ).toHaveTextContent("2 selected");
    await userEvent.keyboard("c");
    expect(screen.queryByRole("toolbar", { name: "Selection" })).toBeNull();

    await pick();
    await userEvent.keyboard("d");
    expect(mock.api.removeSkills).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Confirm delete 1 skill" }),
    ).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(
      screen.getByRole("button", { name: "Delete selected (1)" }),
    ).toBeInTheDocument();
    await userEvent.keyboard("d");
    await userEvent.keyboard("d");
    expect(mock.api.removeSkills).toHaveBeenCalledWith(
      [{ name: "alpha", agentIds: ["claude-code"] }],
      null,
    );
  });

  it("ignores the letter shortcuts while typing in the filter", async () => {
    render(<ManagePage />);
    const region = await openAgent(/Claude Code/);
    await userEvent.click(
      within(region).getByRole("checkbox", { name: "Select alpha" }),
    );
    await userEvent.type(screen.getByLabelText("Filter skills"), "acd");

    expect(
      screen.getByRole("toolbar", { name: "Selection" }),
    ).toHaveTextContent("1 selected");
    expect(mock.api.removeSkills).not.toHaveBeenCalled();
  });

  it("shows the error when listing fails", async () => {
    vi.mocked(mock.api.listInstalled).mockResolvedValue({
      skills: [],
      error: "cli failed",
    });
    render(<ManagePage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("cli failed");
  });
});
