import { init } from "./subcommands/init.ts";
import { clean } from "./subcommands/clean.ts";
import { exec } from "./subcommands/exec.ts";
import { logError } from "./helpers/log.ts";
import {
  Command,
  DEFAULT_CLONE_DIR,
  resolveAndValidateArgs,
} from "./helpers/args.ts";

const USAGE = `
./scripts/end-to-end/main.ts — Run Hardhat in end-to-end scenarios

DESCRIPTION
  Run Hardhat using a local Verdaccio registry against specified scenarios e.g. 
  third party repositories.
  Each scenario is defined by a scenario.json in end-to-end/<scenario-slug>/.

  A relative path in any option resolves against the directory you ran
  the command from.

COMMANDS
  init --scenario <scenario-path>   Setup scenario (i.e. clone) and install hardhat from Verdaccio
  exec --scenario <scenario-path>   Run a command in the scenario's working directory
  clean --scenario <scenario-path>  Remove the scenario's working directory

OPTIONS
  --e2e-clone-dir <path>   Override clone directory (default: $E2E_CLONE_DIR or ${DEFAULT_CLONE_DIR})
  --scenario <path>        The scenario folder or file to work on (default: $E2E_SCENARIO)
  --command <cmd>          Command to run with \`exec\`, ignored by init and clean (default: the scenario's defaultCommand)
  --use-local              Detect packages changed since their release tag, bump versions,
                           publish to Verdaccio, and pin scenario deps to the published versions.
                           If Verdaccio is already running, publish is skipped (the existing
                           registry contents are reused) unless --force-publish is also passed.
  --force-checkout         Force git checkouts even if there are uncommitted changes in the scenario working directory
  --force-publish          Allow publishing to an already-running Verdaccio instance, potentially
                           overwriting its current contents

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
  try {
    const args = resolveAndValidateArgs(process.argv.slice(2));

    if (args === undefined) {
      console.log(USAGE);
      return;
    }

    const {
      command,
      e2eCloneDirectory,
      scenarioPath,
      execCommand,
      useLocal,
      forceCheckout,
      forcePublish,
    } = args;

    switch (command) {
      case Command.Init:
        await init(
          e2eCloneDirectory,
          scenarioPath,
          useLocal,
          forceCheckout,
          forcePublish,
        );
        break;
      case Command.Exec:
        await exec(
          e2eCloneDirectory,
          scenarioPath,
          execCommand,
          useLocal,
          forceCheckout,
          forcePublish,
        );
        break;
      case Command.Clean:
        clean(e2eCloneDirectory, scenarioPath);
        break;
      default: {
        const unhandled: never = command;
        throw new Error(`unhandled command: ${String(unhandled)}`);
      }
    }
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    logError(error.message);
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await main();
}
