import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { pluralize, capitalize } from "../src/string.js";

describe("string", () => {
  describe("pluralize", () => {
    it("Should return the singular form when count is 1", () => {
      assert.equal(pluralize("word", 1), "word");
    });

    it("Should return the plural form when count is not 1", () => {
      assert.equal(pluralize("word", 0), "words");
      assert.equal(pluralize("word", 2), "words");
    });

    it("Should return the provided plural form when count is not 1", () => {
      assert.equal(pluralize("word", 0, "wordz"), "wordz");
      assert.equal(pluralize("word", 2, "wordz"), "wordz");
    });
  });

  describe("capitalize", () => {
    it("Should capitalize the first letter of a string", () => {
      assert.equal(capitalize("word"), "Word");
    });

    it("Should not change the string when it is already capitalized", () => {
      assert.equal(capitalize("Word"), "Word");
    });

    it("Should capitalize the first letter of a string and leave the rest as is", () => {
      assert.equal(capitalize("word word"), "Word word");
    });
  });
});
