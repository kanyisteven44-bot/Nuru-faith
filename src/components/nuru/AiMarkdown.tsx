/** Tiny, dependency-free renderer for the light markdown Nuru AI returns. */
function inline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return (
        <strong key={`${keyPrefix}-${i}`} className="font-semibold text-foreground">
          {p.slice(2, -2)}
        </strong>
      );
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2)
      return (
        <em key={`${keyPrefix}-${i}`} className="italic">
          {p.slice(1, -1)}
        </em>
      );
    return <span key={`${keyPrefix}-${i}`}>{p}</span>;
  });
}

export function AiMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];

  const flush = (key: string) => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={`ul-${key}`} className="my-2 space-y-1 pl-4">
        {list.map((item, i) => (
          <li
            key={i}
            className="list-disc text-sm leading-relaxed text-secondary-foreground marker:text-cyan"
          >
            {inline(item, `li-${key}-${i}`)}
          </li>
        ))}
      </ul>,
    );
    list = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) {
      flush(String(idx));
      return;
    }
    if (/^[-*•]\s+/.test(line)) {
      list.push(line.replace(/^[-*•]\s+/, ""));
      return;
    }
    flush(String(idx));
    if (/^#{1,6}\s+/.test(line)) {
      blocks.push(
        <h3 key={idx} className="mt-3 font-display text-sm font-semibold text-foreground">
          {line.replace(/^#{1,6}\s+/, "")}
        </h3>,
      );
      return;
    }
    blocks.push(
      <p key={idx} className="mt-2 text-sm leading-relaxed text-secondary-foreground">
        {inline(line, String(idx))}
      </p>,
    );
  });
  flush("end");

  return <div className="[&>*:first-child]:mt-0">{blocks}</div>;
}
