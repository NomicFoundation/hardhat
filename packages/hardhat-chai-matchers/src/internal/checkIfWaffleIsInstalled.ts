import chalk from "chalk";

export function checkIfWaffleIsInstalled() {
  try {
    require.resolve("ethereum-waffle");

    console.warn(
      chalk.yellow(
        `You have both ethereum-waffle and @nomicfoundation/hardhat-chai-matchers installed. They don't work correctly together, so please make sure you only use one.

We recommend you migrate to @nomicfoundation/hardhat-chai-matchers. Learn how to do it here: https://hardhat.org/migrate-from-waffle`
      )
    );
  } catch {}
}
