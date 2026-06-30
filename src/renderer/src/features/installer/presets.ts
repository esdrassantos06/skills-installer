export type Preset = { label: string; hint: string; lines: string[] };

export const PRESETS: Preset[] = [
  {
    label: "Design",
    hint: "frontend, UI/UX",
    lines: [
      "anthropics/skills@frontend-design",
      "vercel-labs/agent-skills@web-design-guidelines",
      "nextlevelbuilder/ui-ux-pro-max-skill@ui-ux-pro-max",
      "leonxlnx/taste-skill@design-taste-frontend",
      "arvindrk/extract-design-system@extract-design-system",
      "wshobson/agents@tailwind-design-system",
    ],
  },
  {
    label: "React / Next / RN",
    hint: "web + mobile",
    lines: [
      "vercel-labs/agent-skills@vercel-react-best-practices",
      "vercel-labs/agent-skills@vercel-react-native-skills",
      "callstackincubator/agent-skills@react-native-best-practices",
      "vercel-labs/agent-skills@vercel-react-view-transitions",
      "wshobson/agents@nextjs-app-router-patterns",
    ],
  },
  {
    label: "Backend / TS",
    hint: "Node, Nest, types",
    lines: [
      "wshobson/agents@typescript-advanced-types",
      "dotneet/claude-code-marketplace@typescript-react-reviewer",
      "wshobson/agents@nodejs-backend-patterns",
      "mcollina/skills@node",
      "kadajett/agent-nestjs-skills@nestjs-best-practices",
    ],
  },
  {
    label: "Testing",
    hint: "vitest, e2e, playwright",
    lines: [
      "anthropics/skills@webapp-testing",
      "antfu/skills@vitest",
      "wshobson/agents@javascript-testing-patterns",
      "wshobson/agents@e2e-testing-patterns",
      "currents-dev/playwright-best-practices-skill@playwright-best-practices",
      "supercent-io/skills-template@testing-strategies",
    ],
  },
  {
    label: "Writing",
    hint: "anti-slop, prose",
    lines: [
      "brianlovin/claude-config@deslop",
      "jalaalrd/anti-ai-slop-writing@anti-ai-slop-writing",
      "obra/superpowers@writing-skills",
      "coreyhaines31/marketingskills@copywriting",
      "coreyhaines31/marketingskills@copy-editing",
      "supercent-io/skills-template@technical-writing",
    ],
  },
  {
    label: "Docs",
    hint: "README, API docs, ADRs",
    lines: [
      "anthropics/knowledge-work-plugins@documentation",
      "github/awesome-copilot@documentation-writer",
      "github/awesome-copilot@create-readme",
      "supercent-io/skills-template@api-documentation",
      "addyosmani/agent-skills@documentation-and-adrs",
      "softaworks/agent-toolkit@crafting-effective-readmes",
    ],
  },
  {
    label: "Security",
    hint: "OWASP, auth, audit",
    lines: [
      "supercent-io/skills-template@security-best-practices",
      "hoodini/ai-agents-skills@owasp-security",
      "agamm/claude-code-owasp@owasp-security",
      "better-auth/skills@better-auth-security-best-practices",
      "useai-pro/openclaw-skills-security@skill-vetter",
    ],
  },
  {
    label: "A11y / Review",
    hint: "accessibility, code review",
    lines: [
      "addyosmani/web-quality-skills@accessibility",
      "ibelick/ui-skills@fixing-accessibility",
      "obra/superpowers@requesting-code-review",
      "obra/superpowers@receiving-code-review",
      "wshobson/agents@code-review-excellence",
    ],
  },
];
