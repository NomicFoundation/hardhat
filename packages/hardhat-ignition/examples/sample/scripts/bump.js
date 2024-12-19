const {
  setNextBlockBaseFeePerGas,
  mine,
} = require("@nomicfoundation/hardhat-network-helpers");

/**
 * This is a script that can be used to manually test the fee bumping mechanism in Hardhat Ignition.
 *
 * Steps to use:
 * 1. Edit hardhat.config.js to adjust Hardhat Ignition's configuration, depending on what you want to test.
 *    Ex:
 *    ```
        networks: {
          hardhat: {
            mining: {
              auto: false,
            },
          },
        },
        ignition: {
          maxFeeBumps: 3,
          timeBeforeBumpingFees: 50,
          blockPollingInterval: 100,
        },
      ```
 *  2. Run `npx hardhat node` in one terminal.
 *  3. Run `npx hardhat run ./scripts/bump.js --network localhost` in another terminal.
 *  4. Wait for the script to ask you to start the deployment.
 *  5. Run `npx hardhat ignition deploy ./ignition/modules/LockModule.js --network localhost` in another terminal.
 */
async function main() {
  await ethers.provider.send("evm_setAutomine", [false]);

  // eslint-disable-next-line no-console
  console.log(
    "Script has started. Please open another terminal and start the deployment now..."
  );

  // wait for one tx to be added to the mempool
  await waitForPendingTxs(1);

  // eslint-disable-next-line no-console
  console.log(
    "Transaction detected, increasing block fee and mining a block..."
  );

  // bump the fee of the next block
  await setNextBlockBaseFeePerGas(10_000_000_000n);

  // mine the block
  await mine(1);

  // wait
  await sleep(1000);

  // bump the fee of the next block
  await setNextBlockBaseFeePerGas(100_000_000_000n);

  // mine the block
  await mine(1);

  // wait
  await sleep(1000);

  // bump the fee of the next block
  await setNextBlockBaseFeePerGas(1_000_000_000_000n);

  // mine the block
  await mine(1);

  // wait
  await sleep(1000);

  // bump the fee of the next block
  await setNextBlockBaseFeePerGas(10_000_000_000_000n);

  // mine the block
  await mine(1);

  // wait
  await sleep(1000);

  // bump the fee of the next block
  await setNextBlockBaseFeePerGas(100_000_000_000_000n);

  // mine the block
  await mine(1);

  // wait
  await sleep(1000);

  // eslint-disable-next-line no-console
  console.log("Script finished");
}

/* Helpers */

const sleep = (timeout) => new Promise((res) => setTimeout(res, timeout));

/**
 * Wait until there are at least `expectedCount` transactions in the mempool
 */
async function waitForPendingTxs(expectedCount) {
  while (true) {
    const pendingBlock = await network.provider.send("eth_getBlockByNumber", [
      "pending",
      false,
    ]);

    if (pendingBlock.transactions.length >= expectedCount) {
      return;
    }

    await sleep(50);
  }
}

main();
