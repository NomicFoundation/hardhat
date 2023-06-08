import { assert, use } from "chai";
import chaiAsPromised from "chai-as-promised";

import { ExampleContract, EXAMPLE_CONTRACT } from "./example-contracts";
import { useEnvironment } from "./environment";
import { sleep } from "./helpers";

use(chaiAsPromised);

describe("contracts", function () {
  useEnvironment("minimal-project");

  it("should wait for deployment when automining is enabled", async function () {
    const signer = await this.env.ethers.provider.getSigner(0);

    const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer
    );

    const contract = await factory.deploy();

    await contract.waitForDeployment();
  });

  it("should wait for deployment when automining is disabled", async function () {
    const signer = await this.env.ethers.provider.getSigner(0);

    const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer
    );

    await this.env.network.provider.send("evm_setAutomine", [false]);

    const contract = await factory.deploy();

    let deployed = false;
    const waitForDeploymentPromise = contract.waitForDeployment().then(() => {
      deployed = true;
    });

    assert.isFalse(deployed);
    await sleep(10);
    assert.isFalse(deployed);

    await this.env.network.provider.send("hardhat_mine");
    await waitForDeploymentPromise;
    assert.isTrue(deployed);
  });

  it("should wait for multiple deployments at the same time", async function () {
    const signer = await this.env.ethers.provider.getSigner(0);

    const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer
    );

    await this.env.network.provider.send("evm_setAutomine", [false]);

    // we set the gas limit so that the 3 txs fit in a block
    const contract1 = await factory.deploy({ gasLimit: 1_000_000 });
    const contract2 = await factory.deploy({ gasLimit: 1_000_000 });
    const contract3 = await factory.deploy({ gasLimit: 1_000_000 });

    const allDeployedPromise = Promise.all([
      contract1.waitForDeployment(),
      contract2.waitForDeployment(),
      contract3.waitForDeployment(),
    ]);

    let deployed = false;
    const waitForDeploymentPromise = allDeployedPromise.then(() => {
      deployed = true;
    });

    assert.isFalse(deployed);
    await sleep(10);
    assert.isFalse(deployed);

    await this.env.network.provider.send("hardhat_mine");
    await waitForDeploymentPromise;
    assert.isTrue(deployed);
  });
});
