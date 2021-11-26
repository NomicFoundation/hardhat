const { expect } = require("chai");

describe("Internal test suite of hardhat-waffle's test project", function () {
  it("Should have waffle assertions loaded", function () {
    const chai = require("chai");
    if (!("revertedWith" in chai.Assertion.prototype)) {
      throw new Error("Failed to load it");
    }
  });

  it("Should fail", function () {
    throw new Error("Failed on purpose");
  });

  describe("Unsupported methods", function () {
    it("Should print the right error for calledOnContractWith", function () {
      try {
        expect("balanceOf").to.be.calledOnContractWith("asd", ["asd"]);
      } catch (error) {
        if (error.message.includes("is not supported by Hardhat")) {
          return;
        }
      }

      throw Error("Should have failed");
    });

    it("Should print the right error for calledOnContract", function () {
      try {
        expect("balanceOf").to.be.calledOnContract("asd");
      } catch (error) {
        if (error.message.includes("is not supported by Hardhat")) {
          return;
        }
      }

      throw Error("Should have failed");
    });
  });

  describe("waffle chai matchers", function () {
    it("should support bignumber matchers", async function () {
      expect(ethers.BigNumber.from(993)).to.equal(993);
    });

    it("should support the event matcher", async function () {
      const Contract = await ethers.getContractFactory("Contract");
      const contract = await Contract.deploy();

      await contract.deployed();

      await expect(contract.inc(7)).to.emit(contract, "Increment").withArgs(7);
    });

    it("should support the revert matcher", async function () {
      const Contract = await ethers.getContractFactory("Contract");
      const contract = await Contract.deploy();

      await contract.deployed();

      await expect(contract.inc(0)).to.be.reverted;
    });

    it("should support the revert with message matcher", async function () {
      const Contract = await ethers.getContractFactory("Contract");
      const contract = await Contract.deploy();

      await contract.deployed();

      await expect(contract.inc(0)).to.be.revertedWith(
        "Increment cannot be zero"
      );
    });

    it("should support the changeEtherBalance matcher", async function () {
      const [sender] = await ethers.getSigners();
      const Contract = await ethers.getContractFactory("Contract");
      const contract = await Contract.deploy();

      await contract.deployed();

      await expect(() =>
        contract.incByValue({ value: 200 })
      ).to.changeEtherBalance(sender, -200);
    });

    it("should support the changeEtherBalance matcher with fee enabled", async function () {
      const [sender] = await ethers.getSigners();
      const Contract = await ethers.getContractFactory("Contract");
      const contract = await Contract.deploy({
        gasPrice: 8e9,
      });

      await contract.deployed();

      await expect(() =>
        contract.incByValue({ value: 200 })
      ).to.changeEtherBalance(sender, -56189212266592, { includeFee: true });
    });

    it("should support the changeEtherBalance matcher with multiple accounts", async function () {
      const [sender, receiver] = await ethers.getSigners();

      await expect(() =>
        sender.sendTransaction({ to: receiver.address, value: 200 })
      ).to.changeEtherBalances([sender, receiver], [-200, 200]);
    });

    it("should support the changeTokenBalance matcher", async function () {
      const [, receiver] = await ethers.getSigners();

      const Token = await ethers.getContractFactory("Token");
      const token = await Token.deploy();
      await token.deployed();

      await expect(() =>
        token.transfer(receiver.address, 200)
      ).to.changeTokenBalance(token, receiver, 200);
    });

    it("should support the changeTokenBalance matcher with multiple accounts", async function () {
      const [sender, receiver] = await ethers.getSigners();

      const Token = await ethers.getContractFactory("Token");
      const token = await Token.deploy();
      await token.deployed();

      await expect(() =>
        token.transfer(receiver.address, 200)
      ).to.changeTokenBalances(token, [sender, receiver], [-200, 200]);
    });

    it("should support the properAddress matcher", async function () {
      expect("0x28FAA621c3348823D6c6548981a19716bcDc740e").to.be.properAddress;
      expect("foobar").not.to.be.properAddress;
    });

    it("should support the properPrivateKey matcher", async function () {
      expect(
        "0x706618637b8ca922f6290ce1ecd4c31247e9ab75cf0530a0ac95c0332173d7c5"
      ).to.be.properPrivateKey;
      expect("foobar").not.to.be.properPrivateKey;
    });

    it("should support the properHex matcher", async function () {
      expect("0x70").to.be.properHex(2);
      expect("foobar").not.to.be.properHex(2);
    });

    it("should support the hexEqual matcher", async function () {
      expect("0x00012AB").to.hexEqual("0x12ab");
      expect("0xdeadbeaf").not.to.hexEqual("0x12ab");
    });
  });
});
