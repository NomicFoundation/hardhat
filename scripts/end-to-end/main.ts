import { init } from "./subcommands/init.ts";
import { clean } from "./subcommands/clean.ts";
import { exec } from "./subcommands/exec.ts";
import { logError } from "./helpers/log.ts";
import { resolveAndValidateArgs } from "./helpers/args.ts";

const USAGE = `
./scripts/end-to-end/main.ts — Run Hardhat in end-to-end scenarios

DESCRIPTION
  Run Hardhat using a local Verdaccio registry against specified scenarios e.g. 
  third party repositories.
  Each scenario is defined by a scenario.json in end-to-end/<scenario-slug>/.

COMMANDS
  init --scenario <scenario-path>   Setup scenario (i.e. clone) and install hardhat from Verdaccio
  exec --scenario <scenario-path>   Run a command in the scenario's working directory
  clean --scenario <scenario-path>  Remove the scenario's working directory

OPTIONS
  --e2e-clone-dir <path>   Override clone directory (default: $E2E_CLONE_DIR or "/tmp/end-to-end")
  --scenario <path>        The scenario folder or file to work on (default: $E2E_SCENARIO)
  --command <cmd>          Command to run (optional with \`exec\`, falls back to scenario defaultCommand)
  --use-local              Detect packages changed since their release tag, bump versions,
                           publish to Verdaccio, and pin scenario deps to the published versions.
                           Errors if Verdaccio is already running without --force-publish
  --force-publish          Allow publishing to an already-running Verdaccio instance

VERDACCIO
  If Verdaccio is already running it will be used as-is.
  Otherwise it is started automatically, packages are published, and it is
  stopped once the init phase completes.

EXAMPLES
  pnpm e2e init --scenario ./end-to-end/openzeppelin-contracts
  pnpm e2e exec --scenario ./end-to-end/openzeppelin-contracts --command "npx hardhat compile"
  E2E_SCENARIO=./end-to-end/openzeppelin-contracts pnpm e2e exec --command "npx hardhat test"
  pnpm e2e clean --scenario ./end-to-end/openzeppelin-contracts
`;

async function main(): Promise<void> {
  const {
    initFlag,
    execFlag,
    cleanFlag,
    e2eCloneDirectory,
    scenarioPath,
    command,
    useLocal,
    forcePublish,
  } = resolveAndValidateArgs(process.argv.slice(2));

  try {
    if (initFlag) {
      await init(e2eCloneDirectory, scenarioPath, useLocal, forcePublish);
    } else if (execFlag) {
      await exec(
        e2eCloneDirectory,
        scenarioPath,
        command,
        useLocal,
        forcePublish,
      );
    } else if (cleanFlag) {
      clean(e2eCloneDirectory, scenarioPath);
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
