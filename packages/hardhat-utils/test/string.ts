import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { pluralize, capitalize } from "../src/string.js";

describe("string", () => {
  describe("pluralize", () => {
    it("should return the singular form when count is 1", () => {
      assert.strictEqual(pluralize("word", 1), "word");
    });

    it("should return the plural form when count is not 1", () => {
      assert.strictEqual(pluralize("word", 0), "words");
      assert.strictEqual(pluralize("word", 2), "words");
    });

    it("should return the provided plural form when count is not 1", () => {
      assert.strictEqual(pluralize("word", 0, "wordz"), "wordz");
      assert.strictEqual(pluralize("word", 2, "wordz"), "wordz");
    });
  });

  describe("capitalize", () => {
    it("should capitalize the first letter of a string", () => {
      assert.strictEqual(capitalize("word"), "Word");
    });

    it("should not change the string when it is already capitalized", () => {
      assert.strictEqual(capitalize("Word"), "Word");
    });

    it("should capitalize the first letter of a string and leave the rest as is", () => {
      assert.strictEqual(capitalize("word word"), "Word word");
    });
  });
});
