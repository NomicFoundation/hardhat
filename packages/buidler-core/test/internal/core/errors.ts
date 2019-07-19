import { assert } from "chai";

import {
  applyErrorMessageTemplate,
  BuidlerError,
  BuidlerPluginError,
  ERROR_RANGES,
  ErrorDescription,
  ERRORS
} from "../../../src/internal/core/errors";
import { unsafeObjectKeys } from "../../../src/internal/util/unsafe";
import { expectBuidlerError } from "../../helpers/errors";

const mockErrorDescription: ErrorDescription = {
  number: 123,
  message: "error message"
};

describe("BuilderError", () => {
  describe("Type guard", () => {
    it("Should return true for BuidlerErrors", () => {
      assert.isTrue(
        BuidlerError.isBuidlerError(new BuidlerError(mockErrorDescription))
      );
    });

    it("Should return false for everything else", () => {
      assert.isFalse(BuidlerError.isBuidlerError(new Error()));
      assert.isFalse(
        BuidlerError.isBuidlerError(new BuidlerPluginError("asd", "asd"))
      );
      assert.isFalse(BuidlerError.isBuidlerError(undefined));
      assert.isFalse(BuidlerError.isBuidlerError(null));
      assert.isFalse(BuidlerError.isBuidlerError(123));
      assert.isFalse(BuidlerError.isBuidlerError("123"));
      assert.isFalse(BuidlerError.isBuidlerError({ asd: 123 }));
    });
  });

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

    it("should format the error message with the template params", () => {
      const error = new BuidlerError(
        { number: 12, message: "%a% %b% %c%" },
        { a: "a", b: "b", c: 123 }
      );
      assert.equal(error.message, "BDLR12: a b 123");
    });

    it("shouldn't have a parent", () => {
      assert.isUndefined(new BuidlerError(mockErrorDescription).parent);
    });

    it("Should work with instanceof", () => {
      const error = new BuidlerError(mockErrorDescription);
      assert.instanceOf(error, BuidlerError);
    });
  });

  describe("With parent error", () => {
    it("should have the right parent error", () => {
      const parent = new Error();
      const error = new BuidlerError(mockErrorDescription, {}, parent);
      assert.equal(error.parent, parent);
    });

    it("should format the error message with the template params", () => {
      const error = new BuidlerError(
        { number: 12, message: "%a% %b% %c%" },
        { a: "a", b: "b", c: 123 },
        new Error()
      );
      assert.equal(error.message, "BDLR12: a b 123");
    });

    it("Should work with instanceof", () => {
      const parent = new Error();
      const error = new BuidlerError(mockErrorDescription, {}, parent);
      assert.instanceOf(error, BuidlerError);
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
  describe("Type guard", () => {
    it("Should return true for BuidlerPluginError", () => {
      assert.isTrue(
        BuidlerPluginError.isBuidlerPluginError(
          new BuidlerPluginError("asd", "asd")
        )
      );
    });

    it("Should return false for everything else", () => {
      assert.isFalse(BuidlerPluginError.isBuidlerPluginError(new Error()));
      assert.isFalse(
        BuidlerPluginError.isBuidlerPluginError(
          new BuidlerError(ERRORS.GENERAL.NOT_INSIDE_PROJECT)
        )
      );
      assert.isFalse(BuidlerPluginError.isBuidlerPluginError(undefined));
      assert.isFalse(BuidlerPluginError.isBuidlerPluginError(null));
      assert.isFalse(BuidlerPluginError.isBuidlerPluginError(123));
      assert.isFalse(BuidlerPluginError.isBuidlerPluginError("123"));
      assert.isFalse(BuidlerPluginError.isBuidlerPluginError({ asd: 123 }));
    });
  });

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

      it("Should work with instanceof", () => {
        const message = "m";
        const parent = new Error();

        const error = new BuidlerPluginError(message, parent);

        assert.instanceOf(error, BuidlerPluginError);
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
        const plugin = "p2";
        const message = "m2";

        const error = new BuidlerPluginError(plugin, message);

        assert.equal(error.pluginName, plugin);
        assert.equal(error.message, message);
        assert.isUndefined(error.parent);
      });

      it("Should work with instanceof", () => {
        const plugin = "p";
        const message = "m";
        const parent = new Error();

        const error = new BuidlerPluginError(plugin, message, parent);

        assert.instanceOf(error, BuidlerPluginError);
      });
    });
  });
});

describe("applyErrorMessageTemplate", () => {
  describe("Variable names", () => {
    it("Should reject invalid variable names", () => {
      expectBuidlerError(
        () => applyErrorMessageTemplate("", { "1": 1 }),
        ERRORS.INTERNAL.TEMPLATE_INVALID_VARIABLE_NAME
      );

      expectBuidlerError(
        () => applyErrorMessageTemplate("", { "asd%": 1 }),
        ERRORS.INTERNAL.TEMPLATE_INVALID_VARIABLE_NAME
      );

      expectBuidlerError(
        () => applyErrorMessageTemplate("", { "asd asd": 1 }),
        ERRORS.INTERNAL.TEMPLATE_INVALID_VARIABLE_NAME
      );
    });
  });

  describe("Values", () => {
    it("shouldn't contain valid variable tags", () => {
      expectBuidlerError(
        () => applyErrorMessageTemplate("%asd%", { asd: "%as%" }),
        ERRORS.INTERNAL.TEMPLATE_VALUE_CONTAINS_VARIABLE_TAG
      );

      expectBuidlerError(
        () => applyErrorMessageTemplate("%asd%", { asd: "%a123%" }),
        ERRORS.INTERNAL.TEMPLATE_VALUE_CONTAINS_VARIABLE_TAG
      );

      expectBuidlerError(
        () =>
          applyErrorMessageTemplate("%asd%", {
            asd: { toString: () => "%asd%" }
          }),
        ERRORS.INTERNAL.TEMPLATE_VALUE_CONTAINS_VARIABLE_TAG
      );
    });

    it("Shouldn't contain the %% tag", () => {
      expectBuidlerError(
        () => applyErrorMessageTemplate("%asd%", { asd: "%%" }),
        ERRORS.INTERNAL.TEMPLATE_VALUE_CONTAINS_VARIABLE_TAG
      );
    });
  });

  describe("Replacements", () => {
    describe("String values", () => {
      it("Should replace variable tags for the values", () => {
        assert.equal(
          applyErrorMessageTemplate("asd %asd% 123 %asd%", { asd: "r" }),
          "asd r 123 r"
        );

        assert.equal(
          applyErrorMessageTemplate("asd%asd% %asd% %fgh% 123", {
            asd: "r",
            fgh: "b"
          }),
          "asdr r b 123"
        );

        assert.equal(
          applyErrorMessageTemplate("asd%asd% %asd% %fgh% 123", {
            asd: "r",
            fgh: ""
          }),
          "asdr r  123"
        );
      });
    });

    describe("Non-string values", () => {
      it("Should replace undefined values for undefined", () => {
        assert.equal(
          applyErrorMessageTemplate("asd %asd% 123 %asd%", { asd: undefined }),
          "asd undefined 123 undefined"
        );
      });

      it("Should replace null values for null", () => {
        assert.equal(
          applyErrorMessageTemplate("asd %asd% 123 %asd%", { asd: null }),
          "asd null 123 null"
        );
      });

      it("Should use their toString methods", () => {
        const toR = { toString: () => "r" };
        const toB = { toString: () => "b" };
        const toEmpty = { toString: () => "" };
        const toUndefined = { toString: () => undefined };

        assert.equal(
          applyErrorMessageTemplate("asd %asd% 123 %asd%", { asd: toR }),
          "asd r 123 r"
        );

        assert.equal(
          applyErrorMessageTemplate("asd%asd% %asd% %fgh% 123", {
            asd: toR,
            fgh: toB
          }),
          "asdr r b 123"
        );

        assert.equal(
          applyErrorMessageTemplate("asd%asd% %asd% %fgh% 123", {
            asd: toR,
            fgh: toEmpty
          }),
          "asdr r  123"
        );

        assert.equal(
          applyErrorMessageTemplate("asd%asd% %asd% %fgh% 123", {
            asd: toR,
            fgh: toUndefined
          }),
          "asdr r undefined 123"
        );
      });
    });

    describe("%% sign", () => {
      it("Should be replaced with %", () => {
        assert.equal(applyErrorMessageTemplate("asd%%asd", {}), "asd%asd");
      });

      it("Shouldn't apply replacements if after this one a new variable tag appears", () => {
        assert.equal(
          applyErrorMessageTemplate("asd%%asd%% %asd%", { asd: "123" }),
          "asd%asd% 123"
        );
      });
    });

    describe("Missing variable tag", () => {
      it("Should fail if a viable tag is missing and its value is not", () => {
        expectBuidlerError(
          () => applyErrorMessageTemplate("", { asd: "123" }),
          ERRORS.INTERNAL.TEMPLATE_VARIABLE_TAG_MISSING
        );
      });
    });

    describe("Missing variable", () => {
      it("Should work, leaving the variable tag", () => {
        assert.equal(
          applyErrorMessageTemplate("%asd% %fgh%", { asd: "123" }),
          "123 %fgh%"
        );
      });
    });
  });
});
