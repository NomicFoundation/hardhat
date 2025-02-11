import chalk from "chalk";

/**
 * Display the temporary starting message. Note this does not print a newline.
 *
 * @param state - the UI state
 */
export function calculateStartingMessage({
  moduleName,
  deploymentDir,
}: {
  moduleName: string | null;
  deploymentDir: string | undefined | null;
}): string {
  const warningMessage = chalk.yellow(
    chalk.bold(
      `You are running Hardhat Ignition against an in-process instance of Hardhat Network.
This will execute the deployment, but the results will be lost.
You can use --network <network-name> to deploy to a different network.`,
    ),
  );

  const startingMessage = `Hardhat Ignition starting for [ ${
    moduleName ?? "unknown"
  } ]...`;

  return deploymentDir === undefined
    ? `${warningMessage}\n\n${startingMessage}`
    : startingMessage;
}
