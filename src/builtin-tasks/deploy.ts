import { InteractiveDeployer } from "../cli/InteractiveDeployer";
import { BuidlerError, ERRORS } from "../core/errors";
import tasks from "../core/importable-tasks-dsl";

tasks
  .task("deploy", "Interactively deploy contracts")
  .addFlag("noCompile", "Don't compile before running this task")
  .addOptionalParam("fromAccount", "The account used to deploy the contracts")
  .setAction(
    async (
      { noCompile, fromAccount }: { noCompile: boolean; fromAccount?: string },
      { buidlerArguments: { network, showStackTraces }, config, run }
    ) => {
      const { default: chalk } = await import("chalk");

      if (!process.stdin.isTTY) {
        throw new BuidlerError(ERRORS.TASK_DEPLOY_NON_INTERACTIVE);
      }

      if (network === "auto") {
        console.warn(
          chalk.yellow(
            'You are deploying to the "auto" network, which will be shut down once the deployment is finished.\n' +
              "You should probably use --network to deploy to somewhere else.\n"
          )
        );
      }

      if (!noCompile) {
        await run("compile");
      }

      const interactiveDeployer = new InteractiveDeployer(
        config,
        showStackTraces,
        fromAccount
      );

      await interactiveDeployer.run();
    }
  );
