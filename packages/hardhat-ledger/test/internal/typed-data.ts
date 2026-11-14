import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { deepClone } from "@nomicfoundation/hardhat-utils/lang";

import { toTypedData } from "../../src/internal/typed-data.js";

const DOMAIN_TYPE = [{ name: "name", type: "string" }];
const CHAIN_ID_TYPE = { name: "chainId", type: "uint256" };

const TYPES = {
  EIP712Domain: DOMAIN_TYPE,
  Mail: [{ name: "contents", type: "string" }],
};

const DATA = {
  types: TYPES,
  primaryType: "Mail",
  domain: { name: "Ether Mail" },
  message: { contents: "Hello, Bob!" },
};

/** A big integer, past what a JavaScript number represents exactly. */
const LOSSY_INTEGER = "123456789012345678901234567890";

function assertInvalid(data: string | object): void {
  assertThrowsHardhatError(
    () => toTypedData(data),
    HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL
      .ETH_SIGN_TYPED_DATA_V4_INVALID_DATA_PARAM,
    {},
  );
}

/** `DATA` with `Mail` reduced to one field of the given type and value. */
function withField(type: string, value: unknown): object {
  return {
    ...DATA,
    types: {
      ...TYPES,
      Mail: [{ name: "field", type }],
      Inner: [{ name: "n", type: "uint256" }],
    },
    message: { field: value },
  };
}

describe("toTypedData", () => {
  it("should parse the data when it arrives as a JSON string", () => {
    assert.deepEqual(toTypedData(JSON.stringify(DATA)), DATA);
  });

  it("should not mutate the data it is given", async () => {
    const data = {
      ...DATA,
      types: { ...TYPES, EIP712Domain: [...DOMAIN_TYPE, CHAIN_ID_TYPE] },
      domain: { name: "Ether Mail", chainId: "0x89" },
    };
    const before = await deepClone(data);

    const typedData = toTypedData(data);

    // The signer mutates `types`; the copy protects the caller's object.
    typedData.types.EIP712Domain = [];

    assert.deepEqual(data, before);
    assert.equal(typedData.domain.chainId, 137);
  });

  it("should keep a domain field the signer kit does not declare", () => {
    // Dropping it would silently sign a different domain.
    const typedData = toTypedData({
      ...DATA,
      types: {
        ...TYPES,
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "issuer", type: "address" },
        ],
      },
      domain: { name: "Ether Mail", issuer: `0x${"11".repeat(20)}` },
    });

    assert.deepEqual(typedData.domain, {
      name: "Ether Mail",
      issuer: `0x${"11".repeat(20)}`,
    });
  });

  it("should accept a chain id as a number or as a string", () => {
    for (const [chainId, expected] of [
      [1, 1],
      ["1", 1],
      ["0x89", 137],
      [137n, 137],
    ] as const) {
      const typedData = toTypedData({
        ...DATA,
        types: { ...TYPES, EIP712Domain: [...DOMAIN_TYPE, CHAIN_ID_TYPE] },
        domain: { name: "Ether Mail", chainId },
      });

      assert.equal(typedData.domain.chainId, expected);
    }
  });

  it("should reject a chain id that does not survive the conversion", () => {
    // Rounding it would hash a different chain id than the one requested.
    for (const chainId of ["0xffffffffffffffff", "", " ", "nope"]) {
      assertInvalid({
        ...DATA,
        types: { ...TYPES, EIP712Domain: [...DOMAIN_TYPE, CHAIN_ID_TYPE] },
        domain: { name: "Ether Mail", chainId },
      });
    }
  });

  it("should reject data that is not shaped like EIP-712 typed data", () => {
    for (const data of [
      "not json",
      "42",
      { not: "typed data" },
      { ...DATA, domain: "Ether Mail" },
      { ...DATA, types: [] },
      { ...DATA, message: null },
      { ...DATA, primaryType: 7 },
      // Undeclared, the second one only resolved through `Object.prototype`.
      { ...DATA, primaryType: "Letter" },
      { ...DATA, primaryType: "toString" },
      // A type that is not a list of `{ name, type }` fields.
      { ...DATA, types: { ...TYPES, Mail: { contents: "string" } } },
      { ...DATA, types: { ...TYPES, Mail: [{ name: "contents" }] } },
      { ...DATA, types: { ...TYPES, Mail: [{ name: 1, type: "string" }] } },
    ]) {
      assertInvalid(data);
    }
  });

  it("should reject an integer that has already lost precision", () => {
    // `JSON.parse` rounds this before validation sees it.
    assertInvalid(
      JSON.stringify(withField("uint256", 0)).replace(
        '"field":0',
        `"field":${LOSSY_INTEGER}`,
      ),
    );

    for (const data of [
      withField("uint256", Number(LOSSY_INTEGER)),
      withField("uint256", 2 ** 53),
      withField("uint256[]", [1, 2 ** 53]),
      withField("Inner", { n: 2 ** 53 }),
      withField("Inner[]", [{ n: 1 }, { n: 2 ** 53 }]),
      {
        ...DATA,
        types: {
          ...TYPES,
          EIP712Domain: [...DOMAIN_TYPE, { name: "nonce", type: "uint256" }],
        },
        domain: { name: "Ether Mail", nonce: 2 ** 53 },
      },
    ]) {
      assertInvalid(data);
    }

    // The same values survive as a string, and so does the largest safe one.
    assert.deepEqual(toTypedData(withField("uint256", LOSSY_INTEGER)).message, {
      field: LOSSY_INTEGER,
    });
    assert.deepEqual(toTypedData(withField("uint256", 2 ** 53 - 1)).message, {
      field: 2 ** 53 - 1,
    });
  });

  it("should reject a string that is not well-formed text", () => {
    // Encoders can replace lone surrogates with different values.
    for (const data of [
      withField("string", "\ud800"),
      withField("string", "\udc00"),
      withField("string", "Hello\udc00, Bob!"),
      withField("string[]", ["Hello", "\ud800"]),
      { ...DATA, domain: { name: "Ether\udc00 Mail" } },
    ]) {
      assertInvalid(data);
    }

    // A proper surrogate pair and non-ASCII text are fine.
    const contents = "Hello, Bob! \u{1F44B} na\u00efve";

    assert.deepEqual(toTypedData({ ...DATA, message: { contents } }).message, {
      contents,
    });
  });

  it("should walk a value that refers to itself only once", () => {
    const message: Record<string, unknown> = { contents: "Hello, Bob!" };
    message.self = message;

    // The walk skips objects it has already seen.
    assert.equal(toTypedData({ ...DATA, message }).message, message);
  });

  describe("names the Ledger cannot sign", () => {
    function assertUnsupportedName(data: string | object, name: string): void {
      assertThrowsHardhatError(
        () => toTypedData(data),
        HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL
          .ETH_SIGN_TYPED_DATA_V4_UNSUPPORTED_NAME,
        { name },
      );
    }

    /** `DATA` with `Mail` declaring the given fields. */
    function withMailFields(fields: Array<{ name: string; type: string }>) {
      return { ...DATA, types: { ...TYPES, Mail: fields } };
    }

    it("should reject a field name made only of digits", () => {
      assertUnsupportedName(
        withMailFields([
          { name: "contents", type: "string" },
          { name: "123", type: "string" },
        ]),
        "123",
      );

      // Rejected too, although JavaScript keeps it in place.
      assertUnsupportedName(
        withMailFields([{ name: "01", type: "string" }]),
        "01",
      );
    });

    it("should reject a field name made only of digits in the domain", () => {
      assertUnsupportedName(
        {
          ...DATA,
          types: {
            ...TYPES,
            EIP712Domain: [...DOMAIN_TYPE, { name: "0", type: "string" }],
          },
        },
        "0",
      );
    });

    it("should reject __proto__ as a field name", () => {
      // Parsed from JSON, so `__proto__` is an ordinary own key.
      assertUnsupportedName(
        JSON.stringify(withMailFields([{ name: "__proto__", type: "string" }])),
        "__proto__",
      );
    });

    it("should reject a type name made only of digits or __proto__", () => {
      for (const typeName of ["123", "__proto__"]) {
        assertUnsupportedName(
          `{"types":{"EIP712Domain":[{"name":"name","type":"string"}],"Mail":[{"name":"contents","type":"string"}],"${typeName}":[{"name":"x","type":"uint256"}]},"primaryType":"Mail","domain":{"name":"Ether Mail"},"message":{"contents":"Hello, Bob!"}}`,
          typeName,
        );
      }
    });

    it("should reject a type that declares the same field twice", () => {
      assertUnsupportedName(
        withMailFields([
          { name: "contents", type: "string" },
          { name: "contents", type: "string" },
        ]),
        "contents",
      );
    });

    it("should accept names that contain digits but are not only digits", () => {
      const data = {
        ...withMailFields([
          { name: "field1", type: "string" },
          { name: "_2", type: "string" },
        ]),
        message: { field1: "a", _2: "b" },
      };

      assert.deepEqual(toTypedData(data), data);
    });
  });
});
