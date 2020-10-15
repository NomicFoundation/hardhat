import { assert } from "chai";
import { ethers } from "ethers";
import { TransactionRequest } from "ethers/providers";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import { Artifact } from "hardhat/types";

import { useEnvironment } from "./helpers";

describe("Ethers plugin", function () {
  useEnvironment("hardhat-project");

  describe("HRE extensions", function () {
    it("should extend hardhat runtime environment", function () {
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
      await this.env.run("compile", { quiet: true });
      greeterArtifact = await this.env.artifacts.readArtifact("Greeter");

      iGreeterArtifact = await this.env.artifacts.readArtifact("IGreeter");
    });

    describe("getSigners", function () {
      it("should return the signers", async function () {
        const sigs = await this.env.ethers.getSigners();
        assert.equal(
          await sigs[0].getAddress(),
          "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1"
        );
      });

      it("should expose the address synchronously", async function () {
        const sigs = await this.env.ethers.getSigners();
        assert.equal(
          sigs[0].address,
          "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1"
        );
      });
    });

    describe("signer", function () {
      it("should sign a message", async function () {
        const [sig] = await this.env.ethers.getSigners();

        const result = await sig.signMessage("hello");

        assert.equal(
          result,
          "0x1845faa75f53acb0c3e7247dcf294ce045c139722418dc9638709b54bafffa093591aeaaa195e7dc53f7e774c80e9a7f1371f0647a100d1c9e81db83d8ddd47801"
        );
      });

      it("should send a transaction", async function () {
        const [sig] = await this.env.ethers.getSigners();

        const Greeter = await this.env.ethers.getContractFactory("Greeter");
        const tx = Greeter.getDeployTransaction();

        const response = await sig.sendTransaction(tx);

        const receipt = await response.wait();

        assert.equal(receipt.status, 1);
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

        it("should fail to return a contract factory for an interface", async function () {
          try {
            await this.env.ethers.getContractFactory("IGreeter");
          } catch (reason) {
            assert.instanceOf(
              reason,
              NomicLabsHardhatPluginError,
              "getContractFactory should fail with a hardhat plugin error"
            );
            assert.isTrue(
              reason.message.includes("is abstract and can't be deployed"),
              "getContractFactory should report the abstract contract as the cause"
            );
            return;
          }

          // The test shouldn't reach this point.
          assert.fail(
            "getContractFactory should fail with an abstract contract"
          );
        });

        it("should link a library", async function () {
          const libraryFactory = await this.env.ethers.getContractFactory(
            "TestLibrary"
          );
          const library = await libraryFactory.deploy();

          const contractFactory = await this.env.ethers.getContractFactory(
            "TestContractLib",
            { libraries: { TestLibrary: library.address } }
          );
          assert.equal(
            await contractFactory.signer.getAddress(),
            await signers[0].getAddress()
          );
          const numberPrinter = await contractFactory.deploy();
          const someNumber = 50;

          const request: TransactionRequest = {
            to: numberPrinter.address,
            data: numberPrinter.interface.functions.printNumber.encode([
              someNumber,
            ]),
          };

          const printedNumber = ethers.utils.bigNumberify(
            await this.env.ethers.provider.call(request)
          );

          assert.isTrue(printedNumber.eq(someNumber * 2));
        });

        it("should fail to link when passing in an ambiguous library link", async function () {
          const libraryFactory = await this.env.ethers.getContractFactory(
            "contracts/TestContractLib.sol:TestLibrary"
          );
          const library = await libraryFactory.deploy();

          try {
            await this.env.ethers.getContractFactory("TestContractLib", {
              libraries: {
                TestLibrary: library.address,
                "contracts/TestContractLib.sol:TestLibrary": library.address,
              },
            });
          } catch (reason) {
            assert.instanceOf(
              reason,
              NomicLabsHardhatPluginError,
              "getContractFactory should fail with a hardhat plugin error"
            );
            assert.isTrue(
              reason.message.includes(
                "refer to the same library and were given as two separate library links"
              ),
              "getContractFactory should report the ambiguous link as the cause"
            );
            assert.isTrue(
              reason.message.includes(
                "TestLibrary and contracts/TestContractLib.sol:TestLibrary"
              ),
              "getContractFactory should display the ambiguous library links"
            );
            return;
          }

          // The test shouldn't reach this point
          assert.fail(
            "getContractFactory should fail when the link for one library is ambiguous"
          );
        });

        it("should link a library even if there's an identically named library in the project", async function () {
          const libraryFactory = await this.env.ethers.getContractFactory(
            "contracts/TestNonUniqueLib.sol:NonUniqueLibrary"
          );
          const library = await libraryFactory.deploy();

          const contractFactory = await this.env.ethers.getContractFactory(
            "TestNonUniqueLib",
            { libraries: { NonUniqueLibrary: library.address } }
          );
          assert.equal(
            await contractFactory.signer.getAddress(),
            await signers[0].getAddress()
          );
        });

        it("should fail to link an ambiguous library", async function () {
          const libraryFactory = await this.env.ethers.getContractFactory(
            "contracts/AmbiguousLibrary.sol:AmbiguousLibrary"
          );
          const library = await libraryFactory.deploy();
          const library2Factory = await this.env.ethers.getContractFactory(
            "contracts/AmbiguousLibrary2.sol:AmbiguousLibrary"
          );
          const library2 = await libraryFactory.deploy();

          try {
            await this.env.ethers.getContractFactory("TestAmbiguousLib", {
              libraries: {
                AmbiguousLibrary: library.address,
                "contracts/AmbiguousLibrary2.sol:AmbiguousLibrary":
                  library2.address,
              },
            });
          } catch (reason) {
            assert.instanceOf(
              reason,
              NomicLabsHardhatPluginError,
              "getContractFactory should fail with a hardhat plugin error"
            );
            assert.isTrue(
              reason.message.includes("is ambiguous for the contract"),
              "getContractFactory should report the ambiguous name resolution as the cause"
            );
            assert.isTrue(
              reason.message.includes(
                "AmbiguousLibrary.sol:AmbiguousLibrary"
              ) &&
                reason.message.includes(
                  "AmbiguousLibrary2.sol:AmbiguousLibrary"
                ),
              "getContractFactory should enumerate both available library name candidates"
            );
            return;
          }

          // The test shouldn't reach this point
          assert.fail(
            "getContractFactory should fail to retrieve an ambiguous library name"
          );
        });

        it("should fail to create a contract factory with missing libraries", async function () {
          try {
            await this.env.ethers.getContractFactory("TestContractLib");
          } catch (reason) {
            assert.instanceOf(
              reason,
              NomicLabsHardhatPluginError,
              "getContractFactory should fail with a hardhat plugin error"
            );
            assert.isTrue(
              reason.message.includes(
                "missing links for the following libraries"
              ),
              "getContractFactory should report the missing libraries as the cause"
            );
            assert.isTrue(
              reason.message.includes("TestContractLib.sol:TestLibrary"),
              "getContractFactory should enumerate missing library names"
            );
            return;
          }

          // The test shouldn't reach this point
          assert.fail(
            "getContractFactory should fail to create a contract factory if there are missing libraries"
          );
        });

        it("should fail to create a contract factory with an invalid address", async function () {
          const notAnAddress = "definitely not an address";
          try {
            await this.env.ethers.getContractFactory("TestContractLib", {
              libraries: { TestLibrary: notAnAddress },
            });
          } catch (reason) {
            assert.instanceOf(
              reason,
              NomicLabsHardhatPluginError,
              "getContractFactory should fail with a hardhat plugin error"
            );
            assert.isTrue(
              reason.message.includes("invalid address"),
              "getContractFactory should report the invalid address as the cause"
            );
            assert.isTrue(
              reason.message.includes(notAnAddress),
              "getContractFactory should display the invalid address"
            );
            return;
          }

          // The test shouldn't reach this point
          assert.fail(
            "getContractFactory should fail to create a contract factory if there is an invalid address"
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
