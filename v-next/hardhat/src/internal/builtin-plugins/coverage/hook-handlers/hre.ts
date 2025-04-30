import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => ({
  created: async (context, hre) => {
    if (context.globalOptions.coverage) {
      hre.hooks.registerHandlers("network", {
        onCoverageData: async (_context, _coverageData) => {
          // TODO: Add the lines:
          // const hreImplementation =
          //   /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we know this is the right implementation */
          //   context.hre as HardhatRuntimeEnvironmentImplementation;
          // await hreImplementation._coverage.addData(coverageData);

		      return;
        }
      });
    }
  }
});
