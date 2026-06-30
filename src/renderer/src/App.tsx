import { useState } from "react";
import { AgentSelect } from "./AgentSelect";
import { Shell } from "./features/shell/Shell";
import { AGENTS_KEY, REMEMBER_KEY } from "./lib/storageKeys";

export default function App() {
  const [agents, setAgents] = useState<string[] | null>(() => {
    const remember = localStorage.getItem(REMEMBER_KEY) === "1";
    if (!remember) return null;
    try {
      const stored = JSON.parse(localStorage.getItem(AGENTS_KEY) ?? "[]");
      return Array.isArray(stored) && stored.length ? stored : null;
    } catch {
      return null;
    }
  });
  const [remember, setRemember] = useState(
    () => localStorage.getItem(REMEMBER_KEY) === "1",
  );
  const [pickerOpen, setPickerOpen] = useState(!agents);

  function confirmAgents(next: string[], rememberNext: boolean) {
    setAgents(next);
    setRemember(rememberNext);
    if (rememberNext) {
      localStorage.setItem(AGENTS_KEY, JSON.stringify(next));
      localStorage.setItem(REMEMBER_KEY, "1");
    } else {
      localStorage.removeItem(AGENTS_KEY);
      localStorage.removeItem(REMEMBER_KEY);
    }
    setPickerOpen(false);
  }

  const pickerInitial =
    agents ??
    (() => {
      try {
        const v = JSON.parse(localStorage.getItem(AGENTS_KEY) ?? "[]");
        return Array.isArray(v) ? v : [];
      } catch {
        return [];
      }
    })();

  return (
    <>
      {agents && (
        <Shell
          agents={agents}
          rememberAgents={remember}
          onChangeAgents={() => setPickerOpen(true)}
        />
      )}
      {pickerOpen && (
        <div className="fixed inset-0 z-50">
          <AgentSelect
            initial={pickerInitial}
            rememberInitial={remember}
            onConfirm={confirmAgents}
          />
        </div>
      )}
    </>
  );
}
