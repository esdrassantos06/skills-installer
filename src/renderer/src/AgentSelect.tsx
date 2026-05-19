import { useState } from 'react';
import { KNOWN_AGENTS } from './agents';

type Props = {
  initial: string[];
  rememberInitial: boolean;
  onConfirm: (agents: string[], remember: boolean) => void;
};

export function AgentSelect({ initial, rememberInitial, onConfirm }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initial.length ? initial : ['claude-code']),
  );
  const [custom, setCustom] = useState('');
  const [remember, setRemember] = useState(rememberInitial);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addCustom() {
    const v = custom.trim();
    if (!v) return;
    setSelected((prev) => new Set([...prev, v]));
    setCustom('');
  }

  function confirm() {
    if (!selected.size) return;
    onConfirm([...selected], remember);
  }

  const knownIds = new Set(KNOWN_AGENTS.map((a) => a.id));
  const customSelected = [...selected].filter((id) => !knownIds.has(id));

  return (
    <div className="bg-canvas flex h-full items-center justify-center px-6">
      <div className="w-full max-w-xl">
        <header className="mb-6 text-center">
          <h1 className="text-[22px] font-semibold tracking-tight">
            Where should skills be installed?
          </h1>
          <p className="mt-1.5 text-[12px] text-muted">
            Pick one or more agents. Every skill gets installed for all of them.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-2">
          {KNOWN_AGENTS.map((a) => {
            const on = selected.has(a.id);
            return (
              <button
                key={a.id}
                onClick={() => toggle(a.id)}
                className={`group flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition ${
                  on
                    ? 'border-accent bg-accent-soft'
                    : 'border-border bg-panel hover:border-border-strong'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
                    on
                      ? 'border-accent bg-accent text-bg'
                      : 'border-border-strong text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-text">
                    {a.label}
                  </span>
                  <span className="block truncate text-[11px] text-subtle">
                    {a.hint} · <code>{a.id}</code>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {customSelected.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {customSelected.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 rounded-md border border-accent bg-accent-soft px-2 py-1 text-[11px]"
              >
                {id}
                <button
                  onClick={() => toggle(id)}
                  className="text-subtle hover:text-err"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addCustom();
            }}
            placeholder="custom agent (e.g. kilocode)"
            className="flex-1 rounded-md border border-border bg-panel px-3 py-1.5 text-[12px] outline-none placeholder:text-subtle focus:border-accent"
          />
          <button
            onClick={addCustom}
            disabled={!custom.trim()}
            className="rounded-md border border-border px-3 py-1.5 text-[12px] text-muted transition hover:border-accent hover:text-text disabled:opacity-40"
          >
            add
          </button>
        </div>

        <label className="mt-5 flex cursor-pointer items-center gap-2 text-[12.5px] text-muted">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--color-accent)]"
          />
          Remember for next sessions
        </label>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-[11px] text-subtle">
            {selected.size} agent{selected.size === 1 ? '' : 's'} selected
          </span>
          <button
            onClick={confirm}
            disabled={!selected.size}
            className="rounded-md bg-accent px-5 py-2 text-[13px] font-semibold text-bg transition hover:brightness-110 disabled:opacity-40"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
