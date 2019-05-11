import { assert } from "chai";

import { pluralize } from "../../../src/internal/util/strings";

describe("String utils", function() {
  describe("pluralize", function() {
    it("Should return the singular form if n is 1", function() {
      assert.equal(pluralize(1, "asd"), "asd");
      assert.equal(pluralize(1, "asd", "qwe"), "asd");
    });

    it("Should return the given plural form if n is >1", function() {
      assert.equal(pluralize(2, "sing", "plur"), "plur");
      assert.equal(pluralize(0, "sing", "plur"), "plur");
      assert.equal(pluralize(123, "sing", "plur"), "plur");
    });

    it("Should construct the plural form if n is >1 and no plural form was given", function() {
      assert.equal(pluralize(2, "sing"), "sings");
      assert.equal(pluralize(0, "sing"), "sings");
      assert.equal(pluralize(123, "sing"), "sings");
    });
  });
});
