import { assert } from "chai";

import {
  BuidlerError,
  BuidlerPluginError,
  ERROR_RANGES,
  ErrorDescription,
  ERRORS
} from "../../../src/internal/core/errors";
import { unsafeObjectKeys } from "../../../src/internal/util/unsafe";

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

describe("Error ranges", () => {
  function inRange(n: number, min: number, max: number) {
    return n >= min && n <= max;
  }

  it("Should have max > min", () => {
    for (const errorGroup of unsafeObjectKeys(ERROR_RANGES)) {
      const range = ERROR_RANGES[errorGroup];
      assert.isBelow(range.min, range.max, `Range of ${errorGroup} is invalid`);
    }
  });

  it("Shouldn't overlap ranges", () => {
    for (const errorGroup of unsafeObjectKeys(ERROR_RANGES)) {
      const range = ERROR_RANGES[errorGroup];

      for (const errorGroup2 of unsafeObjectKeys(ERROR_RANGES)) {
        const range2 = ERROR_RANGES[errorGroup2];

        if (errorGroup === errorGroup2) {
          continue;
        }

        assert.isFalse(
          inRange(range2.min, range.min, range.max),
          `Ranges of ${errorGroup} and ${errorGroup2} overlap`
        );

        assert.isFalse(
          inRange(range2.max, range.min, range.max),
          `Ranges of ${errorGroup} and ${errorGroup2} overlap`
        );
      }
    }
  });
});

describe("Error descriptions", () => {
  it("Should have all errors inside their ranges", () => {
    for (const errorGroup of unsafeObjectKeys(ERRORS)) {
      const range = ERROR_RANGES[errorGroup];

      for (const [name, errorDescription] of Object.entries(
        ERRORS[errorGroup]
      )) {
        assert.isAtLeast(
          errorDescription.number,
          range.min,
          `ERRORS.${errorGroup}.${name}'s number is out of range`
        );
        assert.isAtMost(
          errorDescription.number,
          range.max - 1,
          `ERRORS.${errorGroup}.${name}'s number is out of range`
        );
      }
    }
  });

  it("Shouldn't repeat error numbers", () => {
    for (const errorGroup of unsafeObjectKeys(ERRORS)) {
      for (const [name, errorDescription] of Object.entries(
        ERRORS[errorGroup]
      )) {
        for (const [name2, errorDescription2] of Object.entries(
          ERRORS[errorGroup]
        )) {
          if (name !== name2) {
            assert.notEqual(
              errorDescription.number,
              errorDescription2.number,
              `ERRORS.${errorGroup}.${name} and ${errorGroup}.${name2} have repeated numbers`
            );
          }
        }
      }
    }
  });
});

describe("BuidlerPluginError", () => {
  describe("constructors", () => {
    describe("automatic plugin name", () => {
      it("Should accept a parent error", () => {
        const message = "m";
        const parent = new Error();

        const error = new BuidlerPluginError(message, parent);

        assert.equal(error.message, message);
        assert.equal(error.parent, parent);
      });

      it("Should work without a parent error", () => {
        const message = "m2";

        const error = new BuidlerPluginError(message);

        assert.equal(error.message, message);
        assert.isUndefined(error.parent);
      });

      it("Should autodetect the plugin name", () => {
        const message = "m";
        const parent = new Error();

        const error = new BuidlerPluginError(message, parent);

        // This is being called from mocha, so that would be used as plugin name
        assert.equal(error.pluginName, "mocha");
      });
    });

    describe("explicit plugin name", () => {
      it("Should accept a parent error", () => {
        const plugin = "p";
        const message = "m";
        const parent = new Error();

        const error = new BuidlerPluginError(plugin, message, parent);

        assert.equal(error.pluginName, plugin);
        assert.equal(error.message, message);
        assert.equal(error.parent, parent);
      });

      it("Should work without a parent error", () => {
        const plugin = "p";
        const message = "m";

        const error = new BuidlerPluginError(plugin, message);

        assert.equal(error.pluginName, plugin);
        assert.equal(error.message, message);
        assert.isUndefined(error.parent);
      });
    });
  });
});
