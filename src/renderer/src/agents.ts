export type AgentDef = {
  id: string;
  label: string;
  hint: string;
};

export const KNOWN_AGENTS: AgentDef[] = [
  { id: 'claude-code', label: 'Claude Code', hint: 'Anthropic CLI' },
  { id: 'cursor', label: 'Cursor', hint: 'Cursor IDE' },
  { id: 'codex', label: 'Codex', hint: 'OpenAI Codex CLI' },
  { id: 'opencode', label: 'OpenCode', hint: 'opencode CLI' },
  { id: 'antigravity', label: 'Antigravity', hint: 'Google Antigravity' },
  { id: 'windsurf', label: 'Windsurf', hint: 'Codeium Windsurf' },
  { id: 'gemini', label: 'Gemini', hint: 'Gemini Code Assist' },
  { id: 'copilot', label: 'Copilot', hint: 'GitHub Copilot' },
  { id: 'continue', label: 'Continue', hint: 'continue.dev' },
];
