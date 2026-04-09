import type { EdrArtifactWithMetadata } from "../../../../../src/internal/builtin-plugins/solidity-test/edr-artifacts.js";
import type { RawInlineOverride } from "../../../../../src/internal/builtin-plugins/solidity-test/inline-config/index.js";

import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { utf8StringToBytes } from "@nomicfoundation/hardhat-utils/bytes";

export function makeRawOverride(
  partial: Partial<RawInlineOverride> & { key: string; rawValue: string },
): RawInlineOverride {
  return {
    inputSourceName: partial.inputSourceName ?? "test/MyTest.sol",
    contractName: partial.contractName ?? "MyTest",
    functionName: partial.functionName ?? "testFoo",
    rawKey: partial.rawKey ?? partial.key,
    ...partial,
  };
}

export function makeTestSuiteArtifact(
  inputSourceName: string,
  contractName: string,
  solcVersion = "0.8.23",
  buildInfoId = "test-build-info-id",
): EdrArtifactWithMetadata {
  return {
    edrArtifact: {
      id: {
        name: contractName,
        solcVersion,
        source: inputSourceName,
      },
      contract: {
        abi: "[]",
        bytecode: "",
        linkReferences: {},
        deployedBytecode: "",
        deployedLinkReferences: {},
      },
    },
    userSourceName: inputSourceName,
    buildInfoId,
  };
}

export function makeBuildInfo(
  inputSourceName: string,
  sourceContent: string,
  contracts: Record<
    string,
    {
      methodIdentifiers: Record<string, string>;
      functions: Array<{
        name: string;
        documentation?: string | null;
        functionSelector?: string;
      }>;
    }
  >,
  solcVersion = "0.8.23",
  buildInfoId = "test-build-info-id",
): {
  buildInfo: Uint8Array;
  output: Uint8Array;
  buildInfoId: string;
  buildInfoOutputPath: string;
} {
  const buildInfoJson = {
    _format: "hh3-sol-build-info-1",
    id: "test-build-info",
    solcVersion,
    solcLongVersion: `${solcVersion}+commit.test`,
    userSourceNameMap: { [inputSourceName]: inputSourceName },
    input: {
      language: "Solidity",
      sources: { [inputSourceName]: { content: sourceContent } },
      settings: {
        optimizer: { enabled: false },
        outputSelection: {},
      },
    },
  };

  const astNodes = Object.entries(contracts).map(
    ([contractName, contract]) => ({
      nodeType: "ContractDefinition",
      name: contractName,
      nodes: contract.functions.map((fn) => ({
        nodeType: "FunctionDefinition",
        name: fn.name,
        ...(fn.functionSelector !== undefined
          ? { functionSelector: fn.functionSelector }
          : {}),
        documentation:
          fn.documentation !== undefined && fn.documentation !== null
            ? {
                nodeType: "StructuredDocumentation",
                text: fn.documentation,
              }
            : null,
      })),
    }),
  );

  const outputJson = {
    _format: "hh3-sol-build-info-output-1",
    id: "test-build-info",
    output: {
      sources: {
        [inputSourceName]: {
          id: 0,
          ast: {
            nodeType: "SourceUnit",
            nodes: astNodes,
          },
        },
      },
      contracts: {
        [inputSourceName]: Object.fromEntries(
          Object.entries(contracts).map(([contractName, contract]) => [
            contractName,
            {
              evm: { methodIdentifiers: contract.methodIdentifiers },
            },
          ]),
        ),
      },
    },
  };

  const outputJsonString = JSON.stringify(outputJson);
  const buildInfoOutputPath = join(tmpdir(), `${randomUUID()}.json`);
  writeFileSync(buildInfoOutputPath, outputJsonString);

  return {
    buildInfo: utf8StringToBytes(JSON.stringify(buildInfoJson)),
    output: utf8StringToBytes(outputJsonString),
    buildInfoId,
    buildInfoOutputPath,
  };
}
