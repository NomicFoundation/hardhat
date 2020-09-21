import { Artifacts } from "@nomiclabs/buidler/plugins";
import { Artifact } from "@nomiclabs/buidler/types";
import { assert } from "chai";
import { ethers } from "ethers";
import path from "path";

import { useEnvironment } from "./helpers";

describe("Ethers plugin", function () {
  useEnvironment(path.join(__dirname, "buidler-project"));

  describe("BRE extensions", function () {
    it("should extend buidler runtime environment", function () {
      assert.isDefined(this.env.ethers);
      assert.containsAllKeys(this.env.ethers, [
        "provider",
        "getSigners",
        "getContractFactory",
        "getContractAt",
        ...Object.keys(ethers),
      ]);
    });
  });

  describe("Provider", function () {
    it("the provider should handle requests", async function () {
      const accounts = await this.env.ethers.provider.send("eth_accounts", []);
      assert.equal(accounts[0], "0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1");
    });
  });

  describe("Signers and contracts helpers", function () {
    let signers: ethers.Signer[];
    let greeterArtifact: Artifact;
    let iGreeterArtifact: Artifact;

    beforeEach(async function () {
      signers = await this.env.ethers.getSigners();
      await this.env.run("compile");
      const artifacts = new Artifacts(this.env.config.paths.artifacts);
      greeterArtifact = await artifacts.readArtifact("Greeter");

      iGreeterArtifact = await artifacts.readArtifact("IGreeter");
    });

    describe("getSigners", function () {
      it("should return the signers", async function () {
        const sigs = await this.env.ethers.getSigners();
        assert.equal(
          await sigs[0].getAddress(),
          "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1"
        );
      });
    });

    describe("getContractFactory", function () {
      describe("By name", function () {
        it("should return a contract factory", async function () {
          // It's already compiled in artifacts/
          const contract = await this.env.ethers.getContractFactory("Greeter");

          assert.containsAllKeys(contract.interface.functions, [
            "setGreeting(string)",
            "greet()",
          ]);

          assert.equal(
            await contract.signer.getAddress(),
            await signers[0].getAddress()
          );
        });

        it("should return a contract factory for an interface", async function () {
          const contract = await this.env.ethers.getContractFactory("IGreeter");
          assert.equal(contract.bytecode, "0x");
          assert.containsAllKeys(contract.interface.functions, ["greet()"]);

          assert.equal(
            await contract.signer.getAddress(),
            await signers[0].getAddress()
          );
        });

        it("Should be able to send txs and make calls", async function () {
          const Greeter = await this.env.ethers.getContractFactory("Greeter");
          const greeter = await Greeter.deploy();

          assert.equal(await greeter.functions.greet(), "Hi");
          await greeter.functions.setGreeting("Hola");
          assert.equal(await greeter.functions.greet(), "Hola");
        });

        describe("with custom signer", function () {
          it("should return a contract factory connected to the custom signer", async function () {
            // It's already compiled in artifacts/
            const contract = await this.env.ethers.getContractFactory(
              "Greeter",
              signers[1]
            );

            assert.containsAllKeys(contract.interface.functions, [
              "setGreeting(string)",
              "greet()",
            ]);

            assert.equal(
              await contract.signer.getAddress(),
              await signers[1].getAddress()
            );
          });
        });
      });

      describe("by abi and bytecode", function () {
        it("should return a contract factory", async function () {
          // It's already compiled in artifacts/
          const contract = await this.env.ethers.getContractFactory(
            greeterArtifact.abi,
            greeterArtifact.bytecode
          );

          assert.containsAllKeys(contract.interface.functions, [
            "setGreeting(string)",
            "greet()",
          ]);

          assert.equal(
            await contract.signer.getAddress(),
            await signers[0].getAddress()
          );
        });

        it("should return a contract factory for an interface", async function () {
          const contract = await this.env.ethers.getContractFactory(
            iGreeterArtifact.abi,
            iGreeterArtifact.bytecode
          );
          assert.equal(contract.bytecode, "0x");
          assert.containsAllKeys(contract.interface.functions, ["greet()"]);

          assert.equal(
            await contract.signer.getAddress(),
            await signers[0].getAddress()
          );
        });

        it("Should be able to send txs and make calls", async function () {
          const Greeter = await this.env.ethers.getContractFactory(
            greeterArtifact.abi,
            greeterArtifact.bytecode
          );
          const greeter = await Greeter.deploy();

          assert.equal(await greeter.functions.greet(), "Hi");
          await greeter.functions.setGreeting("Hola");
          assert.equal(await greeter.functions.greet(), "Hola");
        });

        describe("with custom signer", function () {
          it("should return a contract factory connected to the custom signer", async function () {
            // It's already compiled in artifacts/
            const contract = await this.env.ethers.getContractFactory(
              greeterArtifact.abi,
              greeterArtifact.bytecode,
              signers[1]
            );

            assert.containsAllKeys(contract.interface.functions, [
              "setGreeting(string)",
              "greet()",
            ]);

            assert.equal(
              await contract.signer.getAddress(),
              await signers[1].getAddress()
            );
          });
        });
      });
    });

    describe("getContractAt", function () {
      let deployedGreeter: ethers.Contract;

      beforeEach(async function () {
        const Greeter = await this.env.ethers.getContractFactory("Greeter");
        deployedGreeter = await Greeter.deploy();
      });

      describe("by name and address", function () {
        it("Should return an instance of a contract", async function () {
          const contract = await this.env.ethers.getContractAt(
            "Greeter",
            deployedGreeter.address
          );

          assert.containsAllKeys(contract.functions, [
            "setGreeting(string)",
            "greet()",
          ]);

          assert.equal(
            await contract.signer.getAddress(),
            await signers[0].getAddress()
          );
        });

        it("Should return an instance of an interface", async function () {
          const contract = await this.env.ethers.getContractAt(
            "IGreeter",
            deployedGreeter.address
          );

          assert.containsAllKeys(contract.functions, ["greet()"]);

          assert.equal(
            await contract.signer.getAddress(),
            await signers[0].getAddress()
          );
        });

        it("Should be able to send txs and make calls", async function () {
          const greeter = await this.env.ethers.getContractAt(
            "Greeter",
            deployedGreeter.address
          );

          assert.equal(await greeter.functions.greet(), "Hi");
          await greeter.functions.setGreeting("Hola");
          assert.equal(await greeter.functions.greet(), "Hola");
        });

        describe("with custom signer", function () {
          it("Should return an instance of a contract associated to a custom signer", async function () {
            const contract = await this.env.ethers.getContractAt(
              "Greeter",
              deployedGreeter.address,
              signers[1]
            );

            assert.equal(
              await contract.signer.getAddress(),
              await signers[1].getAddress()
            );
          });
        });
      });

      describe("by abi and address", function () {
        it("Should return an instance of a contract", async function () {
          const contract = await this.env.ethers.getContractAt(
            greeterArtifact.abi,
            deployedGreeter.address
          );

          assert.containsAllKeys(contract.functions, [
            "setGreeting(string)",
            "greet()",
          ]);

          assert.equal(
            await contract.signer.getAddress(),
            await signers[0].getAddress()
          );
        });

        it("Should return an instance of an interface", async function () {
          const contract = await this.env.ethers.getContractAt(
            iGreeterArtifact.abi,
            deployedGreeter.address
          );

          assert.containsAllKeys(contract.functions, ["greet()"]);

          assert.equal(
            await contract.signer.getAddress(),
            await signers[0].getAddress()
          );
        });

        it("Should be able to send txs and make calls", async function () {
          const greeter = await this.env.ethers.getContractAt(
            greeterArtifact.abi,
            deployedGreeter.address
          );

          assert.equal(await greeter.functions.greet(), "Hi");
          await greeter.functions.setGreeting("Hola");
          assert.equal(await greeter.functions.greet(), "Hola");
        });

        describe("with custom signer", function () {
          it("Should return an instance of a contract associated to a custom signer", async function () {
            const contract = await this.env.ethers.getContractAt(
              greeterArtifact.abi,
              deployedGreeter.address,
              signers[1]
            );

            assert.equal(
              await contract.signer.getAddress(),
              await signers[1].getAddress()
            );
          });
        });
      });
    });
  });
});
