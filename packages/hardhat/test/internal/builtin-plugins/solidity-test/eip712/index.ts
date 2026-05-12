import type { BuildInfoAndOutput } from "../../../../../src/internal/builtin-plugins/solidity-test/edr-artifacts.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { utf8StringToBytes } from "@nomicfoundation/hardhat-utils/bytes";

import { collectEip712CanonicalTypes } from "../../../../../src/internal/builtin-plugins/solidity-test/eip712/index.js";

interface FakeSource {
  inputSourceName: string;
  userSourceName: string;
  ast: unknown;
}

function makeBuildInfo(
  buildInfoId: string,
  sources: FakeSource[],
): BuildInfoAndOutput {
  const userSourceNameMap: Record<string, string> = {};
  for (const s of sources) {
    userSourceNameMap[s.userSourceName] = s.inputSourceName;
  }
  const buildInfo = {
    _format: "hh3-sol-build-info-1",
    id: buildInfoId,
    solcVersion: "0.8.23",
    solcLongVersion: "0.8.23+commit.f704f362",
    userSourceNameMap,
    input: { language: "Solidity", sources: {}, settings: {} },
  };

  const outputSources: Record<string, unknown> = {};
  for (const s of sources) {
    outputSources[s.inputSourceName] = { id: 0, ast: s.ast };
  }

  const output = {
    _format: "hh3-sol-build-info-output-1",
    id: buildInfoId,
    output: { sources: outputSources },
  };

  return {
    buildInfoId,
    buildInfo: utf8StringToBytes(JSON.stringify(buildInfo)),
    output: utf8StringToBytes(JSON.stringify(output)),
  };
}

function structAst(
  name: string,
  members: Array<{ type: string; name: string }>,
): unknown {
  return {
    nodeType: "StructDefinition",
    name,
    members: members.map((m) => ({
      nodeType: "VariableDeclaration",
      name: m.name,
      typeName: m.type.endsWith("]")
        ? buildArrayTypeName(m.type)
        : isElementary(m.type)
          ? { nodeType: "ElementaryTypeName", name: m.type }
          : {
              nodeType: "UserDefinedTypeName",
              typeDescriptions: { typeString: `struct ${m.type}` },
            },
    })),
  };
}

function isElementary(t: string): boolean {
  return /^(address|bool|string|bytes\d*|u?int\d*)$/.test(t);
}

function buildArrayTypeName(t: string): unknown {
  // `Foo[]` or `Foo[3]`
  const match = /^(.+)\[([^\]]*)\]$/.exec(t);
  if (match === null) {
    throw new Error(`bad array type: ${t}`);
  }

  const baseType = match[1];
  const length = match[2];

  return {
    nodeType: "ArrayTypeName",
    baseType: isElementary(baseType)
      ? { nodeType: "ElementaryTypeName", name: baseType }
      : {
          nodeType: "UserDefinedTypeName",
          typeDescriptions: { typeString: `struct ${baseType}` },
        },
    length: length === "" ? null : { nodeType: "Literal", value: length },
  };
}

function sourceUnit(structs: unknown[]): unknown {
  return { nodeType: "SourceUnit", nodes: structs };
}

function contractAst(name: string, structs: unknown[]): unknown {
  return {
    nodeType: "ContractDefinition",
    name,
    nodes: structs,
  };
}

describe("eip712 - collectEip712CanonicalTypes", () => {
  it("returns an empty list when no include is configured", () => {
    // The feature is opt-in: without `include`, collection short-circuits
    // before any build info is parsed.
    const buildInfo = makeBuildInfo("solc-0_8_23-00000000", [
      {
        inputSourceName: "project/test/Types.sol",
        userSourceName: "test/Types.sol",
        ast: sourceUnit([structAst("Foo", [{ type: "uint256", name: "x" }])]),
      },
    ]);

    // All possible scenarios where `include` is empty/unset:
    assert.deepEqual(collectEip712CanonicalTypes([buildInfo], undefined), []);
    assert.deepEqual(collectEip712CanonicalTypes([buildInfo], {}), []);
    assert.deepEqual(
      collectEip712CanonicalTypes([buildInfo], { include: [] }),
      [],
    );
    // Exclude alone is a no-op without an include to narrow.
    assert.deepEqual(
      collectEip712CanonicalTypes([buildInfo], { exclude: ["**"] }),
      [],
    );
  });

  it("returns the flat canonical list for a Mail/Person fixture", () => {
    const buildInfo = makeBuildInfo("solc-0_8_23-aaaaaaaa", [
      {
        inputSourceName: "project/test/Types.sol",
        userSourceName: "test/Types.sol",
        ast: sourceUnit([
          structAst("Mail", [
            { type: "Person", name: "from" },
            { type: "Person", name: "to" },
            { type: "string", name: "contents" },
          ]),
          structAst("Person", [
            { type: "address", name: "wallet" },
            { type: "string", name: "name" },
          ]),
        ]),
      },
    ]);

    const result = collectEip712CanonicalTypes([buildInfo], {
      include: ["test/**"],
    });

    assert.deepEqual(result, [
      "Mail(Person from,Person to,string contents)Person(address wallet,string name)",
      "Person(address wallet,string name)",
    ]);
  });

  it("filters by include/exclude on the user source name", () => {
    const buildInfo = makeBuildInfo("solc-0_8_23-bbbbbbbb", [
      {
        inputSourceName: "project/contracts/Foo.sol",
        userSourceName: "contracts/Foo.sol",
        ast: sourceUnit([structAst("Foo", [{ type: "uint256", name: "x" }])]),
      },
      {
        inputSourceName: "project/test/Bar.sol",
        userSourceName: "test/Bar.sol",
        ast: sourceUnit([structAst("Bar", [{ type: "uint256", name: "y" }])]),
      },
    ]);

    const onlyTests = collectEip712CanonicalTypes([buildInfo], {
      include: ["test/**"],
    });
    assert.deepEqual(onlyTests, ["Bar(uint256 y)"]);

    const excludeTests = collectEip712CanonicalTypes([buildInfo], {
      include: ["**"],
      exclude: ["test/**"],
    });
    assert.deepEqual(excludeTests, ["Foo(uint256 x)"]);
  });

  it("dedupes the same struct seen across multiple build infos", () => {
    const ast = sourceUnit([
      structAst("Person", [
        { type: "address", name: "wallet" },
        { type: "string", name: "name" },
      ]),
    ]);
    const a = makeBuildInfo("solc-0_8_23-cccccccc", [
      {
        inputSourceName: "project/test/Types.sol",
        userSourceName: "test/Types.sol",
        ast,
      },
    ]);
    const b = makeBuildInfo("solc-0_8_23-dddddddd", [
      {
        inputSourceName: "project/test/Types.sol",
        userSourceName: "test/Types.sol",
        ast,
      },
    ]);

    const result = collectEip712CanonicalTypes([a, b], {
      include: ["test/**"],
    });

    assert.deepEqual(result, ["Person(address wallet,string name)"]);
  });

  it("resolves user source names across build infos", () => {
    // Mirrors `hardhat test solidity <one-test-file>`: the partial build
    // info's `userSourceNameMap` only registers the explicitly requested
    // file, but its output contains the full transitive source set. The
    // user-source name for the transitive source must come from the full
    // build info that ran earlier.
    const sharedAst = sourceUnit([
      structAst("Person", [
        { type: "address", name: "wallet" },
        { type: "string", name: "name" },
      ]),
    ]);
    const fullBuild = makeBuildInfo("solc-0_8_23-ffffffff", [
      {
        inputSourceName: "project/contracts/Types.sol",
        userSourceName: "contracts/Types.sol",
        ast: sourceUnit([]), // not the source we care about here
      },
    ]);
    const partialBuildId = "solc-0_8_23-aaaa1111";
    const partialBuildInfo = {
      _format: "hh3-sol-build-info-1",
      id: partialBuildId,
      solcVersion: "0.8.23",
      solcLongVersion: "0.8.23+commit.f704f362",
      userSourceNameMap: {
        "test/Foo.t.sol": "project/test/Foo.t.sol",
      },
      input: { language: "Solidity", sources: {}, settings: {} },
    };
    const partialOutput = {
      _format: "hh3-sol-build-info-output-1",
      id: partialBuildId,
      output: {
        sources: {
          // Pulled in transitively, but not in this build info's own map.
          "project/contracts/Types.sol": { id: 0, ast: sharedAst },
        },
      },
    };

    const result = collectEip712CanonicalTypes(
      [
        fullBuild,
        {
          buildInfoId: partialBuildId,
          buildInfo: utf8StringToBytes(JSON.stringify(partialBuildInfo)),
          output: utf8StringToBytes(JSON.stringify(partialOutput)),
        },
      ],
      { include: ["contracts/**"] },
    );

    assert.deepEqual(result, ["Person(address wallet,string name)"]);
  });

  it("falls back to inputSourceName when userSourceNameMap omits an entry", () => {
    // Imported sources (e.g. from npm packages) aren't registered as roots,
    // so they don't appear in `userSourceNameMap`. The orchestrator should
    // still surface their structs, keyed by the input source name.
    const buildInfoId = "solc-0_8_23-eeeeeeee";
    const buildInfo = {
      _format: "hh3-sol-build-info-1",
      id: buildInfoId,
      solcVersion: "0.8.23",
      solcLongVersion: "0.8.23+commit.f704f362",
      userSourceNameMap: {}, // no roots
      input: { language: "Solidity", sources: {}, settings: {} },
    };
    const output = {
      _format: "hh3-sol-build-info-output-1",
      id: buildInfoId,
      output: {
        sources: {
          "npm/some-pkg/Types.sol": {
            id: 0,
            ast: sourceUnit([
              structAst("Imported", [{ type: "uint256", name: "x" }]),
            ]),
          },
        },
      },
    };

    const result = collectEip712CanonicalTypes(
      [
        {
          buildInfoId,
          buildInfo: utf8StringToBytes(JSON.stringify(buildInfo)),
          output: utf8StringToBytes(JSON.stringify(output)),
        },
      ],
      { include: ["npm/**"] },
    );

    assert.deepEqual(result, ["Imported(uint256 x)"]);
  });

  it("strips the project/ prefix when a project file is missing from every userSourceNameMap", () => {
    // A project file outside the standard root directories (e.g. a shared
    // file in `lib/` that's only ever imported, never compiled as a root)
    // never appears in any build info's userSourceNameMap. Its input source
    // name is `project/lib/Helper.sol`. Falling back to that raw path would
    // make user globs like `lib/**` miss it. The collector strips the
    // `project/` prefix to recover the user-facing path.
    const buildInfoId = "solc-0_8_23-cccccccc";
    const buildInfo = {
      _format: "hh3-sol-build-info-1",
      id: buildInfoId,
      solcVersion: "0.8.23",
      solcLongVersion: "0.8.23+commit.f704f362",
      userSourceNameMap: {}, // transitive project file: not a root anywhere
      input: { language: "Solidity", sources: {}, settings: {} },
    };
    const output = {
      _format: "hh3-sol-build-info-output-1",
      id: buildInfoId,
      output: {
        sources: {
          "project/lib/Helper.sol": {
            id: 0,
            ast: sourceUnit([
              structAst("Helper", [{ type: "uint256", name: "n" }]),
            ]),
          },
        },
      },
    };

    const result = collectEip712CanonicalTypes(
      [
        {
          buildInfoId,
          buildInfo: utf8StringToBytes(JSON.stringify(buildInfo)),
          output: utf8StringToBytes(JSON.stringify(output)),
        },
      ],
      { include: ["lib/**"] },
    );

    assert.deepEqual(result, ["Helper(uint256 n)"]);
  });

  it("throws on conflicting same-named structs within a single source file", () => {
    // A top-level `struct S` and a `contract C { struct S { ... } }` with
    // a different definition share a source path but produce different
    // EIP-712 heads. Since `vm.eip712HashType` resolves by bare name, this
    // is genuinely ambiguous and must surface as an error rather than be
    // silently resolved by AST traversal order.
    const buildInfo = makeBuildInfo("solc-0_8_23-11111111", [
      {
        inputSourceName: "project/test/Types.sol",
        userSourceName: "test/Types.sol",
        ast: sourceUnit([
          structAst("S", [{ type: "uint256", name: "a" }]),
          contractAst("C", [structAst("S", [{ type: "uint256", name: "b" }])]),
        ]),
      },
    ]);

    assertThrowsHardhatError(
      () =>
        collectEip712CanonicalTypes([buildInfo], {
          include: ["test/**"],
        }),
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.EIP712_DUPLICATE_STRUCT_NAME,
      {
        name: "S",
        firstSource: "test/Types.sol",
        secondSource: "test/Types.sol",
      },
    );
  });

  it("throws on conflicting same-named structs across two contracts in one file", () => {
    const buildInfo = makeBuildInfo("solc-0_8_23-22222222", [
      {
        inputSourceName: "project/test/Types.sol",
        userSourceName: "test/Types.sol",
        ast: sourceUnit([
          contractAst("A", [structAst("S", [{ type: "uint256", name: "a" }])]),
          contractAst("B", [structAst("S", [{ type: "uint256", name: "b" }])]),
        ]),
      },
    ]);

    assertThrowsHardhatError(
      () =>
        collectEip712CanonicalTypes([buildInfo], {
          include: ["test/**"],
        }),
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.EIP712_DUPLICATE_STRUCT_NAME,
      {
        name: "S",
        firstSource: "test/Types.sol",
        secondSource: "test/Types.sol",
      },
    );
  });

  it("dedupes identical same-named structs within a single source file", () => {
    // A top-level `struct S` and a `contract C { struct S { ... } }` with
    // an identical definition produce the same EIP-712 head; that's not a
    // conflict and must be silently deduped.
    const buildInfo = makeBuildInfo("solc-0_8_23-33333333", [
      {
        inputSourceName: "project/test/Types.sol",
        userSourceName: "test/Types.sol",
        ast: sourceUnit([
          structAst("S", [{ type: "uint256", name: "a" }]),
          contractAst("C", [structAst("S", [{ type: "uint256", name: "a" }])]),
        ]),
      },
    ]);

    const result = collectEip712CanonicalTypes([buildInfo], {
      include: ["test/**"],
    });

    assert.deepEqual(result, ["S(uint256 a)"]);
  });

  it("scopes UDVT resolution per build info when node ids collide", () => {
    // solc node ids are unique only within a single compilation. When two
    // build infos happen to assign the same numeric id to different UDVTs,
    // the collector must resolve each struct's `referencedDeclaration`
    // against its own compilation's index — not a pooled one — or it will
    // silently emit the wrong underlying type. This is real-world reachable
    // because the solidity-test task always passes the union of the
    // `contracts` and `tests` artifact dirs into the collector.
    const sharedId = 5;

    const buildA = makeBuildInfo("solc-0_8_23-aaaa1111", [
      {
        inputSourceName: "project/contracts/A.sol",
        userSourceName: "contracts/A.sol",
        ast: {
          nodeType: "SourceUnit",
          nodes: [
            {
              nodeType: "UserDefinedValueTypeDefinition",
              id: sharedId,
              name: "Foo",
              underlyingType: {
                nodeType: "ElementaryTypeName",
                name: "uint256",
              },
            },
            {
              nodeType: "StructDefinition",
              name: "AStruct",
              members: [
                {
                  nodeType: "VariableDeclaration",
                  name: "f",
                  typeName: {
                    nodeType: "UserDefinedTypeName",
                    name: "Foo",
                    referencedDeclaration: sharedId,
                    typeDescriptions: { typeString: "Foo" },
                  },
                },
              ],
            },
          ],
        },
      },
    ]);

    const buildB = makeBuildInfo("solc-0_8_23-bbbb2222", [
      {
        inputSourceName: "project/test/B.t.sol",
        userSourceName: "test/B.t.sol",
        ast: {
          nodeType: "SourceUnit",
          nodes: [
            {
              nodeType: "UserDefinedValueTypeDefinition",
              id: sharedId,
              name: "Bar",
              underlyingType: {
                nodeType: "ElementaryTypeName",
                name: "bytes32",
              },
            },
            {
              nodeType: "StructDefinition",
              name: "BStruct",
              members: [
                {
                  nodeType: "VariableDeclaration",
                  name: "b",
                  typeName: {
                    nodeType: "UserDefinedTypeName",
                    name: "Bar",
                    referencedDeclaration: sharedId,
                    typeDescriptions: { typeString: "Bar" },
                  },
                },
              ],
            },
          ],
        },
      },
    ]);

    // Both orderings must produce the same answer — iteration order over
    // `buildInfosAndOutputs` is not something callers can control.
    const expected = ["AStruct(uint256 f)", "BStruct(bytes32 b)"];

    assert.deepEqual(
      collectEip712CanonicalTypes([buildA, buildB], { include: ["**"] }).sort(),
      expected,
    );
    assert.deepEqual(
      collectEip712CanonicalTypes([buildB, buildA], { include: ["**"] }).sort(),
      expected,
    );
  });

  it("skips build infos whose output has no sources", () => {
    // Defensive: a build info output without a `sources` key must be
    // silently skipped, and structs from sibling build infos must still
    // be collected.
    const emptyBuildInfoId = "solc-0_8_23-88888888";
    const emptyBuildInfo = {
      _format: "hh3-sol-build-info-1",
      id: emptyBuildInfoId,
      solcVersion: "0.8.23",
      solcLongVersion: "0.8.23+commit.f704f362",
      userSourceNameMap: {},
      input: { language: "Solidity", sources: {}, settings: {} },
    };
    const emptyOutput = {
      _format: "hh3-sol-build-info-output-1",
      id: emptyBuildInfoId,
      output: {}, // no `sources` key
    };

    const goodBuildInfo = makeBuildInfo("solc-0_8_23-99999999", [
      {
        inputSourceName: "project/test/Types.sol",
        userSourceName: "test/Types.sol",
        ast: sourceUnit([
          structAst("Person", [
            { type: "address", name: "wallet" },
            { type: "string", name: "name" },
          ]),
        ]),
      },
    ]);

    const result = collectEip712CanonicalTypes(
      [
        {
          buildInfoId: emptyBuildInfoId,
          buildInfo: utf8StringToBytes(JSON.stringify(emptyBuildInfo)),
          output: utf8StringToBytes(JSON.stringify(emptyOutput)),
        },
        goodBuildInfo,
      ],
      { include: ["test/**"] },
    );

    assert.deepEqual(result, ["Person(address wallet,string name)"]);
  });
});
