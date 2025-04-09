import type { ErrorDescriptor } from "../src/descriptors.js";
import type {
  ErrorMessageTemplateValue,
  MessagetTemplateArguments,
} from "../src/errors.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { expectTypeOf } from "expect-type";

import { ERRORS, ERROR_CATEGORIES } from "../src/descriptors.js";
import {
  HardhatError,
  HardhatPluginError,
  applyErrorMessageTemplate,
} from "../src/errors.js";

const mockErrorDescriptor = {
  number: 123,
  messageTemplate: "error message",
  websiteTitle: "Mock error",
  websiteDescription: "This is a mock error",
} as const;

describe("HardhatError", () => {
  describe("Type guard", () => {
    it("Should return true for HardhatErrors", () => {
      const error = new HardhatError(mockErrorDescriptor);
      assert.ok(
        HardhatError.isHardhatError(error),
        `error ${error.number} is a HardhatError, but isHardhatError returned false`,
      );
    });

    it("Should return true for HardhatErrors with the same ErrorDescriptor", () => {
      const error = new HardhatError(mockErrorDescriptor);
      assert.ok(
        HardhatError.isHardhatError(error, mockErrorDescriptor),
        `error ${error.number} matches the descriptor ${JSON.stringify(mockErrorDescriptor, null, 2)}, but isHardhatError returned false`,
      );
    });

    it("Should return false for everything else", () => {
      assert.ok(
        !HardhatError.isHardhatError(new Error()),
        "new Error() is not a HardhatError, but isHardhatError returned true",
      );
      assert.ok(
        !HardhatError.isHardhatError(
          new HardhatPluginError("examplePlugin", "error message"),
        ),
        "new HardhatPluginError() is not a HardhatError, but isHardhatError returned true",
      );
      assert.ok(
        !HardhatError.isHardhatError(undefined),
        "undefined is not a HardhatError, but isHardhatError returned true",
      );
      assert.ok(
        !HardhatError.isHardhatError(null),
        "null is not a HardhatError, but isHardhatError returned true",
      );
      assert.ok(
        !HardhatError.isHardhatError(123),
        "123 is not a HardhatError, but isHardhatError returned true",
      );
      assert.ok(
        !HardhatError.isHardhatError("123"),
        '"123" is not a HardhatError, but isHardhatError returned true',
      );
      assert.ok(
        !HardhatError.isHardhatError({ asd: 123 }),
        "{ asd: 123 } is not a HardhatError, but isHardhatError returned true",
      );
    });

    it("Should return false for HardhatErrors with a different ErrorDescriptor", () => {
      const error = new HardhatError(mockErrorDescriptor);
      assert.ok(
        !HardhatError.isHardhatError(error, {
          ...mockErrorDescriptor,
          number: 1,
        }),
        `error ${error.number} doesn't match the descriptor ${JSON.stringify(mockErrorDescriptor, null, 2)}, but isHardhatError returned true`,
      );
    });
  });

  describe("Without parent error", () => {
    it("should have the right error number", () => {
      const error = new HardhatError(mockErrorDescriptor);
      assert.equal(error.number, mockErrorDescriptor.number);
    });

    it("should format the error code to 4 digits", () => {
      const error = new HardhatError(mockErrorDescriptor);
      assert.equal(error.message.substr(0, 8), "HHE123: ");

      assert.equal(
        new HardhatError({
          number: 1,
          messageTemplate: "",
          websiteTitle: "Title",
          websiteDescription: "Description",
        }).message.substr(0, 7),
        "HHE1: ",
      );
    });

    it("should have the right error message", () => {
      const error = new HardhatError(mockErrorDescriptor);
      assert.equal(
        error.message,
        `HHE123: ${mockErrorDescriptor.messageTemplate}`,
      );
    });

    it("should format the error message with the template params", () => {
      const error = new HardhatError(
        {
          number: 12,
          messageTemplate: "{a} {b} {c}",
          websiteTitle: "Title",
          websiteDescription: "Description",
        } as const,
        { a: "a", b: "b", c: 123 },
      );
      assert.equal(error.message, "HHE12: a b 123");
    });

    it("shouldn't have a cause", () => {
      assert.equal(new HardhatError(mockErrorDescriptor).cause, undefined);
    });
  });

  describe("With cause error", () => {
    it("should have the right cause error", () => {
      const cause = new Error();
      const error = new HardhatError(mockErrorDescriptor, cause);
      assert.equal(error.cause, cause);
    });

    it("should format the error message with the template params", () => {
      const error = new HardhatError(
        {
          number: 12,
          messageTemplate: "{a} {b} {c}",
          websiteTitle: "Title",
          websiteDescription: "Description",
        } as const,
        { a: "a", b: "b", c: 123 },
        new Error(),
      );
      assert.equal(error.message, "HHE12: a b 123");
    });
  });
});

describe("HardhatPluginError", () => {
  describe("Type guard", () => {
    it("Should return true for HardhatPluginErrors", () => {
      const error = new HardhatPluginError("examplePlugin", "error message");
      assert.ok(
        HardhatPluginError.isHardhatPluginError(error),
        `error ${error.name} is a HardhatPluginError, but isHardhatPluginError returned false`,
      );
    });

    it("Should return false for everything else", () => {
      assert.ok(
        !HardhatPluginError.isHardhatPluginError(new Error()),
        "new Error() is not a HardhatPluginError, but isHardhatPluginError returned true",
      );
      assert.ok(
        !HardhatPluginError.isHardhatPluginError(
          new HardhatError(mockErrorDescriptor),
        ),
        "new HardhatError() is not a HardhatPluginError, but isHardhatPluginError returned true",
      );
      assert.ok(
        !HardhatPluginError.isHardhatPluginError(undefined),
        "undefined is not a HardhatPluginError, but isHardhatPluginError returned true",
      );
      assert.ok(
        !HardhatPluginError.isHardhatPluginError(null),
        "null is not a HardhatPluginError, but isHardhatPluginError returned true",
      );
      assert.ok(
        !HardhatPluginError.isHardhatPluginError(123),
        "123 is not a HardhatPluginError, but isHardhatPluginError returned true",
      );
      assert.ok(
        !HardhatPluginError.isHardhatPluginError("123"),
        '"123" is not a HardhatPluginError, but isHardhatPluginError returned true',
      );
      assert.ok(
        !HardhatPluginError.isHardhatPluginError({ asd: 123 }),
        "{ asd: 123 } is not a HardhatPluginError, but isHardhatPluginError returned true",
      );
    });
  });

  describe("Without parent error", () => {
    it("should have the right plugin name", () => {
      const error = new HardhatPluginError("examplePlugin", "error message");
      assert.equal(error.pluginId, "examplePlugin");
    });

    it("should have the right error message", () => {
      const error = new HardhatPluginError("examplePlugin", "error message");
      assert.equal(error.message, "error message");
    });

    it("shouldn't have a cause", () => {
      assert.equal(
        new HardhatPluginError("examplePlugin", "error message").cause,
        undefined,
      );
    });
  });

  describe("With cause error", () => {
    it("should have the right cause error", () => {
      const cause = new Error();
      const error = new HardhatPluginError(
        "examplePlugin",
        "error message",
        cause,
      );
      assert.equal(error.cause, cause);
    });
  });
});

describe("Error categories", () => {
  it("Should have max > min", () => {
    for (const errorGroup of Object.keys(ERROR_CATEGORIES)) {
      const packageInfo = ERROR_CATEGORIES[errorGroup];
      assert.ok(
        packageInfo.min < packageInfo.max,
        `Range of ${errorGroup} is invalid`,
      );

      for (const categoryGroup of Object.keys(packageInfo.CATEGORIES)) {
        const categoryInfo = packageInfo.CATEGORIES[categoryGroup];
        assert.ok(
          categoryInfo.min < categoryInfo.max,
          `Range of ${errorGroup}.CATEGORIES.${categoryGroup} is invalid`,
        );
      }
    }
  });

  it("Shouldn't overlap ranges", () => {
    for (const errorGroup of Object.keys(ERROR_CATEGORIES)) {
      const range = ERROR_CATEGORIES[errorGroup];

      for (const errorGroup2 of Object.keys(ERROR_CATEGORIES)) {
        const range2 = ERROR_CATEGORIES[errorGroup2];

        if (errorGroup === errorGroup2) {
          continue;
        }

        const rangesHaveOverlap =
          (range.min >= range2.min && range.min <= range2.max) ||
          (range.max >= range2.min && range.max <= range2.max);

        assert.ok(
          !rangesHaveOverlap,
          `Ranges of ${errorGroup} and ${errorGroup2} overlap`,
        );
      }

      for (const categoryGroup of Object.keys(
        ERROR_CATEGORIES[errorGroup].CATEGORIES,
      )) {
        const categoryRange =
          ERROR_CATEGORIES[errorGroup].CATEGORIES[categoryGroup];

        for (const categoryGroup2 of Object.keys(
          ERROR_CATEGORIES[errorGroup].CATEGORIES,
        )) {
          const categoryRange2 =
            ERROR_CATEGORIES[errorGroup].CATEGORIES[categoryGroup2];

          if (categoryGroup === categoryGroup2) {
            continue;
          }

          const rangesHaveOverlap =
            (categoryRange.min >= categoryRange2.min &&
              categoryRange.min <= categoryRange2.max) ||
            (categoryRange.max >= categoryRange2.min &&
              categoryRange.max <= categoryRange2.max);

          assert.ok(
            !rangesHaveOverlap,
            `Ranges of ${errorGroup}.CATEGORIES.${categoryGroup} and ${errorGroup}.CATEGORIES.${categoryGroup2} overlap`,
          );
        }

        assert.ok(
          categoryRange.min >= range.min && categoryRange.max <= range.max,
          `Range of ${errorGroup}.CATEGORIES.${categoryGroup} is out of range`,
        );
      }
    }
  });
});

describe("Error descriptors", () => {
  it("Should have all errors inside their ranges", () => {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
    We know that this is correct */
    for (const packageName of Object.keys(HardhatError.ERRORS) as Array<
      keyof typeof HardhatError.ERRORS
    >) {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
    We know that this is correct */
      for (const categoryName of Object.keys(
        HardhatError.ERRORS[packageName],
      ) as Array<keyof (typeof HardhatError.ERRORS)[typeof packageName]>) {
        const range = ERROR_CATEGORIES[packageName].CATEGORIES[categoryName];
        const category = ERRORS[packageName][categoryName];

        for (const [name, errorDescriptor] of Object.entries<ErrorDescriptor>(
          category,
        )) {
          assert.ok(
            errorDescriptor.number >= range.min,
            `ERRORS.${packageName}.${categoryName}.${name}'s number is out of range`,
          );

          assert.ok(
            errorDescriptor.number <= range.max - 1,
            `ERRORS.${packageName}.${categoryName}.${name}'s number is out of range`,
          );
        }
      }
    }
  });

  it("Shouldn't repeat error numbers", () => {
    const usedNumbers = new Set<number>();

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
    We know that this is correct */
    for (const packageName of Object.keys(HardhatError.ERRORS) as Array<
      keyof typeof HardhatError.ERRORS
    >) {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
    We know that this is correct */
      for (const categoryName of Object.keys(
        HardhatError.ERRORS[packageName],
      ) as Array<keyof (typeof HardhatError.ERRORS)[typeof packageName]>) {
        for (const [name, errorDescriptor] of Object.entries<ErrorDescriptor>(
          HardhatError.ERRORS[packageName][categoryName],
        )) {
          if (usedNumbers.has(errorDescriptor.number)) {
            assert.fail(
              `ERRORS.${packageName}.${categoryName}.${name}'s number is repeated`,
            );
          }

          usedNumbers.add(errorDescriptor.number);
        }
      }
    }
  });

  it("Should keep the numbers in order, without gaps", () => {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
    We know that this is correct */
    for (const packageName of Object.keys(HardhatError.ERRORS) as Array<
      keyof typeof HardhatError.ERRORS
    >) {
      const packageRange = ERROR_CATEGORIES[packageName];

      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
    We know that this is correct */
      for (const categoryName of Object.keys(
        HardhatError.ERRORS[packageName],
      ) as Array<keyof (typeof HardhatError.ERRORS)[typeof packageName]>) {
        const categoryRange = packageRange.CATEGORIES[categoryName];
        let expectedErrorNumber = categoryRange.min;

        for (const [name, errorDescriptor] of Object.entries<ErrorDescriptor>(
          HardhatError.ERRORS[packageName][categoryName],
        )) {
          assert.equal(
            errorDescriptor.number,
            expectedErrorNumber,
            `ERRORS.${packageName}.${categoryName}.${name}'s number is out of range`,
          );

          expectedErrorNumber += 1;
        }
      }
    }
  });
});

describe("applyErrorMessageTemplate", () => {
  describe("Replacements", () => {
    describe("String values", () => {
      it("Should replace variable tags for the values", () => {
        assert.equal(
          applyErrorMessageTemplate("asd {asd} 123 {asd}", { asd: "r" }),
          "asd r 123 r",
        );

        assert.equal(
          applyErrorMessageTemplate("asd{asd} {asd} {fgh} 123", {
            asd: "r",
            fgh: "b",
          }),
          "asdr r b 123",
        );

        assert.equal(
          applyErrorMessageTemplate("asd{asd} {asd} {fgh} 123", {
            asd: "r",
            fgh: "",
          }),
          "asdr r  123",
        );
      });
    });

    describe("Non-string values", () => {
      it("Should replace undefined values for undefined", () => {
        assert.equal(
          applyErrorMessageTemplate("asd {asd} 123 {asd}", { asd: undefined }),
          "asd undefined 123 undefined",
        );
      });

      it("Should replace null values for null", () => {
        assert.equal(
          applyErrorMessageTemplate("asd {asd} 123 {asd}", { asd: null }),
          "asd null 123 null",
        );
      });

      it("Should use their toString methods", () => {
        const toR = { toString: () => "r" };
        const toB = { toString: () => "b" };
        const toEmpty = { toString: () => "" };

        assert.equal(
          applyErrorMessageTemplate("asd {asd} 123 {asd}", { asd: toR }),
          "asd r 123 r",
        );

        assert.equal(
          applyErrorMessageTemplate("asd{asd} {asd} {fgh} 123", {
            asd: toR,
            fgh: toB,
          }),
          "asdr r b 123",
        );

        assert.equal(
          applyErrorMessageTemplate("asd{asd} {asd} {fgh} 123", {
            asd: toR,
            fgh: toEmpty,
          }),
          "asdr r  123",
        );
      });
    });

    describe("Edge cases", () => {
      it("Should support {}", () => {
        assert.equal(
          applyErrorMessageTemplate("foo {} {}", {
            [""]: "bar",
          }),
          "foo bar bar",
        );
      });
    });
  });
});

describe("Type tests", () => {
  describe("ErrorDescriptor types", () => {
    it("should have the right type", () => {
      const _descriptors: {
        [packageName in keyof typeof ERROR_CATEGORIES]: {
          [categoryName in keyof (typeof ERROR_CATEGORIES)[packageName]["CATEGORIES"]]: {
            [name: string]: ErrorDescriptor;
          };
        };
      } = ERRORS;
    });
  });

  describe("MessagetTemplateArguments type", () => {
    it("Should work with no variables", () => {
      expectTypeOf<MessagetTemplateArguments<"hello">>().toEqualTypeOf<{}>();
    });

    it("Should work with a single variable", () => {
      expectTypeOf<MessagetTemplateArguments<"{hello}">>().toEqualTypeOf<{
        hello: ErrorMessageTemplateValue;
      }>();

      expectTypeOf<MessagetTemplateArguments<" {hello}">>().toEqualTypeOf<{
        hello: ErrorMessageTemplateValue;
      }>();

      expectTypeOf<
        MessagetTemplateArguments<"asdjkhads {hello}">
      >().toEqualTypeOf<{
        hello: ErrorMessageTemplateValue;
      }>();

      expectTypeOf<
        MessagetTemplateArguments<"{hello} asdasd">
      >().toEqualTypeOf<{
        hello: ErrorMessageTemplateValue;
      }>();

      expectTypeOf<
        MessagetTemplateArguments<"asdasd {hello} asdasd">
      >().toEqualTypeOf<{
        hello: ErrorMessageTemplateValue;
      }>();
    });

    it("Should work with multiple variables", () => {
      expectTypeOf<MessagetTemplateArguments<"{hello}{hola}">>().toEqualTypeOf<{
        hello: ErrorMessageTemplateValue;
        hola: ErrorMessageTemplateValue;
      }>();

      expectTypeOf<
        MessagetTemplateArguments<"{hello}asdas{hola}">
      >().toEqualTypeOf<{
        hello: ErrorMessageTemplateValue;
        hola: ErrorMessageTemplateValue;
      }>();

      expectTypeOf<
        MessagetTemplateArguments<"asd {hello}asdas{hola}">
      >().toEqualTypeOf<{
        hello: ErrorMessageTemplateValue;
        hola: ErrorMessageTemplateValue;
      }>();

      expectTypeOf<
        MessagetTemplateArguments<"asd{hola}asd {hello}asdas">
      >().toEqualTypeOf<{
        hello: ErrorMessageTemplateValue;
        hola: ErrorMessageTemplateValue;
      }>();
    });

    it("Should work with repeated variables", () => {
      expectTypeOf<
        MessagetTemplateArguments<"asd{hola}asd {hello}asdas{hello},asd,jhasd  {hola}">
      >().toEqualTypeOf<{
        hello: ErrorMessageTemplateValue;
        hola: ErrorMessageTemplateValue;
      }>();
    });

    describe("Edge cases", () => {
      it("Should support {}", () => {
        expectTypeOf<MessagetTemplateArguments<"foo {} {}">>().toEqualTypeOf<{
          /* eslint-disable-next-line @typescript-eslint/naming-convention --
          This test case is intentionally testing a weird variable name */
          "": ErrorMessageTemplateValue;
        }>();
      });
    });
  });

  describe("Hardhat error constructor", () => {
    it("Should be constructable without arguments if there aren't any", () => {
      const _e = new HardhatError(mockErrorDescriptor);
      const _e2 = new HardhatError(mockErrorDescriptor, new Error());
    });

    it("Should be constructable with the right arguments", () => {
      const _e = new HardhatError(
        {
          ...mockErrorDescriptor,
          messageTemplate: "{asd}",
        } as const,
        { asd: 123 },
      );

      const _e2 = new HardhatError(
        {
          ...mockErrorDescriptor,
          messageTemplate: "{asd}",
        } as const,
        { asd: 123 },
        new Error(),
      );
    });
  });

  describe("messageArguments property types", () => {
    it("Should have the right type", () => {
      expectTypeOf(
        new HardhatError(mockErrorDescriptor).messageArguments,
      ).toEqualTypeOf({});

      expectTypeOf(
        new HardhatError(
          {
            ...mockErrorDescriptor,
            messageTemplate: "{asd}",
          } as const,
          { asd: 123 },
        ).messageArguments,
      ).toEqualTypeOf<{ asd: ErrorMessageTemplateValue }>();
    });
  });
});
