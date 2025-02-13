import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isObject } from "@ignored/hardhat-vnext-utils/lang";
import { z } from "zod";

import {
  unionType,
  conditionalUnionType,
  incompatibleFieldType,
} from "../src/index.js";

function assertParseResult(
  result: z.SafeParseReturnType<any, any>,
  expectedMessage: string,
  path?: Array<string | number>,
) {
  assert.equal(result.error?.errors.length, 1);
  assert.equal(result.error?.errors[0].message, expectedMessage);

  if (path !== undefined) {
    assert.deepEqual(result.error?.errors[0].path, path);
  }
}

describe("unionType", () => {
  it("It should return the expected error message", function () {
    const union = unionType(
      [z.object({ a: z.string() }), z.object({ b: z.string() })],
      "Expected error message",
    );

    assertParseResult(
      union.safeParse({ a: 123, c: 123 }),
      "Expected error message",
    );

    assertParseResult(union.safeParse(123), "Expected error message");

    assertParseResult(union.safeParse({}), "Expected error message");

    assertParseResult(union.safeParse(undefined), "Expected error message");
  });

  it("Should work with deep errors", () => {
    const mySchema = unionType(
      [z.string(), z.number()],
      "Expected a string or number",
    );

    assertParseResult(mySchema.safeParse(false), "Expected a string or number");

    const mySchema2 = unionType(
      [z.string().url(), z.number()],
      "Expected a URL or number",
    );

    assertParseResult(mySchema2.safeParse(false), "Expected a URL or number");
    assertParseResult(mySchema2.safeParse("a"), "Expected a URL or number");
  });

  it("Should accept valid data", () => {
    const mySchema = unionType(
      [z.string(), z.number()],
      "Expected a string or number",
    );

    mySchema.parse("asd");
    mySchema.parse(123);

    const mySchema2 = unionType(
      [z.string().url(), z.number()],
      "Expected a URL or number",
    );
    mySchema2.parse("http://example.com");
    mySchema2.parse(123);
  });
});

describe("conditionalUnionType", () => {
  describe("Conditions evaluation", () => {
    it("should return the first type that matches", async () => {
      const shouldUseString = conditionalUnionType(
        [
          [(data) => typeof data === "string", z.string()],
          [(data) => typeof data === "string", z.string().url()],
        ],
        "No match",
      );

      // Both conditions match, but we only use the first one
      assert.equal(shouldUseString.safeParse("asd").success, true);

      const shouldUseUrl = conditionalUnionType(
        [
          [(data) => typeof data === "string", z.string().url()],
          [(data) => typeof data === "string", z.string()],
        ],
        "No match",
      );

      assertParseResult(shouldUseUrl.safeParse("asd"), "Invalid url");
    });

    it("should return the provided error message if no condition matches", async () => {
      const shouldUseString = conditionalUnionType(
        [
          [(data) => typeof data === "string", z.string()],
          [(data) => typeof data === "string", z.string().url()],
        ],
        "No match",
      );

      // No condition matches, so we return the provided error message
      assertParseResult(shouldUseString.safeParse(123), "No match");
    });
  });

  describe("Zod issues paths", () => {
    it("should have an empty path when nothing matches in as a top-level type", async () => {
      const shouldUseString = conditionalUnionType(
        [
          [(data) => typeof data === "string", z.string()],
          [(data) => typeof data === "string", z.string().url()],
        ],
        "No match",
      );

      assertParseResult(shouldUseString.safeParse(123), "No match", []);
    });

    it("Should have the path to the nested error if a condition matches", () => {
      const shouldUseString = conditionalUnionType(
        [
          [isObject, z.object({ foo: z.string() })],
          [(data) => typeof data === "string", z.string().url()],
        ],
        "No match",
      );

      assertParseResult(
        shouldUseString.safeParse({ foo: 123 }),
        "Expected string, received number",
        ["foo"],
      );
    });

    it("Should have the path to the nested error, even if it's also a conditional union type", () => {
      const shouldUseString = conditionalUnionType(
        [
          [(data) => typeof data === "string", z.string()],
          [
            isObject,
            conditionalUnionType(
              [
                [
                  (data) => isObject(data) && "foo" in data,
                  z.object({ foo: z.string().url() }),
                ],
                [
                  (data) => isObject(data) && "bar" in data,
                  z.object({ bar: z.array(z.number()) }),
                ],
              ],
              "No internal match",
            ),
          ],
        ],
        "No outer match",
      );

      assertParseResult(shouldUseString.safeParse(123), "No outer match", []);

      assertParseResult(shouldUseString.safeParse({}), "No internal match", []);

      assertParseResult(
        shouldUseString.safeParse({ foo: "asd" }),
        "Invalid url",
        ["foo"],
      );

      assertParseResult(
        shouldUseString.safeParse({ bar: "asd" }),
        "Expected array, received string",
        ["bar"],
      );

      assertParseResult(
        shouldUseString.safeParse({ bar: ["asd"] }),
        "Expected number, received string",
        ["bar", 0],
      );
    });
  });
});

describe("incompatibleFieldType", () => {
  it("should return an error if the field is present", async () => {
    const type = z.object({
      bar: incompatibleFieldType("Expected error"),
    });

    assertParseResult(type.safeParse({ bar: "asd" }), "Expected error", [
      "bar",
    ]);

    assertParseResult(type.safeParse({ bar: null }), "Expected error", ["bar"]);
  });

  it("should not return an error if the field is not present", async () => {
    const type = z.object({
      bar: incompatibleFieldType("Expected error"),
    });

    assert.equal(type.safeParse({}).success, true);
    assert.equal(type.safeParse({ foo: 123 }).success, true);
    assert.equal(type.safeParse({ bar: undefined }).success, true);
  });
});
