import { assert } from "chai";

import { BuidlerError, ErrorDescription } from "../../src/core/errors";

const mockErrorDescription: ErrorDescription = {
  number: 123,
  message: "error message"
};

describe("BuilderError", () => {
  describe("Without parent error", () => {
    it("should have the right error number", () => {
      const error = new BuidlerError(mockErrorDescription);
      assert.equal(error.number, mockErrorDescription.number);
    });

    it("should format the error code to 4 digits", () => {
      const error = new BuidlerError(mockErrorDescription);
      assert.equal(error.message.substr(0, 9), "BDLR123: ");

      assert.equal(
        new BuidlerError({ number: 1, message: "" }).message.substr(0, 7),

        "BDLR1: "
      );
    });

    it("should have the right error message", () => {
      const error = new BuidlerError(mockErrorDescription);
      assert.equal(error.message, "BDLR123: " + mockErrorDescription.message);
    });

    it("should format the error message with the extra params", () => {
      const error = new BuidlerError(
        { number: 12, message: "%s %s %s" },
        "a",
        "b",
        123
      );
      assert.equal(error.message, "BDLR12: a b 123");
    });

    it("shouldn't have a parent", () => {
      assert.isUndefined(new BuidlerError(mockErrorDescription).parent);
    });
  });

  describe("With parent error", () => {
    it("should have the right parent error", () => {
      const parent = new Error();
      const error = new BuidlerError(mockErrorDescription, parent);
      assert.equal(error.parent, parent);
    });

    it("should format the error message with the extra params", () => {
      const error = new BuidlerError(
        { number: 12, message: "%s %s %s" },
        new Error(),
        "a",
        "b",
        123
      );
      assert.equal(error.message, "BDLR12: a b 123");
    });
  });
});
