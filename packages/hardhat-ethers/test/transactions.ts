import { assert, use } from "chai";
import chaiAsPromised from "chai-as-promised";

import { usePersistentEnvironment } from "./environment";
import { sleep } from "./helpers";

use(chaiAsPromised);

describe("transactions", function () {
  usePersistentEnvironment("minimal-project");

  it("should wait until a transaction is mined", async function () {
    const [signer] = await this.env.ethers.getSigners();

    // send a transaction with automining disabled
    await this.env.network.provider.send("evm_setAutomine", [false]);
    const tx = await signer.sendTransaction({ to: signer });

    let transactionIsMined = false;
    const transactionMinedPromise = tx.wait().then(() => {
      transactionIsMined = true;
    });

    // .wait() shouldn't resolve if the transaction wasn't mined
    await Promise.race([transactionMinedPromise, sleep(250)]);

    assert.isFalse(transactionIsMined);

    // mine a new block
    await this.env.network.provider.send("hardhat_mine", []);

    await transactionMinedPromise;

    assert.isTrue(transactionIsMined);

    // restore automining
    await this.env.network.provider.send("evm_setAutomine", [true]);
  });

  it("should wait until a transaction has the given number of confirmations", async function () {
    const [signer] = await this.env.ethers.getSigners();

    // send a transaction with automining disabled
    await this.env.network.provider.send("evm_setAutomine", [false]);
    const tx = await signer.sendTransaction({ to: signer });

    let transactionIsMined = false;
    const transactionMinedPromise = tx.wait(10).then(() => {
      transactionIsMined = true;
    });

    // .wait() shouldn't resolve if the transaction wasn't mined
    await Promise.race([transactionMinedPromise, sleep(250)]);
    assert.isFalse(transactionIsMined);

    // mine a new block
    await this.env.network.provider.send("hardhat_mine", []);

    // the promise shouldn't be resolved with just one confirmation
    await Promise.race([transactionMinedPromise, sleep(250)]);
    assert.isFalse(transactionIsMined);

    // mine 9 blocks more
    await this.env.network.provider.send("hardhat_mine", ["0x9"]);

    await transactionMinedPromise;

    assert.isTrue(transactionIsMined);

    // restore automining
    await this.env.network.provider.send("evm_setAutomine", [true]);
  });
});
