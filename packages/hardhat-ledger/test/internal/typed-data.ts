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

    // The signer kit adds to the `types` it is handed; the copy keeps that off
    // the caller's object.
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
    // `JSON.parse` rounded it before anyone could tell, so the device would
    // sign the rounded value and nothing would report it.
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
    // UTF-8 has no encoding for a lone surrogate, so every encoder substitutes
    // something of its own and no two agree on what was signed.
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

    // Neither a hang nor a stack overflow: the walk skips what it has seen.
    assert.equal(toTypedData({ ...DATA, message }).message, message);
  });
});
