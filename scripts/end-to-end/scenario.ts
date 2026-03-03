import { init } from "./subcommands/init.ts";
import { clean } from "./subcommands/clean.ts";
import { logError } from "./helpers/log.ts";
import { getArgValue } from "./helpers/args.ts";

const USAGE = `
end-to-end — Run Hardhat in end-to-end scenarios

DESCRIPTION
  Run Hardhat using a local Verdaccio registry against third party repositories.
  Each scenario is defined by a scenario.json in end-to-end/<scenario-slug>/.

COMMANDS
  --init <scenario-path>   Setup scenario (i.e. clone) and install hardhat from Verdaccio
  --clean <scenario-path>  Remove the cloned repo directory for a scenario

OPTIONS
  --e2e-clone-dir <path>   Override clone directory (default: $E2E_CLONE_DIR or ./end-to-end-repos)
  --start-verdaccio        Start Verdaccio (and publish) before --init, stop after

EXAMPLES
  node scripts/end-to-end/scenario.ts --init ./end-to-end/openzeppelin-contracts --start-verdaccio
  node scripts/end-to-end/scenario.ts --init ./end-to-end/openzeppelin-contracts
  node scripts/end-to-end/scenario.ts --clean ./end-to-end/openzeppelin-contracts
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const initScenarioFilePath = getArgValue(args, "--init");
  const cleanScenarioFilePath = getArgValue(args, "--clean");
  const startVerdaccioFlag = args.includes("--start-verdaccio");

  const e2eCloneDirectory =
    getArgValue(args, "--e2e-clone-dir") ?? process.env.E2E_CLONE_DIR;

  if (e2eCloneDirectory === undefined) {
    throw new Error(
      "Missing required --e2e-clone-dir argument or E2E_CLONE_DIR environment variable",
    );
  }

  try {
    if (initScenarioFilePath !== undefined) {
      await init(e2eCloneDirectory, initScenarioFilePath, startVerdaccioFlag);
    } else if (cleanScenarioFilePath !== undefined) {
      clean(e2eCloneDirectory, cleanScenarioFilePath);
    } else {
      console.log(USAGE);
    }
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    logError(error.message);

    process.exit(1);
  }
}

await main();
