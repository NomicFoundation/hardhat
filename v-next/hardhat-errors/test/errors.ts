import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { expectTypeOf } from "expect-type";

import {
  ERRORS,
  ERROR_CATEGORIES,
  ErrorDescriptor,
} from "../src/descriptors.js";
import {
  ErrorMessageTemplateValue,
  HardhatError,
  MessagetTemplateArguments,
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
      assert.ok(
        HardhatError.isHardhatError(new HardhatError(mockErrorDescriptor)),
      );
    });

    it("Should return true for HardhatErrors with the same ErrorDescriptor", () => {
      assert.ok(
        HardhatError.isHardhatError(
          new HardhatError(mockErrorDescriptor),
          mockErrorDescriptor,
        ),
      );
    });

    it("Should return false for everything else", () => {
      assert.ok(!HardhatError.isHardhatError(new Error()));
      assert.ok(!HardhatError.isHardhatError(undefined));
      assert.ok(!HardhatError.isHardhatError(null));
      assert.ok(!HardhatError.isHardhatError(123));
      assert.ok(!HardhatError.isHardhatError("123"));
      assert.ok(!HardhatError.isHardhatError({ asd: 123 }));
    });

    it("Should return false for HardhatErrors with a different ErrorDescriptor", () => {
      assert.ok(
        !HardhatError.isHardhatError(new HardhatError(mockErrorDescriptor), {
          ...mockErrorDescriptor,
          number: 1,
        }),
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

describe("Error categories", () => {
  it("Should have max > min", () => {
    for (const errorGroup of Object.keys(ERROR_CATEGORIES)) {
      const range = ERROR_CATEGORIES[errorGroup];
      assert.ok(range.min < range.max, `Range of ${errorGroup} is invalid`);
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
    }
  });
});

describe("Error descriptors", () => {
  it("Should have all errors inside their ranges", () => {
    for (const errorGroup of Object.keys(HardhatError.ERRORS) as Array<
      keyof typeof HardhatError.ERRORS
    >) {
      const range = ERROR_CATEGORIES[errorGroup];

      for (const [name, errorDescriptor] of Object.entries<ErrorDescriptor>(
        HardhatError.ERRORS[errorGroup],
      )) {
        assert.ok(
          errorDescriptor.number >= range.min,
          `ERRORS.${errorGroup}.${name}'s number is out of range`,
        );

        assert.ok(
          errorDescriptor.number <= range.max - 1,
          `ERRORS.${errorGroup}.${name}'s number is out of range`,
        );
      }
    }
  });

  it("Shouldn't repeat error numbers", () => {
    for (const errorGroup of Object.keys(HardhatError.ERRORS) as Array<
      keyof typeof HardhatError.ERRORS
    >) {
      for (const [name, errorDescriptor] of Object.entries<ErrorDescriptor>(
        HardhatError.ERRORS[errorGroup],
      )) {
        for (const [name2, errorDescriptor2] of Object.entries<ErrorDescriptor>(
          HardhatError.ERRORS[errorGroup],
        )) {
          if (name !== name2) {
            assert.notEqual(
              errorDescriptor.number,
              errorDescriptor2.number,
              `ERRORS.${errorGroup}.${name} and ${errorGroup}.${name2} have repeated numbers`,
            );
          }
        }
      }
    }
  });

  it("Should keep the numbers in order, without gaps", () => {
    for (const errorGroup of Object.keys(HardhatError.ERRORS) as Array<
      keyof typeof HardhatError.ERRORS
    >) {
      const range = ERROR_CATEGORIES[errorGroup];
      let expectedErrorNumber = range.min;

      for (const [name, errorDescriptor] of Object.entries<ErrorDescriptor>(
        HardhatError.ERRORS[errorGroup],
      )) {
        assert.equal(
          errorDescriptor.number,
          expectedErrorNumber,
          `ERRORS.${errorGroup}.${name}'s number is out of range`,
        );

        expectedErrorNumber += 1;
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
  });
});

describe("Type tests", () => {
  describe("ErrorDescriptor types", () => {
    it("should have the right type", () => {
      const descriptors: {
        [category in keyof typeof ERROR_CATEGORIES]: {
          [name: string]: ErrorDescriptor;
        };
      } = ERRORS;

      void descriptors;
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
  });

  describe("Hardhat error constructor", () => {
    it("Should be constructable without arguments if there aren't any", () => {
      void new HardhatError(mockErrorDescriptor);
      void new HardhatError(mockErrorDescriptor, new Error());
    });

    it("Should be constructable with the right arguments", () => {
      void new HardhatError(
        {
          ...mockErrorDescriptor,
          messageTemplate: "{asd}",
        } as const,
        { asd: 123 },
      );

      void new HardhatError(
        {
          ...mockErrorDescriptor,
          messageTemplate: "{asd}",
        } as const,
        { asd: 123 },
        new Error(),
      );
    });
  });

  describe("messageArguments propery types", () => {
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
