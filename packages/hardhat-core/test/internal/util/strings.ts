import { assert } from "chai";

import { pluralize, replaceAll } from "../../../src/internal/util/strings";

describe("String utils", function () {
  describe("pluralize", function () {
    it("Should return the singular form if n is 1", function () {
      assert.strictEqual(pluralize(1, "asd"), "asd");
      assert.strictEqual(pluralize(1, "asd", "qwe"), "asd");
    });

    it("Should return the given plural form if n is >1", function () {
      assert.strictEqual(pluralize(2, "sing", "plur"), "plur");
      assert.strictEqual(pluralize(0, "sing", "plur"), "plur");
      assert.strictEqual(pluralize(123, "sing", "plur"), "plur");
    });

    it("Should construct the plural form if n is >1 and no plural form was given", function () {
      assert.strictEqual(pluralize(2, "sing"), "sings");
      assert.strictEqual(pluralize(0, "sing"), "sings");
      assert.strictEqual(pluralize(123, "sing"), "sings");
    });
  });
});

describe("replaceAll", function () {
  it("Should work with empty strings", function () {
    assert.strictEqual(replaceAll("", "asd", "123"), "");
  });

  it("Should work with no occurrence", function () {
    assert.strictEqual(replaceAll("a", "b", "c"), "a");
  });

  it("Should work with a single occurrence", function () {
    assert.strictEqual(replaceAll("ayguhi", "a", "c"), "cyguhi");
  });

  it("Should work with a multiple occurrences", function () {
    assert.strictEqual(replaceAll("alakjahjkasd", "a", "c"), "clckjchjkcsd");
  });

  it("Should not replace occurrences present in the replacement string", function () {
    assert.strictEqual(replaceAll("a b c d a", "a", "_a_"), "_a_ b c d _a_");
  });
});
