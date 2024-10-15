import type { ArtifactsManager } from "../../../types/artifacts.js";
import type { Artifact } from "@ignored/edr";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { exists, readUtf8File } from "@ignored/hardhat-vnext-utils/fs";
import { resolveFromRoot } from "@ignored/hardhat-vnext-utils/path";
import { NonterminalKind, TerminalKind } from "@nomicfoundation/slang/cst";
import { Parser } from "@nomicfoundation/slang/parser";

export async function getArtifacts(
  hardhatArtifacts: ArtifactsManager,
): Promise<Artifact[]> {
  const fqns = await hardhatArtifacts.getAllFullyQualifiedNames();
  const artifacts: Artifact[] = [];

  for (const fqn of fqns) {
    const hardhatArtifact = await hardhatArtifacts.readArtifact(fqn);
    const buildInfo = await hardhatArtifacts.getBuildInfo(fqn);

    if (buildInfo === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.SOLIDITY_TESTS.BUILD_INFO_NOT_FOUND_FOR_CONTRACT,
        {
          fqn,
        },
      );
    }

    const id = {
      name: hardhatArtifact.contractName,
      solcVersion: buildInfo.solcVersion,
      source: hardhatArtifact.sourceName,
    };

    const contract = {
      abi: JSON.stringify(hardhatArtifact.abi),
      bytecode: hardhatArtifact.bytecode,
      deployedBytecode: hardhatArtifact.deployedBytecode,
    };

    const artifact = { id, contract };
    artifacts.push(artifact);
  }

  return artifacts;
}

export async function isTestArtifact(
  root: string,
  artifact: Artifact,
): Promise<boolean> {
  const { name, source, solcVersion } = artifact.id;

  if (!source.endsWith(".t.sol")) {
    return false;
  }

  const sourcePath = resolveFromRoot(root, source);
  const sourceExists = await exists(sourcePath);

  if (!sourceExists) {
    return false;
  }

  const content = await readUtf8File(sourcePath);
  const parser = Parser.create(solcVersion);
  const cursor = parser
    .parse(NonterminalKind.SourceUnit, content)
    .createTreeCursor();

  while (
    cursor.goToNextNonterminalWithKind(NonterminalKind.ContractDefinition)
  ) {
    const nameCursor = cursor.spawn();
    if (!nameCursor.goToNextTerminalWithKind(TerminalKind.Identifier)) {
      continue;
    }
    if (nameCursor.node.unparse() !== name) {
      continue;
    }

    const abstractCursor = cursor.spawn();
    if (abstractCursor.goToNextTerminalWithKind(TerminalKind.AbstractKeyword)) {
      return false;
    }

    const functionCursor = cursor.spawn();

    while (
      functionCursor.goToNextNonterminalWithKind(
        NonterminalKind.FunctionDefinition,
      )
    ) {
      const functionNameCursor = functionCursor.spawn();
      if (
        !functionNameCursor.goToNextTerminalWithKind(TerminalKind.Identifier)
      ) {
        continue;
      }

      const functionName = functionNameCursor.node.unparse();
      if (
        functionName.startsWith("test") ||
        functionName.startsWith("invariant")
      ) {
        const publicCursor = functionCursor.spawn();
        if (publicCursor.goToNextTerminalWithKind(TerminalKind.PublicKeyword)) {
          return true;
        }

        const externalCursor = functionCursor.spawn();
        if (
          externalCursor.goToNextTerminalWithKind(TerminalKind.ExternalKeyword)
        ) {
          return true;
        }
      }
    }
  }

  return false;
}
