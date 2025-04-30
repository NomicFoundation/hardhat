import type { SolidityHooks } from "../../../../types/hooks.js";

export default async (): Promise<Partial<SolidityHooks>> => ({
  preprocessProjectFileBeforeBuilding: async (context, sourceName, fileContent, solcVersion, next) => {
    if (context.globalOptions.coverage) {
      // TODO: Add the lines:
      // const {source, metadata} = await addStatementCoverageInstrumentation(sourceName, fileContent, solcVersion);
      // const hreImplementation =
      //   /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we know this is the right implementation */
      //   context.hre as HardhatRuntimeEnvironmentImplementation;
      // await context.addMetadata(metadata);
      //
      // return next(context, sourceName, source, solcVersion);
      return next(context, sourceName, fileContent, solcVersion);
    } else {
      return next(context, sourceName, fileContent, solcVersion);
    }
  },
});
