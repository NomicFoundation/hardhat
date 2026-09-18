import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractCodeBlocks, splitFrontmatter } from "./markdown.ts";

const md = (...lines: string[]) => lines.join("\n");

describe("splitFrontmatter", () => {
  it("returns the document unchanged when there is no frontmatter", () => {
    const source = md("# Title", "", "Some prose.");

    assert.deepEqual(splitFrontmatter(source), {
      frontmatter: undefined,
      body: source,
    });
  });

  it("splits a leading frontmatter block off the body", () => {
    const source = md("---", "template: minimal", "---", "", "# Title");

    assert.deepEqual(splitFrontmatter(source), {
      frontmatter: "template: minimal",
      body: md("", "# Title"),
    });
  });

  it("throws when the frontmatter is not closed", () => {
    const source = md("---", "template: minimal", "", "# Title");

    assert.throws(() => splitFrontmatter(source), /Unterminated frontmatter/);
  });
});

describe("extractCodeBlocks", () => {
  it("finds no blocks in prose", () => {
    assert.deepEqual(extractCodeBlocks(md("# Title", "", "Prose.")), []);
  });

  it("extracts a block with its language and line", () => {
    const source = md("# Title", "", "```sh", "echo one", "echo two", "```");

    assert.deepEqual(extractCodeBlocks(source), [
      { language: "sh", content: md("echo one", "echo two"), line: 3 },
    ]);
  });

  it("reports a block with no language", () => {
    const source = md("```", "echo one", "```");

    assert.equal(extractCodeBlocks(source)[0].language, undefined);
  });

  it("takes only the first word of the info string as the language", () => {
    const source = md("```sh expect-failure", "echo one", "```");

    assert.equal(extractCodeBlocks(source)[0].language, "sh");
  });

  it("extracts several blocks", () => {
    const source = md("```sh", "one", "```", "", "```sh", "two", "```");

    assert.deepEqual(
      extractCodeBlocks(source).map((block) => block.content),
      ["one", "two"],
    );
  });

  it("treats a longer fence as containing the shorter one", () => {
    const source = md("````markdown", "```sh", "echo one", "```", "````");

    assert.deepEqual(extractCodeBlocks(source), [
      {
        language: "markdown",
        content: md("```sh", "echo one", "```"),
        line: 1,
      },
    ]);
  });

  it("throws when a block is not closed", () => {
    const source = md("```sh", "echo one");

    assert.throws(() => extractCodeBlocks(source), /Unterminated code block/);
  });
});
