import type { HardhatEthers } from "../src/types.js";
import type { ArtifactManager } from "hardhat/types/artifacts";
import type { EthereumProvider } from "hardhat/types/providers";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

import { HardhatEthersSigner } from "../src/internal/signers/signers.js";

import { initializeTestEthers } from "./helpers/helpers.js";

describe("hardhat-ethers plugin", () => {
  let ethers: HardhatEthers;
  let ethereumProvider: EthereumProvider;
  let artifactManager: ArtifactManager;

  beforeEach(async () => {
    ({
      ethers,
      provider: ethereumProvider,
      artifactManager: artifactManager,
    } = await initializeTestEthers(
      [
        {
          artifactName: "Greeter",
          fileName: "greeter",
        },
      ],
      {
        networks: { default: { type: "edr-simulated", accounts: [] } },
      },
    ));
  });

  describe("hardhat network with no accounts", () => {
    describe("fixture setup", () => {
      it("should not have accounts", async () => {
        const signers = await ethers.getSigners();
        assert.deepEqual(signers, []);
      });
    });

    describe("getContractAt", () => {
      const signerAddress = "0x1010101010101010101010101010101010101010";

      beforeEach(async () => {
        await ethereumProvider.request({
          method: "hardhat_setBalance",
          params: [signerAddress, "0x1000000000000000000"],
        });
      });

      describe("with the name and address", () => {
        it("Should return an instance of a contract with a read-only provider", async () => {
          const receipt = await deployGreeter(
            ethers,
            ethereumProvider,
            signerAddress,
          );

          if (receipt === null) {
            assert.fail("receipt shoudn't be null");
          }
          if (receipt.contractAddress === null) {
            assert.fail("receipt.contractAddress shoudn't be null");
          }

          const contract = await ethers.getContractAt(
            "Greeter",
            receipt.contractAddress,
          );

          assert.equal(contract.runner !== undefined, true);
          assert.equal(contract.runner !== null, true);

          const greeting = await contract.greet();

          assert.equal(greeting, "Hi");
        });
      });

      describe("with the abi and address", () => {
        it("Should return an instance of a contract with a read-only provider", async () => {
          const receipt = await deployGreeter(
            ethers,
            ethereumProvider,
            signerAddress,
          );

          if (receipt === null) {
            assert.fail("receipt shoudn't be null");
          }
          if (receipt.contractAddress === null) {
            assert.fail("receipt.contractAddress shoudn't be null");
          }

          const signers = await ethers.getSigners();
          assert.equal(signers.length, 0);

          const greeterArtifact = await artifactManager.readArtifact("Greeter");

          const contract = await ethers.getContractAt(
            greeterArtifact.abi,
            receipt.contractAddress,
          );

          assert.equal(contract.runner !== undefined, true);
          assert.equal(contract.runner !== null, true);

          const greeting = await contract.greet();

          assert.equal(greeting, "Hi");
        });
      });
    });

    describe("getSigner", () => {
      it("should return a valid signer for an arbitrary account", async () => {
        const address = "0x5dA8b30645FAc04eCBC25987A2DFDFa49575945b";

        const signers = await ethers.getSigners();
        assert.equal(
          signers.every((aSigner) => aSigner.address !== address),
          true,
        );

        const signer = await ethers.getSigner(address);

        assert.equal(signer instanceof HardhatEthersSigner, true);
        assert.equal(signer.address, address);
      });
    });
  });
});

async function deployGreeter(
  ethers: HardhatEthers,
  ethereumProvider: EthereumProvider,
  signerAddress: string,
) {
  const Greeter = await ethers.getContractFactory("Greeter");
  const tx = await Greeter.getDeployTransaction();
  tx.from = signerAddress;

  await ethereumProvider.request({
    method: "hardhat_impersonateAccount",
    params: [signerAddress],
  });

  const txHash = await ethereumProvider.request({
    method: "eth_sendTransaction",
    params: [tx],
  });

  assertHardhatInvariant(
    typeof txHash === "string",
    "txHash should be a string",
  );

  await ethereumProvider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [signerAddress],
  });

  assert.equal(ethers.provider !== null && ethers.provider !== undefined, true);

  const receipt = await ethers.provider.getTransactionReceipt(txHash);
  if (receipt === null) {
    assert.fail("receipt shoudn't be null");
  }

  assert.equal(receipt.status, 1, "The deployment transaction failed.");

  return receipt;
}
