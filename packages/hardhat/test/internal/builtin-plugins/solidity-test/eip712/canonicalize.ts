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

  describe("selectedNames", () => {
    it("only emits selected structs but inline deps from non-selected ones", () => {
      const collected = [
        struct(
          "Mail",
          [
            ["Person", "from"],
            ["Person", "to"],
            ["string", "contents"],
          ],
          "test/Mail.sol",
        ),
        struct(
          "Person",
          [
            ["address", "wallet"],
            ["string", "name"],
          ],
          "lib/Person.sol",
        ),
      ];

      const result = canonicalizeStructs(collected, new Set(["Mail"]));

      assert.deepEqual(result, [
        "Mail(Person from,Person to,string contents)Person(address wallet,string name)",
      ]);
    });

    it("walks transitive deps through non-selected structs", () => {
      const collected = [
        struct(
          "Order",
          [
            ["uint256", "id"],
            ["Holder", "holder"],
          ],
          "test/Order.sol",
        ),
        struct(
          "Holder",
          [
            ["address", "owner"],
            ["Asset", "asset"],
          ],
          "lib/Holder.sol",
        ),
        struct(
          "Asset",
          [
            ["address", "token"],
            ["uint256", "amount"],
          ],
          "lib/Asset.sol",
        ),
      ];

      const result = canonicalizeStructs(collected, new Set(["Order"]));

      assert.deepEqual(result, [
        "Order(uint256 id,Holder holder)" +
          "Asset(address token,uint256 amount)" +
          "Holder(address owner,Asset asset)",
      ]);
    });

    it("drops a selected struct when a non-selected transitive dep is not decodable", () => {
      const collected = [
        struct(
          "Order",
          [
            ["uint256", "id"],
            ["Holder", "holder"],
          ],
          "test/Order.sol",
        ),
        struct(
          "Holder",
          [
            ["uint256", "amount"],
            [undefined, "balances"],
          ],
          "lib/Holder.sol",
        ),
      ];

      const result = canonicalizeStructs(collected, new Set(["Order"]));

      assert.deepEqual(result, []);
    });

    it("does not emit non-selected structs even when they are encodable", () => {
      const collected = [
        struct("Foo", [["uint256", "x"]], "test/Foo.sol"),
        struct("Bar", [["uint256", "y"]], "lib/Bar.sol"),
      ];

      const result = canonicalizeStructs(collected, new Set(["Foo"]));

      assert.deepEqual(result, ["Foo(uint256 x)"]);
    });

    it("returns empty when selectedNames is empty", () => {
      const collected = [
        struct("Foo", [["uint256", "x"]], "test/Foo.sol"),
        struct("Bar", [["uint256", "y"]], "lib/Bar.sol"),
      ];

      const result = canonicalizeStructs(collected, new Set());

      assert.deepEqual(result, []);
    });

    it("does not throw on conflicting definitions when neither side is selected", () => {
      const collected = [
        struct("Wanted", [["uint256", "x"]], "test/Wanted.sol"),
        struct("Helper", [["uint256", "a"]], "lib/A.sol"),
        struct("Helper", [["uint256", "b"]], "lib/B.sol"),
      ];

      const result = canonicalizeStructs(collected, new Set(["Wanted"]));

      assert.deepEqual(result, ["Wanted(uint256 x)"]);
    });

    it("throws when a selected struct depends on a non-selected name with conflicting definitions", () => {
      const collected = [
        struct(
          "Mail",
          [
            ["Person", "from"],
            ["string", "contents"],
          ],
          "test/Mail.sol",
        ),
        struct(
          "Person",
          [
            ["address", "wallet"],
            ["string", "name"],
          ],
          "lib/A.sol",
        ),
        struct("Person", [["uint256", "id"]], "lib/B.sol"),
      ];

      assertThrowsHardhatError(
        () => canonicalizeStructs(collected, new Set(["Mail"])),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.EIP712_DUPLICATE_STRUCT_NAME,
        {
          name: "Person",
          firstSource: "lib/A.sol",
          secondSource: "lib/B.sol",
        },
      );
    });

    it("throws when a transitively-required non-selected name has conflicting definitions", () => {
      const collected = [
        struct("Mail", [["Person", "from"]], "test/Mail.sol"),
        struct("Person", [["Wallet", "w"]], "lib/Person.sol"),
        struct("Wallet", [["address", "addr"]], "lib/A.sol"),
        struct("Wallet", [["bytes32", "id"]], "lib/B.sol"),
      ];

      assertThrowsHardhatError(
        () => canonicalizeStructs(collected, new Set(["Mail"])),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.EIP712_DUPLICATE_STRUCT_NAME,
        {
          name: "Wallet",
          firstSource: "lib/A.sol",
          secondSource: "lib/B.sol",
        },
      );
    });

    it("throws when a selected name is also defined differently in a non-selected file", () => {
      const collected = [
        struct(
          "Person",
          [
            ["address", "wallet"],
            ["string", "name"],
          ],
          "test/Person.sol",
        ),
        struct("Person", [["uint256", "x"]], "lib/Other.sol"),
      ];

      assertThrowsHardhatError(
        () => canonicalizeStructs(collected, new Set(["Person"])),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.EIP712_DUPLICATE_STRUCT_NAME,
        {
          name: "Person",
          firstSource: "test/Person.sol",
          secondSource: "lib/Other.sol",
        },
      );

      assertThrowsHardhatError(
        () =>
          canonicalizeStructs([...collected].reverse(), new Set(["Person"])),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.EIP712_DUPLICATE_STRUCT_NAME,
        {
          name: "Person",
          firstSource: "lib/Other.sol",
          secondSource: "test/Person.sol",
        },
      );
    });
  });
});
