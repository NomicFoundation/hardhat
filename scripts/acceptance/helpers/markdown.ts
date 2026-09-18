export interface CodeBlock {
  /** The first word of the info string, e.g. `sh`. */
  language: string | undefined;
  /** The fence's contents, without the fence lines themselves. */
  content: string;
  /** 1-based line number of the opening fence, for error messages. */
  line: number;
}

/**
 * Split a leading frontmatter block off the document.
 *
 * Phase 1 scenarios carry no frontmatter, so this only detects it and hands
 * back the raw text — nothing parses YAML yet, and there is no YAML parser in
 * the repo to do it with.
 */
export function splitFrontmatter(markdown: string): {
  frontmatter: string | undefined;
  body: string;
} {
  const lines = markdown.split("\n");

  if (lines[0]?.trim() !== "---") {
    return { frontmatter: undefined, body: markdown };
  }

  const closing = lines.findIndex(
    (line, index) => index > 0 && line.trim() === "---",
  );

  if (closing === -1) {
    throw new Error("Unterminated frontmatter block: no closing `---`");
  }

  return {
    frontmatter: lines.slice(1, closing).join("\n"),
    body: lines.slice(closing + 1).join("\n"),
  };
}

/**
 * Extract the fenced code blocks from a markdown document.
 *
 * Deliberately small rather than a full markdown parser: a fence opens with
 * three or more backticks and closes with at least as many, which is what lets
 * a documentation example nest a ```` ``` ```` fence inside a ```` ```` ````
 * one without the inner fence being mistaken for a block of its own.
 */
export function extractCodeBlocks(markdown: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const lines = markdown.split("\n");

  let open: { fence: string; language: string | undefined; line: number } =
    undefined;
  let content: string[] = [];

  for (const [index, line] of lines.entries()) {
    const fence = /^(`{3,})(.*)$/.exec(line);

    if (open === undefined) {
      if (fence !== null) {
        open = {
          fence: fence[1],
          language: fence[2].trim().split(/\s+/)[0] || undefined,
          line: index + 1,
        };
        content = [];
      }

      continue;
    }

    // Only a fence of at least the opening length, and carrying no info
    // string, closes the block.
    if (
      fence !== null &&
      fence[1].length >= open.fence.length &&
      fence[2].trim() === ""
    ) {
      blocks.push({
        language: open.language,
        content: content.join("\n"),
        line: open.line,
      });

      open = undefined;

      continue;
    }

    content.push(line);
  }

  if (open !== undefined) {
    throw new Error(
      `Unterminated code block opened on line ${open.line}: no closing \`${open.fence}\``,
    );
  }

  return blocks;
}
