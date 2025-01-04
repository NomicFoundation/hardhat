import { assert } from "chai";
import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { HardhatEthersSigner } from "../src/signers";

import { useEnvironment } from "./environment";

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
      const signerAddress = "0x1010101010101010101010101010101010101010";

      beforeEach(async function () {
        await this.env.network.provider.send("hardhat_setBalance", [
          signerAddress,
          "0x1000000000000000000",
        ]);

        await this.env.run(TASK_COMPILE, { quiet: true });
      });

      describe("with the name and address", function () {
        it("Should return an instance of a contract with a read-only provider", async function () {
          const receipt = await deployGreeter(this.env, signerAddress);

          if (receipt === null) {
            assert.fail("receipt shouldn't be null");
          }
          if (receipt.contractAddress === null) {
            assert.fail("receipt.contractAddress shouldn't be null");
          }

          const contract = await this.env.ethers.getContractAt(
            "Greeter",
            receipt.contractAddress
          );

          assert.isDefined(contract.runner);
          assert.isNotNull(contract.runner);

          const greeting = await contract.greet();

          assert.strictEqual(greeting, "Hi");
        });
      });

      describe("with the abi and address", function () {
        it("Should return an instance of a contract with a read-only provider", async function () {
          const receipt = await deployGreeter(this.env, signerAddress);
          if (receipt === null) {
            assert.fail("receipt shouldn't be null");
          }
          if (receipt.contractAddress === null) {
            assert.fail("receipt.contractAddress shouldn't be null");
          }

          const signers = await this.env.ethers.getSigners();
          assert.isEmpty(signers);

          const greeterArtifact = await this.env.artifacts.readArtifact(
            "Greeter"
          );

          const contract = await this.env.ethers.getContractAt(
            greeterArtifact.abi,
            receipt.contractAddress
          );

          assert.isDefined(contract.runner);
          assert.isNotNull(contract.runner);

          const greeting = await contract.greet();

          assert.strictEqual(greeting, "Hi");
        });
      });
    });

    describe("getSigner", function () {
      it("should return a valid signer for an arbitrary account", async function () {
        const address = "0x5dA8b30645FAc04eCBC25987A2DFDFa49575945b";

        const signers = await this.env.ethers.getSigners();
        assert.isTrue(signers.every((aSigner) => aSigner.address !== address));

        const signer = await this.env.ethers.getSigner(address);
        // We need an as any here because the type of instanceOf expects a public constructor
        assert.instanceOf(signer, HardhatEthersSigner as any);
        assert.strictEqual(signer.address, address);
      });
    });
  });
});

async function deployGreeter(
  hre: HardhatRuntimeEnvironment,
  signerAddress: string
) {
  const Greeter = await hre.ethers.getContractFactory("Greeter");
  const tx = await Greeter.getDeployTransaction();
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
  if (receipt === null) {
    assert.fail("receipt shouldn't be null");
  }
  assert.strictEqual(receipt.status, 1, "The deployment transaction failed.");

  return receipt;
}
