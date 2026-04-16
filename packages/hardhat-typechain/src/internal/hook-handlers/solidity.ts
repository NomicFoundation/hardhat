import type { HookContext, SolidityHooks } from "hardhat/types/hooks";
import type {
  BuildOptions,
  BuildScope,
  CompilationJobCreationError,
  FileBuildResult,
} from "hardhat/types/solidity";

import path from "node:path";

import { generateTypes } from "../generate-types.js";

export default async (): Promise<Partial<SolidityHooks>> => {
  const handlers: Partial<SolidityHooks> = {
    async build(
      context: HookContext,
      rootFilePaths: string[],
      options: BuildOptions | undefined,
      next: (
        nextContext: HookContext,
        nextRootFilePaths: string[],
        nextOptions: BuildOptions | undefined,
      ) => Promise<CompilationJobCreationError | Map<string, FileBuildResult>>,
    ) {
      const result = await next(context, rootFilePaths, options);

      // Skip if build failed (returned an error)
      if (!context.solidity.isSuccessfulBuildResult(result)) {
        return result;
      }

      // Skip for test scope (contracts only)
      if (options?.scope === "tests") {
        return result;
      }

      // Clear cache to ensure fresh data after compilation
      await context.artifacts.clearCache();

      let artifactPaths: string[];

      if (context.config.solidity.splitTestsCompilation) {
        artifactPaths = Array.from(
          await context.artifacts.getAllArtifactPaths(),
        );
      } else {
        // Contracts and tests share the artifacts folder.
        // Filter out test artifacts using each artifact's sourceName (derived
        // from its fully qualified name), which is the project-relative or npm
        // source identifier.
        artifactPaths = await getContractArtifactPaths(context);
      }

      await generateTypes(
        context.config.paths.root,
        context.config.typechain,
        context.globalOptions.noTypechain,
        artifactPaths,
      );

      return result;
    },
  };

  return handlers;
};

async function getContractArtifactPaths(
  context: HookContext,
): Promise<string[]> {
  const fqns = await context.artifacts.getAllFullyQualifiedNames();
  const projectRoot = context.config.paths.root;

  const scopeBySource = new Map<string, BuildScope>();
  const contractFqns: string[] = [];

  for (const fqn of fqns) {
    const sourceName = fqn.slice(0, fqn.lastIndexOf(":"));

    let scope = scopeBySource.get(sourceName);
    if (scope === undefined) {
      const fsPath = path.resolve(projectRoot, sourceName);

      // npm files will be classified as "contracts" because their sourceName is
      // not an existing file, and "contracts" is the default.
      //
      // If the package name clashed with
      // ```ts
      //  path.relative(
      //    context.config.paths.root,
      //    context.config.paths.tests.solidity
      //  )
      // ```
      //
      // They could be misclassified as test files. This is highly improbable,
      // so we don't check it. You could read the artifact and see if the
      // inputSourceName starts with `npm/` to rule this out.
      scope = await context.solidity.getScope(fsPath);
      scopeBySource.set(sourceName, scope);
    }

    if (scope === "contracts") {
      contractFqns.push(fqn);
    }
  }

  return Promise.all(
    contractFqns.map((fqn) => context.artifacts.getArtifactPath(fqn)),
  );
}
