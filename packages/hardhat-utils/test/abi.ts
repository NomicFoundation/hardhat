import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AbiEncodingFailedError,
  AbiParametersLengthMismatchError,
  AbiValueOutOfBoundsError,
  InvalidAbiValueError,
  UnsupportedAbiTypeError,
  encodeAbiParameters,
  getAbiConstructorParameters,
  getIntTypeRange,
  isAbiEncodingError,
  parseIntType,
} from "../src/abi.js";
import { getUnprefixedHexString } from "../src/hex.js";

/** Encodes and returns the result without the "0x" prefix, for readability. */
async function encode(
  parameters: Array<Record<string, unknown>>,
  values: unknown[],
): Promise<string> {
  const encoded = await encodeAbiParameters(
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing
    parameters as Array<{ type: string }>,
    values,
  );
  return getUnprefixedHexString(encoded);
}

/** Asserts that encoding rejects with the given error name and fields. */
async function assertEncodingError(
  parameters: Array<Record<string, unknown>>,
  values: unknown[],
  name: string,
  fields: Record<string, unknown> = {},
): Promise<void> {
  await assert.rejects(encode(parameters, values), (error: Error) => {
    assert.equal(error.name, name, `expected a ${name}, got a ${error.name}`);
    for (const [key, expected] of Object.entries(fields)) {
      assert.deepEqual(
        Reflect.get(error, key),
        expected,
        `unexpected "${key}" in ${name}`,
      );
    }
    return true;
  });
}

describe("abi", () => {
  describe("parseIntType", () => {
    it("Should parse the explicitly sized types", () => {
      assert.deepEqual(parseIntType("uint8"), { signed: false, bits: 8 });
      assert.deepEqual(parseIntType("uint256"), { signed: false, bits: 256 });
      assert.deepEqual(parseIntType("int8"), { signed: true, bits: 8 });
      assert.deepEqual(parseIntType("int128"), { signed: true, bits: 128 });
      assert.deepEqual(parseIntType("int256"), { signed: true, bits: 256 });
    });

    it("Should treat uint and int as aliases of the 256-bit types", () => {
      assert.deepEqual(parseIntType("uint"), { signed: false, bits: 256 });
      assert.deepEqual(parseIntType("int"), { signed: true, bits: 256 });
    });

    it("Should return undefined if the bit count is not a multiple of 8", () => {
      assert.equal(parseIntType("uint7"), undefined);
      assert.equal(parseIntType("int1"), undefined);
      assert.equal(parseIntType("uint255"), undefined);
    });

    it("Should return undefined if the bit count exceeds 256", () => {
      assert.equal(parseIntType("uint264"), undefined);
      assert.equal(parseIntType("int512"), undefined);
    });

    it("Should return undefined for types that are not Solidity integers", () => {
      assert.equal(parseIntType(""), undefined);
      assert.equal(parseIntType("address"), undefined);
      assert.equal(parseIntType("bool"), undefined);
      assert.equal(parseIntType("bytes32"), undefined);
      assert.equal(parseIntType("string"), undefined);
      assert.equal(parseIntType("uint256[]"), undefined);
      assert.equal(parseIntType("Uint256"), undefined);
      assert.equal(parseIntType("uint0"), undefined);
      assert.equal(parseIntType("uint08"), undefined);
      assert.equal(parseIntType("uint-8"), undefined);
    });
  });

  describe("getIntTypeRange", () => {
    it("Should return the range of the unsigned types", () => {
      assert.deepEqual(getIntTypeRange({ signed: false, bits: 8 }), {
        min: 0n,
        max: 255n,
      });
      assert.deepEqual(getIntTypeRange({ signed: false, bits: 256 }), {
        min: 0n,
        max: 2n ** 256n - 1n,
      });
    });

    it("Should return the range of the signed types", () => {
      assert.deepEqual(getIntTypeRange({ signed: true, bits: 8 }), {
        min: -128n,
        max: 127n,
      });
      assert.deepEqual(getIntTypeRange({ signed: true, bits: 256 }), {
        min: -(2n ** 255n),
        max: 2n ** 255n - 1n,
      });
    });
  });

  describe("getAbiConstructorParameters", () => {
    it("Should return the constructor's parameters", () => {
      const inputs = [{ name: "a", type: "uint256" }];

      assert.deepEqual(
        getAbiConstructorParameters([
          { type: "function", name: "f", inputs: [] },
          { type: "constructor", inputs },
          { type: "event", name: "E", inputs: [] },
        ]),
        inputs,
      );
    });

    it("Should return an empty array if the abi declares no constructor", () => {
      assert.deepEqual(getAbiConstructorParameters([]), []);
      assert.deepEqual(
        getAbiConstructorParameters([{ type: "function", name: "f" }]),
        [],
      );
    });

    it("Should return an empty array if the constructor has no inputs", () => {
      assert.deepEqual(
        getAbiConstructorParameters([{ type: "constructor" }]),
        [],
      );
    });
  });

  describe("encodeAbiParameters", () => {
    describe("encoding", () => {
      it("Should encode nothing when there are no parameters", async () => {
        assert.equal(await encodeAbiParameters([], []), "0x");
      });

      it("Should encode the static types", async () => {
        assert.equal(
          await encode([{ name: "a", type: "uint256" }], [50]),
          "0000000000000000000000000000000000000000000000000000000000000032",
        );
        assert.equal(
          await encode([{ name: "a", type: "uint8" }], [255]),
          "00000000000000000000000000000000000000000000000000000000000000ff",
        );
        assert.equal(
          await encode([{ name: "a", type: "int256" }], [-5]),
          /* cspell:disable-next-line */
          "fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffb",
        );
        assert.equal(
          await encode([{ name: "a", type: "bool" }], [true]),
          "0000000000000000000000000000000000000000000000000000000000000001",
        );
        assert.equal(
          await encode(
            [{ name: "a", type: "address" }],
            ["0x752C8191E6b1Db38B41A8c8921F7a703F2969d18"],
          ),
          "000000000000000000000000752c8191e6b1db38b41a8c8921f7a703f2969d18",
        );
        assert.equal(
          await encode(
            [{ name: "a", type: "bytes32" }],
            [
              "0x1111111111111111111111111111111111111111111111111111111111111111",
            ],
          ),
          "1111111111111111111111111111111111111111111111111111111111111111",
        );
      });

      it("Should encode the dynamic types", async () => {
        assert.equal(
          await encode([{ name: "a", type: "string" }], ["initializer"]),
          [
            // offset
            "0000000000000000000000000000000000000000000000000000000000000020",
            // length (11)
            "000000000000000000000000000000000000000000000000000000000000000b",
            // "initializer", right-padded
            "696e697469616c697a6572000000000000000000000000000000000000000000",
          ].join(""),
        );
        assert.equal(
          await encode([{ name: "a", type: "bytes" }], ["0xdeadbeef"]),
          [
            // offset
            "0000000000000000000000000000000000000000000000000000000000000020",
            // length (4)
            "0000000000000000000000000000000000000000000000000000000000000004",
            // 0xdeadbeef, right-padded
            "deadbeef00000000000000000000000000000000000000000000000000000000",
          ].join(""),
        );
      });

      it("Should encode a mix of static and dynamic parameters", async () => {
        assert.equal(
          await encode(
            [
              { name: "arg1", type: "uint256" },
              { name: "arg2", type: "string" },
              { name: "arg3", type: "address" },
            ],
            [50, "initializer", "0x752C8191E6b1Db38B41A8c8921F7a703F2969d18"],
          ),
          [
            // arg1: uint256 (50)
            "0000000000000000000000000000000000000000000000000000000000000032",
            // arg2: string offset, after the three head slots
            "0000000000000000000000000000000000000000000000000000000000000060",
            // arg3: address
            "000000000000000000000000752c8191e6b1db38b41a8c8921f7a703f2969d18",
            // arg2: string length (11)
            "000000000000000000000000000000000000000000000000000000000000000b",
            // arg2: "initializer", right-padded
            "696e697469616c697a6572000000000000000000000000000000000000000000",
          ].join(""),
        );
      });

      it("Should encode dynamic and fixed-size arrays", async () => {
        assert.equal(
          await encode([{ name: "a", type: "uint256[]" }], [[1, 2, 3]]),
          [
            // offset
            "0000000000000000000000000000000000000000000000000000000000000020",
            // length (3)
            "0000000000000000000000000000000000000000000000000000000000000003",
            // element 0 (1)
            "0000000000000000000000000000000000000000000000000000000000000001",
            // element 1 (2)
            "0000000000000000000000000000000000000000000000000000000000000002",
            // element 2 (3)
            "0000000000000000000000000000000000000000000000000000000000000003",
          ].join(""),
        );
        assert.equal(
          await encode([{ name: "a", type: "uint256[2]" }], [[1, 2]]),
          [
            // a fixed-size array of static elements is inlined, with no
            // offset and no length
            // element 0 (1)
            "0000000000000000000000000000000000000000000000000000000000000001",
            // element 1 (2)
            "0000000000000000000000000000000000000000000000000000000000000002",
          ].join(""),
        );
      });

      it("Should encode the empty aggregates", async () => {
        assert.equal(
          await encode([{ name: "a", type: "string" }], [""]),
          [
            // offset
            "0000000000000000000000000000000000000000000000000000000000000020",
            // length (0), with no data word following it
            "0000000000000000000000000000000000000000000000000000000000000000",
          ].join(""),
        );
        assert.equal(
          await encode([{ name: "a", type: "uint256[]" }], [[]]),
          [
            // offset
            "0000000000000000000000000000000000000000000000000000000000000020",
            // length (0), with no elements following it
            "0000000000000000000000000000000000000000000000000000000000000000",
          ].join(""),
        );
      });

      it("Should encode nested tuples", async () => {
        const parameters = [
          {
            name: "arg1",
            type: "tuple",
            components: [
              { name: "x", type: "uint256" },
              { name: "y", type: "uint256" },
              {
                name: "nestedProperty",
                type: "tuple",
                components: [
                  { name: "x", type: "uint256" },
                  { name: "y", type: "uint256" },
                ],
              },
            ],
          },
        ];
        // A tuple of static components is inlined, so the nested tuple's
        // components follow the outer ones with no offset and no length.
        const expected = [
          // x (8)
          "0000000000000000000000000000000000000000000000000000000000000008",
          // y (16)
          "0000000000000000000000000000000000000000000000000000000000000010",
          // nestedProperty.x (32)
          "0000000000000000000000000000000000000000000000000000000000000020",
          // nestedProperty.y (64)
          "0000000000000000000000000000000000000000000000000000000000000040",
        ].join("");

        // The object and array forms must encode identically.
        assert.equal(
          await encode(parameters, [
            { x: 8, y: 16, nestedProperty: { x: 32, y: 64 } },
          ]),
          expected,
        );
        assert.equal(await encode(parameters, [[8, 16, [32, 64]]]), expected);
      });

      it("Should encode an array of tuples", async () => {
        assert.equal(
          await encode(
            [
              {
                name: "a",
                type: "tuple[]",
                components: [
                  { name: "x", type: "uint256" },
                  { name: "y", type: "uint256" },
                ],
              },
            ],
            [[{ x: 1, y: 2 }, [3, 4]]],
          ),
          [
            // offset
            "0000000000000000000000000000000000000000000000000000000000000020",
            // length (2)
            "0000000000000000000000000000000000000000000000000000000000000002",
            // element 0: x (1)
            "0000000000000000000000000000000000000000000000000000000000000001",
            // element 0: y (2)
            "0000000000000000000000000000000000000000000000000000000000000002",
            // element 1: x (3)
            "0000000000000000000000000000000000000000000000000000000000000003",
            // element 1: y (4)
            "0000000000000000000000000000000000000000000000000000000000000004",
          ].join(""),
        );
      });

      it("Should encode a tuple with dynamic components", async () => {
        assert.equal(
          await encode(
            [
              {
                name: "a",
                type: "tuple",
                components: [
                  { name: "s", type: "string" },
                  { name: "n", type: "uint256" },
                ],
              },
            ],
            [{ s: "hi", n: 1 }],
          ),
          [
            // a tuple with a dynamic component is itself dynamic, so it sits
            // behind an offset instead of being inlined
            "0000000000000000000000000000000000000000000000000000000000000020",
            // s: string offset, relative to the start of the tuple
            "0000000000000000000000000000000000000000000000000000000000000040",
            // n: uint256 (1)
            "0000000000000000000000000000000000000000000000000000000000000001",
            // s: string length (2)
            "0000000000000000000000000000000000000000000000000000000000000002",
            // s: "hi", right-padded
            "6869000000000000000000000000000000000000000000000000000000000000",
          ].join(""),
        );
      });

      it("Should encode named and unnamed parameters identically", async () => {
        const values = [1, "hi"];
        assert.equal(
          await encode(
            [
              { name: "a", type: "uint256" },
              { name: "b", type: "string" },
            ],
            values,
          ),
          await encode([{ type: "uint256" }, { type: "string" }], values),
        );
      });
    });

    describe("accepted value shapes", () => {
      it("Should accept integers as bigints, numbers and strings", async () => {
        const parameters = [{ name: "a", type: "uint256" }];
        const expected =
          "0000000000000000000000000000000000000000000000000000000000000032";

        for (const value of [50, 50n, "50", "0x32", "0X32"]) {
          assert.equal(await encode(parameters, [value]), expected, `${value}`);
        }
      });

      it("Should accept negative integers in every numeric form", async () => {
        const parameters = [{ name: "a", type: "int256" }];
        const expected =
          /* cspell:disable-next-line */
          "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffce";

        for (const value of [-50, -50n, "-50", "-0x32"]) {
          assert.equal(await encode(parameters, [value]), expected, `${value}`);
        }
      });

      it("Should accept addresses prefixed, unprefixed and in any case", async () => {
        const parameters = [{ name: "a", type: "address" }];
        const expected =
          "000000000000000000000000752c8191e6b1db38b41a8c8921f7a703f2969d18";

        for (const value of [
          "0x752C8191E6b1Db38B41A8c8921F7a703F2969d18", // mixed
          "0x752c8191e6b1db38b41a8c8921f7a703f2969d18", // lowercase
          "0x752C8191E6B1DB38B41A8C8921F7A703F2969D18", // uppercase
          "752C8191E6b1Db38B41A8c8921F7a703F2969d18", // unprefixed
        ]) {
          assert.equal(await encode(parameters, [value]), expected, value);
        }
      });

      it("Should encode empty bytes as empty, not as a zero byte", async () => {
        const expected = [
          // offset
          "0000000000000000000000000000000000000000000000000000000000000020",
          // length (0), with no data word following it
          "0000000000000000000000000000000000000000000000000000000000000000",
        ].join("");

        for (const value of ["0x", "", new Uint8Array()]) {
          assert.equal(
            await encode([{ name: "a", type: "bytes" }], [value]),
            expected,
            `${JSON.stringify(String(value))} should encode as zero bytes`,
          );
        }
      });

      it("Should accept bytes as hex strings and Uint8Arrays", async () => {
        const parameters = [{ name: "a", type: "bytes4" }];
        const expected =
          "deadbeef00000000000000000000000000000000000000000000000000000000";

        for (const value of [
          "0xdeadbeef",
          "deadbeef",
          "0xDEADBEEF",
          new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
        ]) {
          assert.equal(await encode(parameters, [value]), expected);
        }
      });
    });

    describe("errors", () => {
      it("Should throw if the number of values doesn't match", async () => {
        await assertEncodingError(
          [{ name: "a", type: "uint256" }],
          [],
          "AbiParametersLengthMismatchError",
          { expectedLength: 1, providedLength: 0 },
        );
        await assertEncodingError([], [1], "AbiParametersLengthMismatchError", {
          expectedLength: 0,
          providedLength: 1,
        });
      });

      it("Should throw if an integer value is invalid", async () => {
        await assertEncodingError(
          [{ name: "arg1", type: "uint256" }],
          ["not a number"],
          "InvalidAbiValueError",
          {
            path: "arg1",
            solidityType: "uint256",
            value: "not a number",
            reason: "invalid numeric value",
          },
        );

        await assertEncodingError(
          [{ name: "arg1", type: "uint256" }],
          [{}],
          "InvalidAbiValueError",
          { reason: "invalid numeric value" },
        );
      });

      it("Should throw if a number is not a safe integer", async () => {
        for (const value of [1.5, 1e300, Number.NaN]) {
          await assertEncodingError(
            [{ name: "arg1", type: "uint256" }],
            [value],
            "InvalidAbiValueError",
            {
              reason:
                "invalid numeric value, it is not a safe integer; use a bigint or a string instead",
            },
          );
        }
      });

      it("Should throw if an integer value is out of bounds", async () => {
        await assertEncodingError(
          [{ name: "arg1", type: "uint8" }],
          [256],
          "AbiValueOutOfBoundsError",
          {
            path: "arg1",
            solidityType: "uint8",
            value: 256,
            min: 0n,
            max: 255n,
          },
        );
        await assertEncodingError(
          [{ name: "arg1", type: "int8" }],
          [-129],
          "AbiValueOutOfBoundsError",
          { min: -128n, max: 127n },
        );
        await assertEncodingError(
          [{ name: "arg1", type: "uint256" }],
          [-1],
          "AbiValueOutOfBoundsError",
          {},
        );
      });

      it("Should throw if a string, bool or address value is invalid", async () => {
        await assertEncodingError(
          [{ name: "arg1", type: "string" }],
          [1],
          "InvalidAbiValueError",
          { value: 1, reason: "invalid string value" },
        );
        await assertEncodingError(
          [{ name: "arg1", type: "bool" }],
          ["true"],
          "InvalidAbiValueError",
          { reason: "invalid boolean value" },
        );
        await assertEncodingError(
          [{ name: "arg1", type: "address" }],
          ["0x1234"],
          "InvalidAbiValueError",
          { reason: "invalid address value" },
        );
        await assertEncodingError(
          [{ name: "arg1", type: "address" }],
          [1234],
          "InvalidAbiValueError",
          { reason: "invalid address value, expected a string" },
        );
      });

      it("Should throw if a bytes value is invalid", async () => {
        await assertEncodingError(
          [{ name: "arg1", type: "bytes" }],
          ["0xabc"],
          "InvalidAbiValueError",
          { reason: "invalid bytes value, the hex string has an odd length" },
        );
        await assertEncodingError(
          [{ name: "arg1", type: "bytes4" }],
          ["0xdead"],
          "InvalidAbiValueError",
          { reason: "invalid bytes length, expected 4 bytes but got 2" },
        );
        await assertEncodingError(
          [{ name: "arg1", type: "bytes" }],
          ["nothex"],
          "InvalidAbiValueError",
          {
            reason:
              "invalid bytes value, expected a hex string or a Uint8Array",
          },
        );
      });

      it("Should throw if an array value is invalid", async () => {
        await assertEncodingError(
          [{ name: "arg1", type: "uint256[]" }],
          ["not an array"],
          "InvalidAbiValueError",
          { reason: "invalid array value, expected a JS array" },
        );
        await assertEncodingError(
          [{ name: "arg1", type: "uint256[2]" }],
          [[1, 2, 3]],
          "InvalidAbiValueError",
          { reason: "invalid array length, expected 2 elements but got 3" },
        );
      });

      it("Should throw if a tuple value is invalid", async () => {
        const components = [
          { name: "x", type: "uint256" },
          { name: "y", type: "uint256" },
        ];

        await assertEncodingError(
          [{ name: "arg1", type: "tuple", components }],
          [[1]],
          "InvalidAbiValueError",
          { reason: "invalid tuple length, expected 2 components but got 1" },
        );
        await assertEncodingError(
          [{ name: "arg1", type: "tuple", components }],
          [{ x: 1 }],
          "InvalidAbiValueError",
          {
            path: "arg1.y",
            reason: 'missing value for the tuple component "y"',
          },
        );
        await assertEncodingError(
          [{ name: "arg1", type: "tuple", components }],
          [1],
          "InvalidAbiValueError",
          { reason: "invalid tuple value, expected an array or an object" },
        );
        await assertEncodingError(
          [
            {
              name: "arg1",
              type: "tuple",
              components: [{ type: "uint256" }, { type: "uint256" }],
            },
          ],
          [{ x: 1 }],
          "InvalidAbiValueError",
          {
            reason:
              "invalid tuple value, it has unnamed components so it must be provided as an array",
          },
        );
      });

      it("Should report the path of a nested value", async () => {
        await assertEncodingError(
          [
            {
              name: "arg1",
              type: "tuple",
              components: [
                {
                  name: "nestedProperty",
                  type: "tuple",
                  components: [{ name: "x", type: "uint256" }],
                },
              ],
            },
          ],
          [{ nestedProperty: { x: "oops" } }],
          "InvalidAbiValueError",
          { path: "arg1.nestedProperty.x" },
        );

        await assertEncodingError(
          [{ name: "arg1", type: "uint256[]" }],
          [[1, 2, "oops"]],
          "InvalidAbiValueError",
          { path: "arg1[2]" },
        );

        // Unnamed parameters and tuple components are identified by index.
        await assertEncodingError(
          [{ type: "uint256" }],
          ["oops"],
          "InvalidAbiValueError",
          { path: "[0]" },
        );

        await assertEncodingError(
          [
            {
              name: "arg1",
              type: "tuple",
              components: [{ type: "uint256" }, { type: "uint256" }],
            },
          ],
          [[1, "oops"]],
          "InvalidAbiValueError",
          { path: "arg1[1]" },
        );
      });

      it("Should throw if a type is not supported", async () => {
        for (const type of [
          "fixed128x18",
          "function",
          "bytes33",
          "uint7",
          "notAType",
        ]) {
          await assertEncodingError(
            [{ name: "arg1", type }],
            [0],
            "UnsupportedAbiTypeError",
            { path: "arg1", solidityType: type },
          );
        }

        await assertEncodingError(
          [{ name: "arg1", type: "tuple", components: [] }],
          [[]],
          "UnsupportedAbiTypeError",
          { solidityType: "tuple" },
        );
      });

      it("Should wrap a failure of the encoder itself", async () => {
        // The encoder rejects arrays of zero-sized elements, as they can be
        // used to DoS the decoder. The type passes our validation, so this is
        // the one case that reaches the encoder and fails there.
        await assertEncodingError(
          [{ name: "arg1", type: "uint256[0][]" }],
          [[]],
          "AbiEncodingFailedError",
        );
      });
    });
  });

  describe("isAbiEncodingError", () => {
    const errors = [
      new AbiParametersLengthMismatchError(1, 0),
      new InvalidAbiValueError("a", "uint256", 1, "reason"),
      new AbiValueOutOfBoundsError("a", "uint8", 256, 0n, 255n),
      new UnsupportedAbiTypeError("a", "fixed128x18"),
      new AbiEncodingFailedError(new Error("boom")),
    ];

    it("Should match an error of the given kind", () => {
      for (const error of errors) {
        assert.ok(
          isAbiEncodingError(error, error.kind),
          `${error.name} should match its own kind`,
        );
      }
    });

    it("Should not match an error of a different kind", () => {
      for (const error of errors) {
        for (const other of errors.filter((e) => e.kind !== error.kind)) {
          assert.ok(
            !isAbiEncodingError(error, other.kind),
            `${error.name} should not match "${other.kind}"`,
          );
        }
      }
    });

    it("Should not match anything else", () => {
      for (const value of [
        new Error("not an abi error"),
        undefined,
        null,
        "invalid-value",
        // Not an Error, so it doesn't match despite having the right shape.
        { kind: "invalid-value" },
      ]) {
        assert.ok(
          !isAbiEncodingError(value, "invalid-value"),
          `${String(value)} should not match any kind`,
        );
      }
    });
  });
});
