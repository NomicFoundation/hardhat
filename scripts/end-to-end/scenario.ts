import { init } from "./subcommands/init.ts";
import { clean } from "./subcommands/clean.ts";
import { exec } from "./subcommands/exec.ts";
import { logError } from "./helpers/log.ts";
import { resolveAndValidateArgs } from "./helpers/args.ts";

const USAGE = `
end-to-end — Run Hardhat in end-to-end scenarios

DESCRIPTION
  Run Hardhat using a local Verdaccio registry against specified scenarios e.g. 
  third party repositories.
  Each scenario is defined by a scenario.json in end-to-end/<scenario-slug>/.

COMMANDS
  init <scenario-path>   Setup scenario (i.e. clone) and install hardhat from Verdaccio
  exec <scenario-path>   Run a command in the scenario's working directory
  clean <scenario-path>  Remove the scenario's working directory

OPTIONS
  --e2e-clone-dir <path>   Override clone directory (default: $E2E_CLONE_DIR or ./end-to-end-repos)
  --scenario               The scenario folder or file to work on
  --command <cmd>          Command to run (required with --exec)
  --with-verdaccio         Start Verdaccio (and publish) before the command, stop after
  --with-init              Run --init before --exec

EXAMPLES
  node scripts/end-to-end/scenario.ts init --scenario ./end-to-end/openzeppelin-contracts --with-verdaccio
  node scripts/end-to-end/scenario.ts exec --scenario ./end-to-end/openzeppelin-contracts --command "npx hardhat compile" --with-verdaccio --with-init
  node scripts/end-to-end/scenario.ts exec --scenario ./end-to-end/openzeppelin-contracts --command "npx hardhat test"
  node scripts/end-to-end/scenario.ts clean --scenario ./end-to-end/openzeppelin-contracts
`;

async function main(): Promise<void> {
  const {
    initFlag,
    execFlag,
    cleanFlag,
    e2eCloneDirectory,
    scenarioPath,
    command,
    withVerdaccioFlag,
    withInitFlag,
  } = resolveAndValidateArgs(process.argv.slice(2));

  try {
    if (initFlag) {
      await init(e2eCloneDirectory, scenarioPath, withVerdaccioFlag);
    } else if (execFlag) {
      if (command === undefined) {
        throw new Error("--exec requires --command <cmd>");
      }

      await exec(
        e2eCloneDirectory,
        scenarioPath,
        command,
        withInitFlag,
        withVerdaccioFlag,
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
