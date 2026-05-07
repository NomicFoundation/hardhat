import type { CollectedStruct } from "../../../../../src/internal/builtin-plugins/solidity-test/eip712/ast-walker.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { canonicalizeStructs } from "../../../../../src/internal/builtin-plugins/solidity-test/eip712/canonicalize.js";

function struct(
  name: string,
  members: Array<[string | undefined, string]>,
  sourcePath = "test/Sample.sol",
): CollectedStruct {
  return {
    name,
    sourcePath,
    members: members.map(([type, memberName]) => ({
      type,
      name: memberName,
    })),
  };
}

describe("eip712 - canonicalize", () => {
  it("emits a single head for a primitives-only struct", () => {
    const result = canonicalizeStructs([
      struct("Person", [
        ["address", "wallet"],
        ["string", "name"],
      ]),
    ]);

    assert.deepEqual(result, ["Person(address wallet,string name)"]);
  });

  it("appends deps and sorts them alphabetically (EIP-712 Mail example)", () => {
    const collected = [
      struct("Mail", [
        ["Person", "from"],
        ["Person", "to"],
        ["string", "contents"],
      ]),
      struct("Person", [
        ["address", "wallet"],
        ["string", "name"],
      ]),
    ];

    const result = canonicalizeStructs(collected);

    assert.deepEqual(result, [
      "Mail(Person from,Person to,string contents)Person(address wallet,string name)",
      "Person(address wallet,string name)",
    ]);
  });

  it("emits one entry per struct with deps inlined (Transaction example)", () => {
    const collected = [
      struct("Transaction", [
        ["Person", "from"],
        ["Person", "to"],
        ["Asset", "tx"],
      ]),
      struct("Asset", [
        ["address", "token"],
        ["uint256", "amount"],
      ]),
      struct("Person", [
        ["address", "wallet"],
        ["string", "name"],
      ]),
    ];

    const result = canonicalizeStructs(collected);

    // Transaction with deps inlined alphabetically: Asset before Person.
    assert.deepEqual(result, [
      "Transaction(Person from,Person to,Asset tx)" +
        "Asset(address token,uint256 amount)" +
        "Person(address wallet,string name)",
      "Asset(address token,uint256 amount)",
      "Person(address wallet,string name)",
    ]);
  });

  it("merges direct and transitive deps into one sorted set", () => {
    // Transaction directly references Asset and Person; Person itself
    // references Wallet. The Transaction entry must pull in all three (Asset,
    // Person, Wallet) and sort them as one merged set, not "directs first,
    // transitives after".
    const collected = [
      struct("Transaction", [
        ["Asset", "asset"],
        ["Person", "person"],
      ]),
      struct("Asset", [["uint256", "amount"]]),
      struct("Person", [["Wallet", "wallet"]]),
      struct("Wallet", [["address", "addr"]]),
    ];

    const result = canonicalizeStructs(collected);

    assert.deepEqual(result, [
      "Transaction(Asset asset,Person person)" +
        "Asset(uint256 amount)" +
        "Person(Wallet wallet)" +
        "Wallet(address addr)",
      "Asset(uint256 amount)",
      "Person(Wallet wallet)Wallet(address addr)",
      "Wallet(address addr)",
    ]);
  });

  it("dedupes identical struct definitions found in multiple sources", () => {
    const collected = [
      struct("Person", [
        ["address", "wallet"],
        ["string", "name"],
      ]),
      struct(
        "Person",
        [
          ["address", "wallet"],
          ["string", "name"],
        ],
        "test/Other.sol",
      ),
    ];

    const result = canonicalizeStructs(collected);

    assert.deepEqual(result, ["Person(address wallet,string name)"]);
  });

  it("throws on conflicting definitions for the same struct name", () => {
    assertThrowsHardhatError(
      () =>
        canonicalizeStructs([
          struct("Foo", [["uint256", "a"]], "test/A.sol"),
          struct("Foo", [["uint256", "b"]], "test/B.sol"),
        ]),
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.EIP712_DUPLICATE_STRUCT_NAME,
      {
        name: "Foo",
        firstSource: "test/A.sol",
        secondSource: "test/B.sol",
      },
    );
  });

  it("throws when same-named structs differ only in an unsupported member", () => {
    // Both definitions encode to `Foo(address from)` once mapping members are
    // dropped, but they aren't the same struct. Comparing only the encoded
    // head would let the non decodable definition silently win, dropping `Foo`
    // from the output even though an encodable definition exists.
    assertThrowsHardhatError(
      () =>
        canonicalizeStructs([
          struct(
            "Foo",
            [
              ["address", "from"],
              [undefined, "balances"],
            ],
            "test/A.sol",
          ),
          struct("Foo", [["address", "from"]], "test/B.sol"),
        ]),
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.EIP712_DUPLICATE_STRUCT_NAME,
      {
        name: "Foo",
        firstSource: "test/A.sol",
        secondSource: "test/B.sol",
      },
    );
  });

  it("throws when same-named structs differ only in which member is unsupported", () => {
    // Both heads collapse to `Foo(address from,address to)` once the mapping
    // is dropped, but the structs are clearly different definitions.
    assertThrowsHardhatError(
      () =>
        canonicalizeStructs([
          struct(
            "Foo",
            [
              ["address", "from"],
              [undefined, "m"],
              ["address", "to"],
            ],
            "test/A.sol",
          ),
          struct(
            "Foo",
            [
              ["address", "from"],
              ["address", "to"],
            ],
            "test/B.sol",
          ),
        ]),
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.EIP712_DUPLICATE_STRUCT_NAME,
      {
        name: "Foo",
        firstSource: "test/A.sol",
        secondSource: "test/B.sol",
      },
    );
  });

  it("dedupes same-named structs that share unsupported members exactly", () => {
    // Same struct seen in two build infos (e.g. partial recompiles): the
    // unsupported member appears in both, at the same position, with the same
    // name. Treat as one definition.
    const collected = [
      struct(
        "Holder",
        [
          ["uint256", "amount"],
          [undefined, "balances"],
        ],
        "test/A.sol",
      ),
      struct(
        "Holder",
        [
          ["uint256", "amount"],
          [undefined, "balances"],
        ],
        "test/B.sol",
      ),
    ];

    // Both copies are non decodable (mapping member), so the canonical output is
    // empty — the important part is that canonicalization doesn't throw.
    const result = canonicalizeStructs(collected);

    assert.deepEqual(result, []);
  });

  it("drops structs with non-decodable members (e.g. mappings)", () => {
    // Matches forge: `resolve_struct_eip712` returns `None` when any member
    // has an unsupported type, so the struct is filtered out entirely rather
    // than emitted with the bad member silently removed.
    const result = canonicalizeStructs([
      struct("Holder", [
        ["uint256", "id"],
        [undefined, "balances"],
        ["address", "owner"],
      ]),
    ]);

    assert.deepEqual(result, []);
  });

  it("drops structs that transitively depend on non-decodable structs", () => {
    // Holder has a mapping → non-decodable.
    // Order references Holder → non-decodable too (None propagates through deps).
    // Person is independent → still encodable.
    const result = canonicalizeStructs([
      struct("Person", [
        ["address", "wallet"],
        ["string", "name"],
      ]),
      struct("Holder", [
        ["uint256", "amount"],
        [undefined, "balances"],
      ]),
      struct("Order", [
        ["uint256", "id"],
        ["Holder", "holder"],
      ]),
    ]);

    assert.deepEqual(result, ["Person(address wallet,string name)"]);
  });

  it("treats array-of-struct members as a struct dep", () => {
    const result = canonicalizeStructs([
      struct("Bag", [["Item[]", "items"]]),
      struct("Item", [["uint256", "id"]]),
    ]);

    assert.deepEqual(result, [
      "Bag(Item[] items)Item(uint256 id)",
      "Item(uint256 id)",
    ]);
  });

  it("strips fixed-size and nested array suffixes when resolving deps", () => {
    const result = canonicalizeStructs([
      struct("Bag", [
        ["Item[3]", "fixed"],
        ["Other[2][3]", "nested"],
      ]),
      struct("Item", [["uint256", "id"]]),
      struct("Other", [["address", "who"]]),
    ]);

    assert.deepEqual(result, [
      "Bag(Item[3] fixed,Other[2][3] nested)" +
        "Item(uint256 id)" +
        "Other(address who)",
      "Item(uint256 id)",
      "Other(address who)",
    ]);
  });

  it("ignores self-references when computing deps", () => {
    // `S` has a member of type `S[]` (legal in Solidity). The self-ref must
    // not be emitted as a dep — only its name appears in the head.
    const result = canonicalizeStructs([struct("S", [["S[]", "children"]])]);
    assert.deepEqual(result, ["S(S[] children)"]);
  });
});
