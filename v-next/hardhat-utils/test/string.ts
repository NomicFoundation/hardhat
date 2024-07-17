import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  pluralize,
  capitalize,
  kebabToCamelCase,
  camelToSnakeCase,
  camelToKebabCase,
} from "../src/string.js";

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

  describe("kebabToCamelCase", () => {
    it("Should convert a kebab-case string to camelCase", () => {
      assert.equal(kebabToCamelCase("kebabcasestring"), "kebabcasestring");
      assert.equal(kebabToCamelCase("kebab-case-string"), "kebabCaseString");
      assert.equal(
        kebabToCamelCase("kebab-c-a-s-e-s-t-r-i-n-g"),
        "kebabCASESTRING",
      );
    });
  });

  describe("camelToSnakeCase", () => {
    it("Should convert a camelCase string to snake_case", () => {
      assert.equal(camelToSnakeCase("camelcasestring"), "camelcasestring");
      assert.equal(camelToSnakeCase("camelCaseString"), "camel_case_string");
      assert.equal(
        camelToSnakeCase("camelCASESTRING"),
        "camel_c_a_s_e_s_t_r_i_n_g",
      );
    });
    assert.equal(camelToSnakeCase("camelcasestring1"), "camelcasestring_1");
    assert.equal(
      camelToSnakeCase("camel1Case2String"),
      "camel_1_case_2_string",
    );
    assert.equal(camelToSnakeCase("camelC1A2S3E4"), "camel_c_1_a_2_s_3_e_4");
    assert.equal(camelToSnakeCase("camel123"), "camel_1_2_3");
  });

  describe("camelToKebabCase", () => {
    it("Should convert a camelCase string to kebab-case", () => {
      assert.equal(camelToKebabCase("camelcasestring"), "camelcasestring");
      assert.equal(camelToKebabCase("camelCaseString"), "camel-case-string");
      assert.equal(
        camelToKebabCase("camelCASESTRING"),
        "camel-c-a-s-e-s-t-r-i-n-g",
      );
      assert.equal(camelToKebabCase("camelcasestring1"), "camelcasestring-1");
      assert.equal(
        camelToKebabCase("camel1Case2String"),
        "camel-1-case-2-string",
      );
      assert.equal(camelToKebabCase("camelC1A2S3E4"), "camel-c-1-a-2-s-3-e-4");
      assert.equal(camelToKebabCase("camel123"), "camel-1-2-3");
    });
  });
});
