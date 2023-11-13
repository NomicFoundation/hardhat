import chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { Contract } from "web3";
import { useEnvironment } from "./helpers";

chai.use(chaiAsPromised);

describe("Web3 plugin", function () {
  describe("ganache", function () {
    useEnvironment("hardhat-project", "localhost");

    describe("contracts", function () {
      it("should deploy", async function () {
        const artifact = this.env.artifacts.readArtifactSync("Greeter");
        const Greeter = new Contract(artifact.abi, this.env.web3);
        const response = Greeter.deploy({
          data: artifact.bytecode,
        }).send({
          from: (await this.env.web3.eth.getAccounts())[0],
        });
        await new Promise<void>((resolve) =>
          response.on("receipt", () => resolve())
        );
      });
    });
  });
  describe("hardhat", function () {
    useEnvironment("hardhat-project", "hardhat");

    describe("contract", function () {
      it("should deploy", async function () {
        const artifact = this.env.artifacts.readArtifactSync("Greeter");
        const Greeter = new Contract(artifact.abi, this.env.web3);
        const from = (await this.env.web3.eth.getAccounts())[0];
        const response = Greeter.deploy({
          data: artifact.bytecode,
        }).send({
          from,
        });
        await new Promise<void>((resolve) =>
          response.on("receipt", () => resolve())
        );
      });
    });
  });
});
