import { assert } from "chai";

import {
  applyErrorMessageTemplate,
  HardhatError,
  HardhatPluginError,
  NomicLabsHardhatPluginError,
} from "../../../src/internal/core/errors";
import {
  ERROR_RANGES,
  ErrorDescriptor,
  ERRORS,
} from "../../../src/internal/core/errors-list";
import { unsafeObjectKeys } from "../../../src/internal/util/unsafe";
import { expectHardhatError } from "../../helpers/errors";

const mockErrorDescriptor: ErrorDescriptor = {
  number: 123,
  message: "error message",
  title: "Mock error",
  description: "This is a mock error",
  shouldBeReported: false,
};

describe("HardhatError", () => {
  describe("Type guard", () => {
    it("Should return true for HardhatErrors", () => {
      assert.isTrue(
        HardhatError.isHardhatError(new HardhatError(mockErrorDescriptor))
      );
    });

    it("Should return false for everything else", () => {
      assert.isFalse(HardhatError.isHardhatError(new Error()));
      assert.isFalse(
        HardhatError.isHardhatError(
          new NomicLabsHardhatPluginError("asd", "asd")
        )
      );
      assert.isFalse(HardhatError.isHardhatError(undefined));
      assert.isFalse(HardhatError.isHardhatError(null));
      assert.isFalse(HardhatError.isHardhatError(123));
      assert.isFalse(HardhatError.isHardhatError("123"));
      assert.isFalse(HardhatError.isHardhatError({ asd: 123 }));
    });
  });

  describe("Without parent error", () => {
    it("should have the right error number", () => {
      const error = new HardhatError(mockErrorDescriptor);
      assert.strictEqual(error.number, mockErrorDescriptor.number);
    });

    it("should format the error code to 4 digits", () => {
      const error = new HardhatError(mockErrorDescriptor);
      assert.strictEqual(error.message.substr(0, 7), "HH123: ");

      assert.strictEqual(
        new HardhatError({
          number: 1,
          message: "",
          title: "Title",
          description: "Description",
          shouldBeReported: false,
        }).message.substr(0, 7),
        "HH1: "
      );
    });

    it("should have the right error message", () => {
      const error = new HardhatError(mockErrorDescriptor);
      assert.strictEqual(error.message, `HH123: ${mockErrorDescriptor.message}`);
    });

    it("should format the error message with the template params", () => {
      const error = new HardhatError(
        {
          number: 12,
          message: "%a% %b% %c%",
          title: "Title",
          description: "Description",
          shouldBeReported: false,
        },
        { a: "a", b: "b", c: 123 }
      );
      assert.strictEqual(error.message, "HH12: a b 123");
    });

    it("shouldn't have a parent", () => {
      assert.isUndefined(new HardhatError(mockErrorDescriptor).parent);
    });

    it("Should work with instanceof", () => {
      const error = new HardhatError(mockErrorDescriptor);
      assert.instanceOf(error, HardhatError);
    });
  });

  describe("With parent error", () => {
    it("should have the right parent error", () => {
      const parent = new Error();
      const error = new HardhatError(mockErrorDescriptor, {}, parent);
      assert.strictEqual(error.parent, parent);
    });

    it("should format the error message with the template params", () => {
      const error = new HardhatError(
        {
          number: 12,
          message: "%a% %b% %c%",
          title: "Title",
          description: "Description",
          shouldBeReported: false,
        },
        { a: "a", b: "b", c: 123 },
        new Error()
      );
      assert.strictEqual(error.message, "HH12: a b 123");
    });

    it("Should work with instanceof", () => {
      const parent = new Error();
      const error = new HardhatError(mockErrorDescriptor, {}, parent);
      assert.instanceOf(error, HardhatError);
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

describe("Error descriptors", () => {
  it("Should have all errors inside their ranges", () => {
    for (const errorGroup of unsafeObjectKeys(ERRORS)) {
      const range = ERROR_RANGES[errorGroup];

      for (const [name, errorDescriptor] of Object.entries<ErrorDescriptor>(
        ERRORS[errorGroup]
      )) {
        assert.isAtLeast(
          errorDescriptor.number,
          range.min,
          `ERRORS.${errorGroup}.${name}'s number is out of range`
        );
        assert.isAtMost(
          errorDescriptor.number,
          range.max - 1,
          `ERRORS.${errorGroup}.${name}'s number is out of range`
        );
      }
    }
  });

  it("Shouldn't repeat error numbers", () => {
    for (const errorGroup of unsafeObjectKeys(ERRORS)) {
      for (const [name, errorDescriptor] of Object.entries<ErrorDescriptor>(
        ERRORS[errorGroup]
      )) {
        for (const [name2, errorDescriptor2] of Object.entries<ErrorDescriptor>(
          ERRORS[errorGroup]
        )) {
          if (name !== name2) {
            assert.notEqual(
              errorDescriptor.number,
              errorDescriptor2.number,
              `ERRORS.${errorGroup}.${name} and ${errorGroup}.${name2} have repeated numbers`
            );
          }
        }
      }
    }
  });

  it("Should keep the numbers in order, without gaps", () => {
    for (const errorGroup of unsafeObjectKeys(ERRORS)) {
      const range = ERROR_RANGES[errorGroup];
      let expectedErrorNumber = range.min;

      for (const [name, errorDescriptor] of Object.entries<ErrorDescriptor>(
        ERRORS[errorGroup]
      )) {
        assert.strictEqual(
          errorDescriptor.number,
          expectedErrorNumber,
          `ERRORS.${errorGroup}.${name}'s number is out of range`
        );

        expectedErrorNumber += 1;
      }
    }
  });
});

describe("HardhatPluginError", () => {
  describe("Type guard", () => {
    it("Should return true for HardhatPluginError", () => {
      assert.isTrue(
        HardhatPluginError.isHardhatPluginError(
          new HardhatPluginError("asd", "asd")
        )
      );
    });

    it("Should return false for everything else", () => {
      assert.isFalse(HardhatPluginError.isHardhatPluginError(new Error()));
      assert.isFalse(
        HardhatPluginError.isHardhatPluginError(
          new HardhatError(ERRORS.GENERAL.NOT_INSIDE_PROJECT)
        )
      );
      assert.isFalse(HardhatPluginError.isHardhatPluginError(undefined));
      assert.isFalse(HardhatPluginError.isHardhatPluginError(null));
      assert.isFalse(HardhatPluginError.isHardhatPluginError(123));
      assert.isFalse(HardhatPluginError.isHardhatPluginError("123"));
      assert.isFalse(HardhatPluginError.isHardhatPluginError({ asd: 123 }));
    });
  });

  describe("constructors", () => {
    describe("automatic plugin name", () => {
      it("Should accept a parent error", () => {
        const message = "m";
        const parent = new Error();

        const error = new HardhatPluginError(message, parent);

        assert.strictEqual(error.message, message);
        assert.strictEqual(error.parent, parent);
      });

      it("Should work without a parent error", () => {
        const message = "m2";

        const error = new HardhatPluginError(message);

        assert.strictEqual(error.message, message);
        assert.isUndefined(error.parent);
      });

      it("Should autodetect the plugin name", () => {
        const message = "m";
        const parent = new Error();

        const error = new HardhatPluginError(message, parent);

        // This is being called from mocha, so that would be used as plugin name
        assert.strictEqual(error.pluginName, "mocha");
      });

      it("Should work with instanceof", () => {
        const message = "m";
        const parent = new Error();

        const error = new HardhatPluginError(message, parent);

        assert.instanceOf(error, HardhatPluginError);
      });
    });

    describe("explicit plugin name", () => {
      it("Should accept a parent error", () => {
        const plugin = "p";
        const message = "m";
        const parent = new Error();

        const error = new HardhatPluginError(plugin, message, parent);

        assert.strictEqual(error.pluginName, plugin);
        assert.strictEqual(error.message, message);
        assert.strictEqual(error.parent, parent);
      });

      it("Should work without a parent error", () => {
        const plugin = "p2";
        const message = "m2";

        const error = new HardhatPluginError(plugin, message);

        assert.strictEqual(error.pluginName, plugin);
        assert.strictEqual(error.message, message);
        assert.isUndefined(error.parent);
      });

      it("Should work with instanceof", () => {
        const plugin = "p";
        const message = "m";
        const parent = new Error();

        const error = new HardhatPluginError(plugin, message, parent);

        assert.instanceOf(error, HardhatPluginError);
      });
    });
  });
});

describe("NomicLabsHardhatPluginError", () => {
  describe("Type guard", () => {
    it("Should return true for NomicLabsHardhatPluginError", () => {
      assert.isTrue(
        NomicLabsHardhatPluginError.isNomicLabsHardhatPluginError(
          new NomicLabsHardhatPluginError("asd", "asd")
        )
      );
    });

    it("Should also be a HardhatPluginError", () => {
      assert.isTrue(
        HardhatPluginError.isHardhatPluginError(
          new NomicLabsHardhatPluginError("asd", "asd")
        )
      );
    });

    it("Should return false for everything else", () => {
      assert.isFalse(
        NomicLabsHardhatPluginError.isNomicLabsHardhatPluginError(new Error())
      );
      assert.isFalse(
        NomicLabsHardhatPluginError.isNomicLabsHardhatPluginError(
          new HardhatError(ERRORS.GENERAL.NOT_INSIDE_PROJECT)
        )
      );
      assert.isFalse(
        NomicLabsHardhatPluginError.isNomicLabsHardhatPluginError(
          new HardhatPluginError("asd", "asd")
        )
      );
      assert.isFalse(
        NomicLabsHardhatPluginError.isNomicLabsHardhatPluginError(undefined)
      );
      assert.isFalse(
        NomicLabsHardhatPluginError.isNomicLabsHardhatPluginError(null)
      );
      assert.isFalse(
        NomicLabsHardhatPluginError.isNomicLabsHardhatPluginError(123)
      );
      assert.isFalse(
        NomicLabsHardhatPluginError.isNomicLabsHardhatPluginError("123")
      );
      assert.isFalse(
        NomicLabsHardhatPluginError.isNomicLabsHardhatPluginError({ asd: 123 })
      );
    });
  });
});

describe("applyErrorMessageTemplate", () => {
  describe("Variable names", () => {
    it("Should reject invalid variable names", () => {
      expectHardhatError(
        () => applyErrorMessageTemplate("", { "1": 1 }),
        ERRORS.INTERNAL.TEMPLATE_INVALID_VARIABLE_NAME
      );

      expectHardhatError(
        () => applyErrorMessageTemplate("", { "asd%": 1 }),
        ERRORS.INTERNAL.TEMPLATE_INVALID_VARIABLE_NAME
      );

      expectHardhatError(
        () => applyErrorMessageTemplate("", { "asd asd": 1 }),
        ERRORS.INTERNAL.TEMPLATE_INVALID_VARIABLE_NAME
      );
    });
  });

  describe("Values", () => {
    it("shouldn't contain valid variable tags", () => {
      expectHardhatError(
        () => applyErrorMessageTemplate("%asd%", { asd: "%as%" }),
        ERRORS.INTERNAL.TEMPLATE_VALUE_CONTAINS_VARIABLE_TAG
      );

      expectHardhatError(
        () => applyErrorMessageTemplate("%asd%", { asd: "%a123%" }),
        ERRORS.INTERNAL.TEMPLATE_VALUE_CONTAINS_VARIABLE_TAG
      );

      expectHardhatError(
        () =>
          applyErrorMessageTemplate("%asd%", {
            asd: { toString: () => "%asd%" },
          }),
        ERRORS.INTERNAL.TEMPLATE_VALUE_CONTAINS_VARIABLE_TAG
      );
    });

    it("Shouldn't contain the %% tag", () => {
      expectHardhatError(
        () => applyErrorMessageTemplate("%asd%", { asd: "%%" }),
        ERRORS.INTERNAL.TEMPLATE_VALUE_CONTAINS_VARIABLE_TAG
      );
    });
  });

  describe("Replacements", () => {
    describe("String values", () => {
      it("Should replace variable tags for the values", () => {
        assert.strictEqual(
          applyErrorMessageTemplate("asd %asd% 123 %asd%", { asd: "r" }),
          "asd r 123 r"
        );

        assert.strictEqual(
          applyErrorMessageTemplate("asd%asd% %asd% %fgh% 123", {
            asd: "r",
            fgh: "b",
          }),
          "asdr r b 123"
        );

        assert.strictEqual(
          applyErrorMessageTemplate("asd%asd% %asd% %fgh% 123", {
            asd: "r",
            fgh: "",
          }),
          "asdr r  123"
        );
      });
    });

    describe("Non-string values", () => {
      it("Should replace undefined values for undefined", () => {
        assert.strictEqual(
          applyErrorMessageTemplate("asd %asd% 123 %asd%", { asd: undefined }),
          "asd undefined 123 undefined"
        );
      });

      it("Should replace null values for null", () => {
        assert.strictEqual(
          applyErrorMessageTemplate("asd %asd% 123 %asd%", { asd: null }),
          "asd null 123 null"
        );
      });

      it("Should use their toString methods", () => {
        const toR = { toString: () => "r" };
        const toB = { toString: () => "b" };
        const toEmpty = { toString: () => "" };
        const toUndefined = { toString: () => undefined };

        assert.strictEqual(
          applyErrorMessageTemplate("asd %asd% 123 %asd%", { asd: toR }),
          "asd r 123 r"
        );

        assert.strictEqual(
          applyErrorMessageTemplate("asd%asd% %asd% %fgh% 123", {
            asd: toR,
            fgh: toB,
          }),
          "asdr r b 123"
        );

        assert.strictEqual(
          applyErrorMessageTemplate("asd%asd% %asd% %fgh% 123", {
            asd: toR,
            fgh: toEmpty,
          }),
          "asdr r  123"
        );

        assert.strictEqual(
          applyErrorMessageTemplate("asd%asd% %asd% %fgh% 123", {
            asd: toR,
            fgh: toUndefined,
          }),
          "asdr r undefined 123"
        );
      });
    });

    describe("%% sign", () => {
      it("Should be replaced with %", () => {
        assert.strictEqual(applyErrorMessageTemplate("asd%%asd", {}), "asd%asd");
      });

      it("Shouldn't apply replacements if after this one a new variable tag appears", () => {
        assert.strictEqual(
          applyErrorMessageTemplate("asd%%asd%% %asd%", { asd: "123" }),
          "asd%asd% 123"
        );
      });
    });

    describe("Missing variable tag", () => {
      it("Should fail if a viable tag is missing and its value is not", () => {
        expectHardhatError(
          () => applyErrorMessageTemplate("", { asd: "123" }),
          ERRORS.INTERNAL.TEMPLATE_VARIABLE_TAG_MISSING
        );
      });
    });

    describe("Missing variable", () => {
      it("Should work, leaving the variable tag", () => {
        assert.strictEqual(
          applyErrorMessageTemplate("%asd% %fgh%", { asd: "123" }),
          "123 %fgh%"
        );
      });
    });
  });
});
