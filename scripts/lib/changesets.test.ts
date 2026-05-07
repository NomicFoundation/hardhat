import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  extractDocsUrlsFromFrontMatter,
  parseFrontMatter,
} from "./changesets.ts";

describe("changesets helpers", () => {
  describe("parseFrontMatter", () => {
    it("should parse markdown with frontmatter", () => {
      assert.deepEqual(
        parseFrontMatter(`---
# docs: https://github.com/NomicFoundation/hardhat-website/pull/123
"hardhat": patch
---
Body`),
        {
          frontMatter:
            '# docs: https://github.com/NomicFoundation/hardhat-website/pull/123\n"hardhat": patch',
          content: "Body",
        },
      );
    });

    it("should parse markdown with frontmatter with spaces in the docs comment", () => {
      assert.deepEqual(
        parseFrontMatter(`---
   # docs: https://github.com/NomicFoundation/hardhat-website/pull/123
"hardhat": patch
---
Body`),
        {
          frontMatter:
            '   # docs: https://github.com/NomicFoundation/hardhat-website/pull/123\n"hardhat": patch',
          content: "Body",
        },
      );
    });

    it("should return null frontmatter when markdown has none", () => {
      assert.deepEqual(parseFrontMatter("Body"), {
        frontMatter: null,
        content: "Body",
      });
    });
  });

  describe("extractDocsUrlsFromFrontMatter", () => {
    it("should extract one docs URL", () => {
      assert.deepEqual(
        extractDocsUrlsFromFrontMatter(
          "# docs: https://github.com/NomicFoundation/hardhat-website/pull/123",
        ),
        ["https://github.com/NomicFoundation/hardhat-website/pull/123"],
      );
    });

    it("should extract one docs URL with spaces", () => {
      assert.deepEqual(
        extractDocsUrlsFromFrontMatter(
          "  #  docs: https://github.com/NomicFoundation/hardhat-website/pull/123",
        ),
        ["https://github.com/NomicFoundation/hardhat-website/pull/123"],
      );
    });

    it("should extract multiple docs URLs", () => {
      assert.deepEqual(
        extractDocsUrlsFromFrontMatter(`"hardhat": patch
# docs: https://github.com/NomicFoundation/hardhat-website/pull/123
# docs: https://github.com/NomicFoundation/hardhat-website/pull/456`),
        [
          "https://github.com/NomicFoundation/hardhat-website/pull/123",
          "https://github.com/NomicFoundation/hardhat-website/pull/456",
        ],
      );
    });

    it("should ignore non-docs comments", () => {
      assert.deepEqual(
        extractDocsUrlsFromFrontMatter(
          "# note: https://github.com/NomicFoundation/hardhat-website/pull/123",
        ),
        [],
      );
    });

    it("should ignore docs issue URLs", () => {
      assert.deepEqual(
        extractDocsUrlsFromFrontMatter(
          "# docs: https://github.com/NomicFoundation/hardhat-website/issues/123",
        ),
        [],
      );
    });

    it("should match case-insensitively", () => {
      assert.deepEqual(
        extractDocsUrlsFromFrontMatter(
          "# DoCs: https://github.com/nomicfoundation/hardhat-website/pull/123",
        ),
        ["https://github.com/nomicfoundation/hardhat-website/pull/123"],
      );
    });
  });
});
