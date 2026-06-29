import type { BuildInfoAndOutput } from "../../../../../src/internal/builtin-plugins/solidity-test/edr-artifacts.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { utf8StringToBytes } from "@nomicfoundation/hardhat-utils/bytes";

import {
  DEPENDENCY_CONFLICT_REMEDIATION,
  SELECTED_CONFLICT_REMEDIATION,
} from "../../../../../src/internal/builtin-plugins/solidity-test/eip712/canonicalize.js";
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
  // The collector skips build infos whose bytes don't contain `struct `, so
  // the fixtures must include a struct-like content blob in `input.sources`
  // for the parse path to be exercised.
  const inputSources: Record<string, { content: string }> = {};
  for (const s of sources) {
    inputSources[s.inputSourceName] = { content: "struct _Stub {}" };
  }
  const buildInfo = {
    _format: "hh3-sol-build-info-1",
    id: buildInfoId,
    solcVersion: "0.8.23",
    solcLongVersion: "0.8.23+commit.f704f362",
    input: { language: "Solidity", sources: inputSources, settings: {} },
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

function inputToUserSourceMap(
  ...sourceLists: FakeSource[][]
): Map<string, string> {
  const map = new Map<string, string>();

  for (const list of sourceLists) {
    for (const s of list) {
      map.set(s.inputSourceName, s.userSourceName);
    }
  }

  return map;
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
    // The feature is opt-in: with an empty `include`, collection
    // short-circuits before any build info is parsed.
    const sources: FakeSource[] = [
      {
        inputSourceName: "project/test/Types.sol",
        userSourceName: "test/Types.sol",
        ast: sourceUnit([structAst("Foo", [{ type: "uint256", name: "x" }])]),
      },
    ];
    const buildInfo = makeBuildInfo("solc-0_8_23-00000000", sources);
    const inputToUserSource = inputToUserSourceMap(sources);

    assert.deepEqual(
      collectEip712CanonicalTypes([buildInfo], inputToUserSource, {
        include: [],
        exclude: [],
      }),
      [],
    );
    // Exclude alone is a no-op without an include to narrow.
    assert.deepEqual(
      collectEip712CanonicalTypes([buildInfo], inputToUserSource, {
        include: [],
        exclude: ["**"],
      }),
      [],
    );
  });

  it("returns the flat canonical list for a Mail/Person fixture", () => {
    const sources: FakeSource[] = [
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
    ];
    const buildInfo = makeBuildInfo("solc-0_8_23-aaaaaaaa", sources);

    const result = collectEip712CanonicalTypes(
      [buildInfo],
      inputToUserSourceMap(sources),
      { include: ["test/**"], exclude: [] },
    );

    assert.deepEqual(result, [
      "Mail(Person from,Person to,string contents)Person(address wallet,string name)",
      "Person(address wallet,string name)",
    ]);
  });

  it("filters by include/exclude on the user source name", () => {
    const sources: FakeSource[] = [
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
    ];
    const buildInfo = makeBuildInfo("solc-0_8_23-bbbbbbbb", sources);
    const inputToUserSource = inputToUserSourceMap(sources);

    const onlyTests = collectEip712CanonicalTypes(
      [buildInfo],
      inputToUserSource,
      { include: ["test/**"], exclude: [] },
    );
    assert.deepEqual(onlyTests, ["Bar(uint256 y)"]);

    const excludeTests = collectEip712CanonicalTypes(
      [buildInfo],
      inputToUserSource,
      { include: ["**"], exclude: ["test/**"] },
    );
    assert.deepEqual(excludeTests, ["Foo(uint256 x)"]);
  });

  it("dedupes the same struct seen across multiple build infos", () => {
    const ast = sourceUnit([
      structAst("Person", [
        { type: "address", name: "wallet" },
        { type: "string", name: "name" },
      ]),
    ]);
    const sourcesA: FakeSource[] = [
      {
        inputSourceName: "project/test/Types.sol",
        userSourceName: "test/Types.sol",
        ast,
      },
    ];
    const sourcesB: FakeSource[] = [
      {
        inputSourceName: "project/test/Types.sol",
        userSourceName: "test/Types.sol",
        ast,
      },
    ];
    const a = makeBuildInfo("solc-0_8_23-cccccccc", sourcesA);
    const b = makeBuildInfo("solc-0_8_23-dddddddd", sourcesB);

    const result = collectEip712CanonicalTypes(
      [a, b],
      inputToUserSourceMap(sourcesA, sourcesB),
      { include: ["test/**"], exclude: [] },
    );

    assert.deepEqual(result, ["Person(address wallet,string name)"]);
  });

  it("uses the caller-provided inputToUserSource map for transitive sources", () => {
    // Mirrors `hardhat test solidity <one-test-file>`: the partial build info
    // explicitly compiles a single root, but its output also contains the
    // transitive source set. The user-facing name for those transitive
    // sources comes from the caller-supplied map (built from the artifact
    // set), not from anything inside the build info itself.
    const sharedAst = sourceUnit([
      structAst("Person", [
        { type: "address", name: "wallet" },
        { type: "string", name: "name" },
      ]),
    ]);
    const fullBuildSources: FakeSource[] = [
      {
        inputSourceName: "project/contracts/Types.sol",
        userSourceName: "contracts/Types.sol",
        ast: sourceUnit([]), // not the source we care about here
      },
    ];
    const fullBuild = makeBuildInfo("solc-0_8_23-ffffffff", fullBuildSources);
    const partialBuildSources: FakeSource[] = [
      {
        inputSourceName: "project/contracts/Types.sol",
        userSourceName: "contracts/Types.sol",
        ast: sharedAst,
      },
    ];
    const partialBuild = makeBuildInfo(
      "solc-0_8_23-aaaa1111",
      partialBuildSources,
    );

    const result = collectEip712CanonicalTypes(
      [fullBuild, partialBuild],
      inputToUserSourceMap(fullBuildSources, partialBuildSources),
      { include: ["contracts/**"], exclude: [] },
    );

    assert.deepEqual(result, ["Person(address wallet,string name)"]);
  });

  it("falls back to inputSourceName when the map omits an entry", () => {
    // Imported sources (e.g. from npm packages) that don't produce artifacts
    // won't appear in the caller-supplied `inputToUserSource` map. The
    // collector should still surface their structs, keyed by the input
    // source name as a fallback.
    const buildInfo = makeBuildInfo("solc-0_8_23-eeeeeeee", [
      {
        inputSourceName: "npm/some-pkg/Types.sol",
        userSourceName: "npm/some-pkg/Types.sol",
        ast: sourceUnit([
          structAst("Imported", [{ type: "uint256", name: "x" }]),
        ]),
      },
    ]);

    const result = collectEip712CanonicalTypes([buildInfo], new Map(), {
      include: ["npm/**"],
      exclude: [],
    });

    assert.deepEqual(result, ["Imported(uint256 x)"]);
  });

  it("strips the project/ prefix when a project file is missing from the map", () => {
    // A project file outside the standard root directories (e.g. a shared
    // file in `lib/` that's only ever imported and produces no artifact) is
    // absent from the caller-supplied map. Its input source name is
    // `project/lib/Helper.sol` — falling back to that raw path would make
    // user globs like `lib/**` miss it, so the collector strips the
    // `project/` prefix to recover the user-facing path.
    const buildInfo = makeBuildInfo("solc-0_8_23-cccccccc", [
      {
        inputSourceName: "project/lib/Helper.sol",
        userSourceName: "lib/Helper.sol",
        ast: sourceUnit([
          structAst("Helper", [{ type: "uint256", name: "n" }]),
        ]),
      },
    ]);

    const result = collectEip712CanonicalTypes([buildInfo], new Map(), {
      include: ["lib/**"],
      exclude: [],
    });

    assert.deepEqual(result, ["Helper(uint256 n)"]);
  });

  it("throws on conflicting same-named structs within a single source file", () => {
    // A top-level `struct S` and a `contract C { struct S { ... } }` with
    // a different definition share a source path but produce different
    // EIP-712 heads. Since `vm.eip712HashType` resolves by bare name, this
    // is genuinely ambiguous and must surface as an error rather than be
    // silently resolved by AST traversal order.
    const sources: FakeSource[] = [
      {
        inputSourceName: "project/test/Types.sol",
        userSourceName: "test/Types.sol",
        ast: sourceUnit([
          structAst("S", [{ type: "uint256", name: "a" }]),
          contractAst("C", [structAst("S", [{ type: "uint256", name: "b" }])]),
        ]),
      },
    ];
    const buildInfo = makeBuildInfo("solc-0_8_23-11111111", sources);

    assertThrowsHardhatError(
      () =>
        collectEip712CanonicalTypes(
          [buildInfo],
          inputToUserSourceMap(sources),
          { include: ["test/**"], exclude: [] },
        ),
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.EIP712_DUPLICATE_STRUCT_NAME,
      {
        name: "S",
        firstSource: "test/Types.sol",
        secondSource: "test/Types.sol",
        remediation: SELECTED_CONFLICT_REMEDIATION,
      },
    );
  });

  it("throws on conflicting same-named structs across two contracts in one file", () => {
    const sources: FakeSource[] = [
      {
        inputSourceName: "project/test/Types.sol",
        userSourceName: "test/Types.sol",
        ast: sourceUnit([
          contractAst("A", [structAst("S", [{ type: "uint256", name: "a" }])]),
          contractAst("B", [structAst("S", [{ type: "uint256", name: "b" }])]),
        ]),
      },
    ];
    const buildInfo = makeBuildInfo("solc-0_8_23-22222222", sources);

    assertThrowsHardhatError(
      () =>
        collectEip712CanonicalTypes(
          [buildInfo],
          inputToUserSourceMap(sources),
          { include: ["test/**"], exclude: [] },
        ),
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.EIP712_DUPLICATE_STRUCT_NAME,
      {
        name: "S",
        firstSource: "test/Types.sol",
        secondSource: "test/Types.sol",
        remediation: SELECTED_CONFLICT_REMEDIATION,
      },
    );
  });

  it("dedupes identical same-named structs within a single source file", () => {
    // A top-level `struct S` and a `contract C { struct S { ... } }` with
    // an identical definition produce the same EIP-712 head; that's not a
    // conflict and must be silently deduped.
    const sources: FakeSource[] = [
      {
        inputSourceName: "project/test/Types.sol",
        userSourceName: "test/Types.sol",
        ast: sourceUnit([
          structAst("S", [{ type: "uint256", name: "a" }]),
          contractAst("C", [structAst("S", [{ type: "uint256", name: "a" }])]),
        ]),
      },
    ];
    const buildInfo = makeBuildInfo("solc-0_8_23-33333333", sources);

    const result = collectEip712CanonicalTypes(
      [buildInfo],
      inputToUserSourceMap(sources),
      { include: ["test/**"], exclude: [] },
    );

    assert.deepEqual(result, ["S(uint256 a)"]);
  });

  it("scopes user-defined value type resolution per build info when node ids collide", () => {
    // solc node ids are unique only within a single compilation. When two
    // build infos happen to assign the same numeric id to different
    // user-defined value types,
    // the collector must resolve each struct's `referencedDeclaration`
    // against its own compilation's index — not a pooled one — or it will
    // silently emit the wrong underlying type. This is real-world reachable
    // because the solidity-test task always passes the union of the
    // `contracts` and `tests` artifact dirs into the collector.
    const sharedId = 5;

    const sourcesA: FakeSource[] = [
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
    ];
    const buildA = makeBuildInfo("solc-0_8_23-aaaa1111", sourcesA);

    const sourcesB: FakeSource[] = [
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
    ];
    const buildB = makeBuildInfo("solc-0_8_23-bbbb2222", sourcesB);

    const inputToUserSource = inputToUserSourceMap(sourcesA, sourcesB);

    // Both orderings must produce the same answer — iteration order over
    // `buildInfosAndOutputs` is not something callers can control.
    const expected = ["AStruct(uint256 f)", "BStruct(bytes32 b)"];

    assert.deepEqual(
      collectEip712CanonicalTypes([buildA, buildB], inputToUserSource, {
        include: ["**"],
        exclude: [],
      }).sort(),
      expected,
    );
    assert.deepEqual(
      collectEip712CanonicalTypes([buildB, buildA], inputToUserSource, {
        include: ["**"],
        exclude: [],
      }).sort(),
      expected,
    );
  });

  it("inline a dep defined in a non-included file", () => {
    const sources: FakeSource[] = [
      {
        inputSourceName: "project/test/Mail.sol",
        userSourceName: "test/Mail.sol",
        ast: sourceUnit([
          structAst("Mail", [
            { type: "Person", name: "from" },
            { type: "Person", name: "to" },
            { type: "string", name: "contents" },
          ]),
        ]),
      },
      {
        inputSourceName: "project/lib/Person.sol",
        userSourceName: "lib/Person.sol",
        ast: sourceUnit([
          structAst("Person", [
            { type: "address", name: "wallet" },
            { type: "string", name: "name" },
          ]),
        ]),
      },
    ];
    const buildInfo = makeBuildInfo("solc-0_8_23-aabbccdd", sources);

    const result = collectEip712CanonicalTypes(
      [buildInfo],
      inputToUserSourceMap(sources),
      { include: ["test/**"], exclude: [] },
    );

    assert.deepEqual(result, [
      "Mail(Person from,Person to,string contents)Person(address wallet,string name)",
    ]);
  });

  it("inline a dep defined in a different build info", () => {
    const testSources: FakeSource[] = [
      {
        inputSourceName: "project/test/Mail.sol",
        userSourceName: "test/Mail.sol",
        ast: sourceUnit([
          structAst("Mail", [
            { type: "Person", name: "from" },
            { type: "string", name: "contents" },
          ]),
        ]),
      },
    ];
    const libSources: FakeSource[] = [
      {
        inputSourceName: "project/lib/Person.sol",
        userSourceName: "lib/Person.sol",
        ast: sourceUnit([
          structAst("Person", [
            { type: "address", name: "wallet" },
            { type: "string", name: "name" },
          ]),
        ]),
      },
    ];
    const testBuild = makeBuildInfo("solc-0_8_23-11112222", testSources);
    const libBuild = makeBuildInfo("solc-0_8_23-33334444", libSources);

    const result = collectEip712CanonicalTypes(
      [testBuild, libBuild],
      inputToUserSourceMap(testSources, libSources),
      { include: ["test/**"], exclude: [] },
    );

    assert.deepEqual(result, [
      "Mail(Person from,string contents)Person(address wallet,string name)",
    ]);
  });

  it("walks transitive deps through non-included files", () => {
    const sources: FakeSource[] = [
      {
        inputSourceName: "project/test/Order.sol",
        userSourceName: "test/Order.sol",
        ast: sourceUnit([
          structAst("Order", [
            { type: "uint256", name: "id" },
            { type: "Holder", name: "holder" },
          ]),
        ]),
      },
      {
        inputSourceName: "project/lib/Holder.sol",
        userSourceName: "lib/Holder.sol",
        ast: sourceUnit([
          structAst("Holder", [
            { type: "address", name: "owner" },
            { type: "Asset", name: "asset" },
          ]),
        ]),
      },
      {
        inputSourceName: "project/lib/Asset.sol",
        userSourceName: "lib/Asset.sol",
        ast: sourceUnit([
          structAst("Asset", [
            { type: "address", name: "token" },
            { type: "uint256", name: "amount" },
          ]),
        ]),
      },
    ];
    const buildInfo = makeBuildInfo("solc-0_8_23-55556666", sources);

    const result = collectEip712CanonicalTypes(
      [buildInfo],
      inputToUserSourceMap(sources),
      { include: ["test/**"], exclude: [] },
    );

    assert.deepEqual(result, [
      "Order(uint256 id,Holder holder)" +
        "Asset(address token,uint256 amount)" +
        "Holder(address owner,Asset asset)",
    ]);
  });

  it("does not throw on duplicate struct names confined to non-included files", () => {
    const sources: FakeSource[] = [
      {
        inputSourceName: "project/test/Wanted.sol",
        userSourceName: "test/Wanted.sol",
        ast: sourceUnit([
          structAst("Wanted", [{ type: "uint256", name: "x" }]),
        ]),
      },
      {
        inputSourceName: "project/lib/A.sol",
        userSourceName: "lib/A.sol",
        ast: sourceUnit([
          structAst("Helper", [{ type: "uint256", name: "a" }]),
        ]),
      },
      {
        inputSourceName: "project/lib/B.sol",
        userSourceName: "lib/B.sol",
        ast: sourceUnit([
          structAst("Helper", [{ type: "uint256", name: "b" }]),
        ]),
      },
    ];
    const buildInfo = makeBuildInfo("solc-0_8_23-99990000", sources);

    const result = collectEip712CanonicalTypes(
      [buildInfo],
      inputToUserSourceMap(sources),
      { include: ["test/**"], exclude: [] },
    );

    assert.deepEqual(result, ["Wanted(uint256 x)"]);
  });

  it("does not throw when an included file and a non-included, unimported file define the same struct name", () => {
    // `include` scopes which sources contribute structs, so a same-named
    // struct in a non-included file that nothing in the included scope imports
    // must not abort the run — the included definition wins and is emitted.
    const sources: FakeSource[] = [
      {
        inputSourceName: "project/contracts/A.sol",
        userSourceName: "contracts/A.sol",
        ast: sourceUnit([
          structAst("Order", [
            { type: "address", name: "user" },
            { type: "uint256", name: "amount" },
          ]),
        ]),
      },
      {
        inputSourceName: "project/contracts/B.sol",
        userSourceName: "contracts/B.sol",
        ast: sourceUnit([
          structAst("Order", [
            { type: "bytes32", name: "id" },
            { type: "bool", name: "active" },
          ]),
        ]),
      },
    ];
    const buildInfo = makeBuildInfo("solc-0_8_23-aaaabbbb", sources);

    const result = collectEip712CanonicalTypes(
      [buildInfo],
      inputToUserSourceMap(sources),
      { include: ["contracts/A.sol"], exclude: [] },
    );

    assert.deepEqual(result, ["Order(address user,uint256 amount)"]);
  });

  it("throws HHE818 when a selected struct depends on a name two non-included files define differently", () => {
    // The conflict is real: included `Mail` depends on `Person`, which two
    // non-included files define differently, so it's reachable from the
    // selected set and genuinely ambiguous. HHE818 must steer to renaming,
    // not include/exclude — the copies come in as dependencies regardless
    // of selection.
    const sources: FakeSource[] = [
      {
        inputSourceName: "project/test/Mail.sol",
        userSourceName: "test/Mail.sol",
        ast: sourceUnit([
          structAst("Mail", [
            { type: "Person", name: "from" },
            { type: "string", name: "contents" },
          ]),
        ]),
      },
      {
        inputSourceName: "project/lib/A.sol",
        userSourceName: "lib/A.sol",
        ast: sourceUnit([
          structAst("Person", [
            { type: "address", name: "wallet" },
            { type: "string", name: "name" },
          ]),
        ]),
      },
      {
        inputSourceName: "project/lib/B.sol",
        userSourceName: "lib/B.sol",
        ast: sourceUnit([
          structAst("Person", [{ type: "uint256", name: "id" }]),
        ]),
      },
    ];
    const buildInfo = makeBuildInfo("solc-0_8_23-aaaacccc", sources);

    assertThrowsHardhatError(
      () =>
        collectEip712CanonicalTypes(
          [buildInfo],
          inputToUserSourceMap(sources),
          { include: ["test/**"], exclude: [] },
        ),
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.EIP712_DUPLICATE_STRUCT_NAME,
      {
        name: "Person",
        firstSource: "lib/A.sol",
        secondSource: "lib/B.sol",
        remediation: DEPENDENCY_CONFLICT_REMEDIATION,
      },
    );
  });

  it("dedupes an identical struct shared by an included and a non-included file", () => {
    // Same `Person` in an included and a non-included file isn't a conflict:
    // dedup and selection emit it once rather than reject the duplicate name.
    const sources: FakeSource[] = [
      {
        inputSourceName: "project/contracts/A.sol",
        userSourceName: "contracts/A.sol",
        ast: sourceUnit([
          structAst("Person", [
            { type: "address", name: "wallet" },
            { type: "string", name: "name" },
          ]),
        ]),
      },
      {
        inputSourceName: "project/lib/Shared.sol",
        userSourceName: "lib/Shared.sol",
        ast: sourceUnit([
          structAst("Person", [
            { type: "address", name: "wallet" },
            { type: "string", name: "name" },
          ]),
        ]),
      },
    ];
    const buildInfo = makeBuildInfo("solc-0_8_23-bbbbdddd", sources);

    const result = collectEip712CanonicalTypes(
      [buildInfo],
      inputToUserSourceMap(sources),
      { include: ["contracts/A.sol"], exclude: [] },
    );

    assert.deepEqual(result, ["Person(address wallet,string name)"]);
  });

  it("drops a selected struct when a transitive dep in a non-included file is non decodable", () => {
    const sources: FakeSource[] = [
      {
        inputSourceName: "project/test/Order.sol",
        userSourceName: "test/Order.sol",
        ast: sourceUnit([
          structAst("Order", [
            { type: "uint256", name: "id" },
            { type: "Holder", name: "holder" },
          ]),
        ]),
      },
      {
        inputSourceName: "project/lib/Holder.sol",
        userSourceName: "lib/Holder.sol",
        ast: {
          nodeType: "SourceUnit",
          nodes: [
            {
              nodeType: "StructDefinition",
              name: "Holder",
              members: [
                {
                  nodeType: "VariableDeclaration",
                  name: "amount",
                  typeName: { nodeType: "ElementaryTypeName", name: "uint256" },
                },
                {
                  nodeType: "VariableDeclaration",
                  name: "balances",
                  typeName: { nodeType: "Mapping" },
                },
              ],
            },
          ],
        },
      },
    ];
    const buildInfo = makeBuildInfo("solc-0_8_23-aaaa9999", sources);

    const result = collectEip712CanonicalTypes(
      [buildInfo],
      inputToUserSourceMap(sources),
      { include: ["test/**"], exclude: [] },
    );

    assert.deepEqual(result, []);
  });

  it("skips build infos whose output has no sources", () => {
    // Defensive: a build info output without a `sources` key must be silently
    // skipped, and structs from sibling build infos must still be collected.
    // The empty build info still includes `struct ` in its bytes so it gets
    // past the byte-level fast path and exercises the no-`sources` branch.
    const emptyBuildInfoId = "solc-0_8_23-88888888";
    const emptyBuildInfo = {
      _format: "hh3-sol-build-info-1",
      id: emptyBuildInfoId,
      solcVersion: "0.8.23",
      solcLongVersion: "0.8.23+commit.f704f362",
      input: {
        language: "Solidity",
        sources: { "stub.sol": { content: "struct _Stub {}" } },
        settings: {},
      },
    };
    const emptyOutput = {
      _format: "hh3-sol-build-info-output-1",
      id: emptyBuildInfoId,
      output: {}, // no `sources` key
    };

    const goodSources: FakeSource[] = [
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
    ];
    const goodBuildInfo = makeBuildInfo("solc-0_8_23-99999999", goodSources);

    const result = collectEip712CanonicalTypes(
      [
        {
          buildInfoId: emptyBuildInfoId,
          buildInfo: utf8StringToBytes(JSON.stringify(emptyBuildInfo)),
          output: utf8StringToBytes(JSON.stringify(emptyOutput)),
        },
        goodBuildInfo,
      ],
      inputToUserSourceMap(goodSources),
      { include: ["test/**"], exclude: [] },
    );

    assert.deepEqual(result, ["Person(address wallet,string name)"]);
  });

  it("skips build infos whose bytes don't contain `struct `", () => {
    // Byte-level fast path: a build info that can't define EIP-712 types
    // must be skipped without parsing its output. We exercise it by handing
    // in a build info whose `output` bytes would crash JSON.parse — if the
    // filter is wrong, this test throws.
    const skippableBuildInfoId = "solc-0_8_23-77777777";
    const skippableBuildInfo = {
      _format: "hh3-sol-build-info-1",
      id: skippableBuildInfoId,
      solcVersion: "0.8.23",
      solcLongVersion: "0.8.23+commit.f704f362",
      input: {
        language: "Solidity",
        sources: { "Plain.sol": { content: "contract C {}" } },
        settings: {},
      },
    };

    const goodSources: FakeSource[] = [
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
    ];
    const goodBuildInfo = makeBuildInfo("solc-0_8_23-66666666", goodSources);

    const result = collectEip712CanonicalTypes(
      [
        {
          buildInfoId: skippableBuildInfoId,
          buildInfo: utf8StringToBytes(JSON.stringify(skippableBuildInfo)),
          output: utf8StringToBytes("not-valid-json"),
        },
        goodBuildInfo,
      ],
      inputToUserSourceMap(goodSources),
      { include: ["test/**"], exclude: [] },
    );

    assert.deepEqual(result, ["Person(address wallet,string name)"]);
  });
});
