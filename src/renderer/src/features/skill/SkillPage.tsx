import { useState, type ReactNode } from "react";
import type { Skill } from "../../../../main/searchReducer";
import type { SkillAudit, SkillDetail } from "../../../../main/skillDetail";
import { ReadMore } from "../../components/ReadMore";
import { skillHref } from "../../lib/route";
import { SkillMarkdown } from "./SkillMarkdown";
import { useSkillDetail } from "./useSkillDetail";

export function SkillPage({
  id,
  onBack,
  onAdd,
}: {
  id: string;
  onBack: () => void;
  onAdd: (skill: Skill) => void;
}) {
  const { state, retry } = useSkillDetail(id);

  return (
    <div className="flex h-full flex-col bg-canvas">
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-panel px-2.5 py-1 text-[11.5px] text-muted transition hover:border-border-strong hover:text-text focus-visible:outline-1 focus-visible:outline-accent"
        >
          <ArrowLeftIcon />
          Back
        </button>
        <nav
          aria-label="Breadcrumb"
          className="min-w-0 truncate font-mono text-[11.5px] text-subtle"
        >
          skills / {id.split("/").join(" / ")}
        </nav>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
        {state.status === "loading" ? (
          <SkillSkeleton />
        ) : state.status === "error" ? (
          <div
            role="alert"
            className="mx-auto mt-12 max-w-md rounded-lg border border-err/40 bg-err/5 p-4 text-[12.5px] text-err"
          >
            <div className="mb-1 text-[10.5px] uppercase tracking-wider">
              error
            </div>
            {state.error}
            <div>
              <button
                type="button"
                onClick={retry}
                className="mt-3 rounded-md border border-border bg-panel px-3 py-1.5 text-[12px] text-text transition hover:border-accent hover:text-accent"
              >
                Try again
              </button>
            </div>
          </div>
        ) : (
          <SkillBody detail={state.detail} onAdd={onAdd} />
        )}
      </div>
    </div>
  );
}

function SkillBody({
  detail,
  onAdd,
}: {
  detail: SkillDetail;
  onAdd: (skill: Skill) => void;
}) {
  const { page, repo } = detail;
  const name = page.name ?? detail.skillId;
  const [lead, ...bullets] = page.summary;

  return (
    <article className="mx-auto grid max-w-5xl gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <header className="lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-semibold tracking-[-0.02em] text-text">
              {name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px]">
              <ExternalLink
                href={detail.repoUrl}
                className="font-mono text-muted"
              >
                {detail.source}
              </ExternalLink>
              {page.topics.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border px-2 py-0.5 text-[10.5px] text-muted"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <ExternalLink
            href={detail.url}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-panel px-2.5 py-1 text-[11.5px] text-muted hover:border-border-strong"
          >
            View on skills.sh
            <ExternalIcon />
          </ExternalLink>
        </div>

        {page.description && (
          <ReadMore
            collapsedClassName="line-clamp-3"
            className="mt-4 max-w-[72ch] text-[13px] leading-relaxed text-text/85"
          >
            <p>{page.description}</p>
          </ReadMore>
        )}

        <InstallBar detail={detail} name={name} onAdd={onAdd} />
      </header>

      <div className="min-w-0 space-y-8">
        {page.summary.length > 0 && (
          <Section title="Summary">
            {lead && (
              <p className="max-w-[72ch] text-[12.5px] font-medium leading-relaxed text-text">
                {lead}
              </p>
            )}
            {bullets.length > 0 && (
              <ul className="mt-2.5 max-w-[72ch] space-y-1.5 text-[12px] leading-relaxed text-muted">
                {bullets.map((b) => (
                  <li key={b} className="flex gap-2.5">
                    <span
                      aria-hidden
                      className="mt-[0.6em] size-1 shrink-0 rounded-full bg-accent"
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {detail.skillMd && (
          <Section
            title="SKILL.md"
            right={
              detail.skillMdUrl && (
                <ExternalLink
                  href={detail.skillMdUrl}
                  className="inline-flex items-center gap-1 text-[11px] text-subtle"
                >
                  Source <ExternalIcon />
                </ExternalLink>
              )
            }
          >
            <ReadMore
              collapsedClassName="max-h-80 overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]"
              moreLabel="Show full file"
            >
              <div className="rounded-lg border border-border bg-panel/70 px-5 py-4">
                <SkillMarkdown source={stripFrontmatter(detail.skillMd)} />
              </div>
            </ReadMore>
          </Section>
        )}

        {page.related.length > 0 && (
          <Section title="Related skills">
            <ul className="divide-y divide-border rounded-lg border border-border">
              {page.related.map((r) => (
                <li key={r.id}>
                  <a
                    href={skillHref(r.id)}
                    className="flex items-baseline gap-3 px-3 py-2.5 transition hover:bg-panel-2/60 focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-accent"
                  >
                    <span className="shrink-0 text-[12.5px] text-text">
                      {r.name}
                    </span>
                    <span className="min-w-0 truncate text-[11.5px] text-subtle">
                      {r.description}
                    </span>
                    <span className="ml-auto shrink-0 font-mono text-[10.5px] text-subtle">
                      {r.id.split("/").slice(0, 2).join("/")}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      <aside aria-label="Stats" className="space-y-6 lg:row-span-1">
        <div>
          <Label>Installs</Label>
          <div className="mt-1 font-mono text-[20px] font-semibold tabular-nums tracking-[-0.02em] text-text">
            {page.installs != null
              ? fmt(page.installs)
              : (page.installsText ?? "n/a")}
          </div>
          {page.weeklyInstalls.length > 1 && (
            <WeeklyInstalls values={page.weeklyInstalls} />
          )}
        </div>

        <dl className="divide-y divide-border border-y border-border text-[12px]">
          {(repo || page.stars) && (
            <Fact label="Stars">{repo ? fmt(repo.stars) : page.stars}</Fact>
          )}
          {repo && (
            <>
              <Fact label="Forks">{fmt(repo.forks)}</Fact>
              <Fact label="Open issues">{fmt(repo.openIssues)}</Fact>
              <Fact label="Watchers">{fmt(repo.watchers)}</Fact>
              <Fact label="License">{repo.license ?? "None"}</Fact>
              {repo.language && <Fact label="Language">{repo.language}</Fact>}
              {repo.pushedAt && (
                <Fact label="Last push">{date(repo.pushedAt)}</Fact>
              )}
            </>
          )}
          {page.firstSeen && <Fact label="First seen">{page.firstSeen}</Fact>}
        </dl>

        {repo?.description && (
          <div>
            <Label>Repository</Label>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
              {repo.description}
            </p>
            {repo.homepage && (
              <ExternalLink
                href={repo.homepage}
                className="mt-1 block truncate text-[11.5px] text-accent"
              >
                {repo.homepage.replace(/^https?:\/\//, "")}
              </ExternalLink>
            )}
          </div>
        )}

        {page.audits.length > 0 && (
          <div>
            <Label>Security audits</Label>
            <ul className="mt-2 space-y-1.5">
              {page.audits.map((a) => (
                <li
                  key={a.name}
                  className="flex items-center justify-between gap-3 text-[12px]"
                >
                  <span className="truncate text-text/85">{a.name}</span>
                  <AuditBadge status={a.status} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </article>
  );
}

function InstallBar({
  detail,
  name,
  onAdd,
}: {
  detail: SkillDetail;
  name: string;
  onAdd: (skill: Skill) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState(false);
  const command =
    detail.page.installCommand ??
    `npx skills add ${detail.repoUrl} --skill ${detail.skillId}`;

  function copy() {
    navigator.clipboard?.writeText(command).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  function add() {
    onAdd({
      id: detail.id,
      skillId: detail.skillId,
      name,
      source: detail.source,
      installs: detail.page.installs ?? 0,
    });
    setAdded(true);
  }

  return (
    <div className="mt-5 flex flex-wrap items-stretch gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-panel px-3 py-2">
        <span
          aria-hidden
          className="select-none font-mono text-[12px] text-subtle"
        >
          $
        </span>
        <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-text">
          {command}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy install command"
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted transition hover:text-text focus-visible:outline-1 focus-visible:outline-accent"
        >
          <CopyIcon />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <button
        type="button"
        onClick={add}
        className={`rounded-lg border px-3.5 py-2 text-[12px] font-medium transition focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          added
            ? "border-ok/40 bg-ok/10 text-ok"
            : "border-accent/60 bg-accent-soft text-accent hover:border-accent hover:bg-accent/15"
        }`}
      >
        {added ? "Added to installer" : "Add to installer"}
      </button>
    </div>
  );
}

function WeeklyInstalls({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  const change = prev ? ((last - prev) / prev) * 100 : 0;

  return (
    <figure className="mt-3">
      <div
        role="img"
        aria-label={`Weekly installs, oldest to newest: ${values.map(fmt).join(", ")}`}
        className="flex h-12 items-end gap-0.75"
      >
        {values.map((v, i) => (
          <div
            key={i}
            title={`${fmt(v)} installs`}
            style={{ height: `${Math.max((v / max) * 100, 4)}%` }}
            className={`flex-1 rounded-xs ${
              i === values.length - 1 ? "bg-accent" : "bg-border-strong"
            }`}
          />
        ))}
      </div>
      <figcaption className="mt-1.5 flex items-baseline justify-between text-[11px] text-subtle">
        <span>
          <span className="font-mono tabular-nums text-muted">{fmt(last)}</span>{" "}
          last week
        </span>
        <span
          className={`font-mono tabular-nums ${change >= 0 ? "text-ok" : "text-err"}`}
        >
          {change >= 0 ? "+" : ""}
          {change.toFixed(1)}%
        </span>
      </figcaption>
    </figure>
  );
}

function AuditBadge({ status }: { status: SkillAudit["status"] }) {
  const s = status.toLowerCase();
  const tone =
    s === "pass"
      ? "bg-ok/10 text-ok"
      : s === "fail"
        ? "bg-err/10 text-err"
        : "bg-warn/10 text-warn";
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone}`}
    >
      {status}
    </span>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between border-b border-border pb-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

const FACT_ICONS: Record<string, ReactNode> = {
  Stars: (
    <path d="M8 1.75 9.9 5.6l4.25.62-3.08 3 .73 4.23L8 11.46l-3.8 2 .73-4.24-3.08-3 4.25-.61z" />
  ),
  Forks: (
    <>
      <circle cx="4.5" cy="3.5" r="1.5" />
      <circle cx="11.5" cy="3.5" r="1.5" />
      <circle cx="8" cy="12.5" r="1.5" />
      <path d="M4.5 5v1a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2V5M8 8v3" />
    </>
  ),
  "Open issues": (
    <>
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
    </>
  ),
  Watchers: (
    <>
      <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" />
      <circle cx="8" cy="8" r="2" />
    </>
  ),
  License: (
    <path d="M8 2v12M5 14h6M3 4.5h10M3 4.5 1.5 9a1.75 1.75 0 0 0 3 0zM13 4.5 11.5 9a1.75 1.75 0 0 0 3 0z" />
  ),
  Language: <path d="m5.5 4.5-4 3.5 4 3.5M10.5 4.5l4 3.5-4 3.5" />,
  "Last push": (
    <>
      <circle cx="8" cy="8" r="2.25" />
      <path d="M1.5 8h4.25M10.25 8h4.25" />
    </>
  ),
  "First seen": (
    <>
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <path d="M2 6.5h12M5 1.5v3M11 1.5v3" />
    </>
  ),
};

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="flex items-center gap-2 text-subtle">
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className={`size-3.5 shrink-0 ${label === "Stars" ? "text-warn" : "text-muted"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {FACT_ICONS[label]}
        </svg>
        {label}
      </dt>
      <dd className="truncate font-mono tabular-nums text-text">{children}</dd>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
      {children}
    </div>
  );
}

function ExternalLink({
  href,
  className = "",
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={`underline-offset-4 transition hover:text-text hover:underline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
    >
      {children}
    </a>
  );
}

function SkillSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading skill"
      className="mx-auto max-w-5xl"
    >
      <div className="h-6 w-64 animate-pulse rounded bg-border" />
      <div className="mt-3 h-3 w-40 animate-pulse rounded bg-border" />
      <div className="mt-6 h-3 w-full max-w-xl animate-pulse rounded bg-border" />
      <div className="mt-2 h-3 w-2/3 max-w-lg animate-pulse rounded bg-border" />
      <div className="mt-6 h-10 w-full animate-pulse rounded-lg bg-border/60" />
    </div>
  );
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function date(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function stripFrontmatter(md: string): string {
  return md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trimStart();
}

function ArrowLeftIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 3 5 8l5 5" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3H3v10h10v-3M9 3h4v4M13 3 7 9" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <rect x="5" y="5" width="8" height="8" rx="1.5" />
      <path d="M3 10.5V4a1 1 0 0 1 1-1h6.5" />
    </svg>
  );
}
