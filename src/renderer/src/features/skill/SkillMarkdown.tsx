import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const shift =
  (Tag: "h3" | "h4" | "h5" | "h6"): Components["h1"] =>
  ({ children }) => <Tag>{children}</Tag>;

const COMPONENTS: Components = {
  h1: shift("h3"),
  h2: shift("h4"),
  h3: shift("h5"),
  h4: shift("h6"),
  h5: shift("h6"),
  h6: shift("h6"),
  a: ({ href, children }) =>
    href && !href.startsWith("#") ? (
      <a href={href} target="_blank" rel="noreferrer noopener">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
  img: ({ src, alt }) =>
    typeof src === "string" && src.startsWith("https://") ? (
      <img
        src={src}
        alt={alt ?? ""}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    ) : null,
};

/** Renders a SKILL.md body as markdown, nested two levels under the page's own headings. */
export function SkillMarkdown({ source }: { source: string }) {
  return (
    <div className="skill-md">
      <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {source}
      </Markdown>
    </div>
  );
}
