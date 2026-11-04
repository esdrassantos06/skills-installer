import { useCallback, useEffect, useState } from "react";
import type { Skill } from "../../../../main/searchReducer";
import { Tabs, type Tab } from "../../components/Tabs";
import { Footer } from "../../components/Footer";
import { appendUniqueLines } from "../../lib/lines";
import { VIEW_KEY, INPUT_KEY } from "../../lib/storageKeys";
import { closeSkillRoute, useSkillRoute } from "../../lib/route";
import { Installer } from "../installer/Installer";
import { SearchPage } from "../search/SearchPage";
import { ManagePage } from "../manage/ManagePage";
import { SkillPage } from "../skill/SkillPage";

type View = "installer" | "search" | "manage";

const TABS: Tab<View>[] = [
  { id: "installer", label: "Installer" },
  { id: "search", label: "Search" },
  { id: "manage", label: "Manage" },
];

export function Shell({
  agents,
  rememberAgents,
  onChangeAgents,
}: {
  agents: string[];
  rememberAgents: boolean;
  onChangeAgents: () => void;
}) {
  const [view, setView] = useState<View>(
    () => (localStorage.getItem(VIEW_KEY) as View) || "installer",
  );
  const skillId = useSkillRoute();
  const [input, setInput] = useState(
    () => localStorage.getItem(INPUT_KEY) ?? "",
  );

  useEffect(() => {
    localStorage.setItem(INPUT_KEY, input);
  }, [input]);

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view);
  }, [view]);

  const appendSkill = useCallback((skill: Skill) => {
    const line = `${skill.source}@${skill.skillId}`;
    setInput((cur) => appendUniqueLines(cur, [line]));
  }, []);

  return (
    <div className="flex h-full flex-col">
      <Tabs
        tabs={TABS}
        active={view}
        onChange={(next) => {
          setView(next);
          if (skillId) location.hash = "";
        }}
      />
      <div className="relative min-h-0 flex-1">
        <div
          role="tabpanel"
          id="panel-installer"
          aria-labelledby="tab-installer"
          className={`absolute inset-0 ${view === "installer" && !skillId ? "" : "hidden"}`}
        >
          <Installer
            agents={agents}
            rememberAgents={rememberAgents}
            onChangeAgents={onChangeAgents}
            input={input}
            setInput={setInput}
          />
        </div>
        <div
          role="tabpanel"
          id="panel-search"
          aria-labelledby="tab-search"
          className={`absolute inset-0 ${view === "search" && !skillId ? "" : "hidden"}`}
        >
          <SearchPage onAddToInstaller={appendSkill} />
        </div>
        {view === "manage" && !skillId && (
          <div
            role="tabpanel"
            id="panel-manage"
            aria-labelledby="tab-manage"
            className="absolute inset-0"
          >
            <ManagePage />
          </div>
        )}
        {skillId && (
          <div className="absolute inset-0">
            <SkillPage
              key={skillId}
              id={skillId}
              onBack={closeSkillRoute}
              onAdd={appendSkill}
            />
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
