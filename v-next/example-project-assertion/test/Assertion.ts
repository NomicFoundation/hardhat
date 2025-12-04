import { expect } from "chai";
import { network } from "hardhat";
import keccak256 from "keccak256";
import { personalSign } from "@metamask/eth-sig-util";
import type { Signer, Contract } from "ethers";
import { MerkleTree } from "merkletreejs";
const { ethers, networkHelpers } = await network.connect();
const { loadFixture } = networkHelpers;

interface AccountWithDropValue {
  account: Signer;
  amount: number;
}

function keccak128(input: Buffer | string): Buffer {
  return keccak256(input).slice(0, 16);
}

describe("Hardhat3 test", function () {
  async function deployContractsFixture() {
    const [owner, alice, bob, carol, dan] = await ethers.getSigners();
    const token = (await ethers.deployContract("TokenMock", [
      "1INCH Token",
      "1INCH",
    ])) as unknown as Contract;

    await Promise.all([alice, bob, carol, dan].map((w) => token.mint(w, 1n)));

    const accountWithDropValues: AccountWithDropValue[] = [
      { account: owner, amount: 1 },
      { account: alice, amount: 1 },
    ];

    const elements = await Promise.all(
      accountWithDropValues.map(async (w) => {
        const address = await w.account.getAddress();
        return (
          "0x" +
          address.slice(2) +
          BigInt(w.amount).toString(16).padStart(64, "0")
        );
      })
    );
    const hashedElements = elements.map((elem) =>
      MerkleTree.bufferToHex(keccak128(elem))
    );
    const tree = new MerkleTree(elements, keccak128, {
      hashLeaves: true,
      sort: true,
    });
    const root = tree.getHexRoot();
    const leaves = tree.getHexLeaves();
    const proofs = leaves
      .map(tree.getHexProof, tree)
      .map((proof) => "0x" + proof.map((p) => p.slice(2)).join(""));

    const SignatureMerkleDrop128Factory = await ethers.getContractFactory(
      "SignatureMerkleDrop128"
    );
    const drop = await SignatureMerkleDrop128Factory.deploy(
      await token.getAddress(),
      root,
      tree.getDepth()
    );
    await token.mint(
      await drop.getAddress(),
      accountWithDropValues.map((w) => w.amount).reduce((a, b) => a + b, 0)
    );

    const data = MerkleTree.bufferToHex(keccak256(await alice.getAddress()));
    const signature = personalSign({
      privateKey: Buffer.from(
        "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        "hex"
      ),
      data,
    });

    return {
      accounts: { owner, alice },
      contracts: { token, drop },
      others: { hashedElements, leaves, proofs, signature },
    };
  }

  it("Should transfer money to another wallet with extra value", async function () {
    const {
      accounts: { alice },
      contracts: { drop },
      others: { hashedElements, leaves, proofs, signature },
    } = await loadFixture(deployContractsFixture);
    const txn = await drop.claim(
      alice,
      1,
      proofs[leaves.indexOf(hashedElements[0])],
      signature,
      { value: 10 }
    );
    expect(txn).to.changeEtherBalance(ethers, alice, 10);
  });

  it("Should disallow invalid proof", async function () {
    const {
      accounts: { alice },
      contracts: { drop },
      others: { signature },
    } = await loadFixture(deployContractsFixture);
    await expect(
      drop.claim(alice, 1, "0x", signature)
    ).to.be.revertedWithCustomError(drop, "InvalidProof");
  });
});

/*

Running Mocha tests

  Hardhat3 test
    ✔ Should transfer money to another wallet with extra value (69ms)
    ✔ Should disallow invalid proof


  2 passing (85ms)

Unhandled promise rejection:

HardhatError: HHE100: An internal invariant was violated: The block doesn't exist
    at assertHardhatInvariant (/Users/glebalekseev/Documents/git/merkle-distribution/node_modules/@nomicfoundation/hardhat-errors/src/errors.ts:237:11)
    at getBalanceChange (/Users/glebalekseev/Documents/git/merkle-distribution/node_modules/@nomicfoundation/hardhat-ethers-chai-matchers/src/internal/matchers/changeEtherBalance.ts:100:3)
    at async Promise.all (index 0)
error Command failed with exit code 1.

*/
