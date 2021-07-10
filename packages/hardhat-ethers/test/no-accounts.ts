import { assert } from "chai";
import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { SignerWithAddress } from "../src/signers";

import { useEnvironment } from "./helpers";

describe("hardhat-ethers plugin", function () {
  describe("hardhat network with no accounts", function () {
    useEnvironment("hardhat-project-no-accounts", "hardhat");

    describe("fixture setup", function () {
      it("should not have accounts", async function () {
        const signers = await this.env.ethers.getSigners();
        assert.isEmpty(signers);
      });
    });

    describe("getContractAt", function () {
      let signerAddress: string;

      beforeEach(async function () {
        // We need some ether to send transactions so we mine a block and use the coinbase account to send them
        // TODO: being able to send transactions with gasPrice 0 would work too, but currently can't be done.
        await this.env.network.provider.request({
          method: "evm_mine",
          params: [],
        });

        const { miner } = await this.env.ethers.provider.getBlock("latest");
        signerAddress = miner;

        await this.env.run(TASK_COMPILE, { quiet: true });
      });

      describe("with the name and address", function () {
        it("Should return an instance of a contract with a read-only provider", async function () {
          const receipt = await deployGreeter(this.env, signerAddress);

          const contract = await this.env.ethers.getContractAt(
            "Greeter",
            receipt.contractAddress
          );

          assert.isDefined(contract.provider);
          assert.isNotNull(contract.provider);

          const greeting = await contract.functions.greet();

          assert.equal(greeting, "Hi");
        });
      });

      describe("with the abi and address", function () {
        it("Should return an instance of a contract with a read-only provider", async function () {
          const receipt = await deployGreeter(this.env, signerAddress);

          const signers = await this.env.ethers.getSigners();
          assert.isEmpty(signers);

          const greeterArtifact = await this.env.artifacts.readArtifact(
            "Greeter"
          );

          const contract = await this.env.ethers.getContractAt(
            greeterArtifact.abi,
            receipt.contractAddress
          );

          assert.isDefined(contract.provider);
          assert.isNotNull(contract.provider);

          const greeting = await contract.functions.greet();

          assert.equal(greeting, "Hi");
        });
      });
    });

    describe("getSigner", function () {
      it("should return a valid signer for an arbitrary account", async function () {
        const address = "0x5dA8b30645FAc04eCBC25987A2DFDFa49575945b";

        const signers = await this.env.ethers.getSigners();
        assert.isTrue(signers.every((aSigner) => aSigner.address !== address));

        const signer = await this.env.ethers.getSigner(address);
        assert.instanceOf(signer, SignerWithAddress);
        assert.equal(signer.address, address);
      });
    });
  });
});

async function deployGreeter(
  hre: HardhatRuntimeEnvironment,
  signerAddress: string
) {
  const Greeter = await hre.ethers.getContractFactory("Greeter");
  const tx = Greeter.getDeployTransaction();
  tx.from = signerAddress;

  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [signerAddress],
  });
  const txHash: string = (await hre.network.provider.request({
    method: "eth_sendTransaction",
    params: [tx],
  })) as string;

  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [signerAddress],
  });
  assert.isDefined(hre.ethers.provider);
  const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
  assert.equal(receipt.status, 1, "The deployment transaction failed.");

  return receipt;
}
