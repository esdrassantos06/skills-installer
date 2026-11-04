import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { installMockApi, type MockApi } from "../../test/mockApi";
import { Installer } from "./Installer";

let mock: MockApi;

beforeEach(() => {
  mock = installMockApi();
});

function renderInstaller() {
  render(
    <Installer
      agents={["claude-code"]}
      rememberAgents={false}
      onChangeAgents={() => {}}
      input="a/b@c"
      setInput={() => {}}
    />,
  );
}

const install = () =>
  userEvent.click(screen.getByRole("button", { name: /^Install/ }));

describe("Installer target folder", () => {
  it("installs globally when no folder is chosen", async () => {
    renderInstaller();
    await install();
    expect(mock.api.installAll).toHaveBeenCalledWith(["a/b@c"], {
      agents: ["claude-code"],
      global: true,
      force: false,
      cwd: null,
    });
  });

  it("installs into the chosen folder as a project install", async () => {
    vi.mocked(mock.api.chooseFolder).mockResolvedValue("/work/proj");
    renderInstaller();

    await userEvent.click(
      screen.getByRole("button", { name: "Choose Folder" }),
    );
    expect(
      await screen.findByRole("button", { name: "Remove folder" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("banner")).toHaveTextContent("cwd=proj");
    await install();

    expect(mock.api.installAll).toHaveBeenCalledWith(["a/b@c"], {
      agents: ["claude-code"],
      global: false,
      force: false,
      cwd: "/work/proj",
    });
  });

  it("goes back to global after removing the folder", async () => {
    vi.mocked(mock.api.chooseFolder).mockResolvedValue("/work/proj");
    renderInstaller();
    await userEvent.click(
      screen.getByRole("button", { name: "Choose Folder" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Remove folder" }),
    );
    await install();

    expect(mock.api.installAll).toHaveBeenCalledWith(
      ["a/b@c"],
      expect.objectContaining({ global: true, cwd: null }),
    );
    expect(screen.getByRole("button", { name: "Choose Folder" })).toBeVisible();
  });

  it("replaces Choose Folder with the folder chip once a folder is chosen", async () => {
    vi.mocked(mock.api.chooseFolder).mockResolvedValue("/work/proj");
    renderInstaller();
    await userEvent.click(
      screen.getByRole("button", { name: "Choose Folder" }),
    );
    await screen.findByRole("button", { name: "Remove folder" });

    expect(screen.queryByRole("button", { name: "Choose Folder" })).toBeNull();
  });

  it("keeps the current target when the folder dialog is cancelled", async () => {
    vi.mocked(mock.api.chooseFolder).mockResolvedValue(null);
    renderInstaller();
    await userEvent.click(
      screen.getByRole("button", { name: "Choose Folder" }),
    );
    await install();
    expect(mock.api.installAll).toHaveBeenCalledWith(
      ["a/b@c"],
      expect.objectContaining({ global: true, cwd: null }),
    );
  });

  it("remembers the chosen folder across sessions", async () => {
    vi.mocked(mock.api.chooseFolder).mockResolvedValue("/work/proj");
    renderInstaller();
    await userEvent.click(
      screen.getByRole("button", { name: "Choose Folder" }),
    );
    await screen.findByRole("button", { name: "Remove folder" });

    document.body.innerHTML = "";
    renderInstaller();
    expect(
      screen.getByRole("button", { name: "Remove folder" }),
    ).toBeInTheDocument();
  });

  it("shows the error and stops running when the install is rejected", async () => {
    vi.mocked(mock.api.installAll).mockRejectedValue(
      new Error("Folder not found: /work/proj"),
    );
    renderInstaller();
    await install();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Folder not found: /work/proj",
    );
    expect(screen.getByRole("button", { name: /^Install/ })).toBeEnabled();
  });
});
