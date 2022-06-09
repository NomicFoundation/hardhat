import chalk from "chalk";

export function checkIfWaffleIsInstalled() {
  try {
    require.resolve("ethereum-waffle");

    // TODO: add "Learn how to do it in https://hardhat.org/migrate-from-waffle"
    // at the end of the message after the guide is written (issue HH-726).
    console.warn(
      chalk.yellow(
        `You have both ethereum-waffle and @nomicfoundation/hardhat-chai-matchers installed. They don't work correctly together, so please make sure you only use one.

We recommend you migrate to @nomicfoundation/hardhat-chai-matchers. `
      )
    );
  } catch {}
}
