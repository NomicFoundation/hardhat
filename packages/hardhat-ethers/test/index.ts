import type { ethers as EthersT } from "ethers";
import chai, { assert } from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers } from "ethers";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import { Artifact } from "hardhat/types";

import { HardhatEthersSigner } from "../src/signers";

import { useEnvironment } from "./environment";
import { GreeterContract, TestContractLib } from "./example-contracts";
import { assertIsNotNull, assertIsSigner } from "./helpers";

chai.use(chaiAsPromised);

describe("Ethers plugin", function () {
  describe("hardhat node", function () {
    useEnvironment("hardhat-project", "localhost");

    describe("HRE extensions", function () {
      it("should extend hardhat runtime environment", function () {
        assert.isDefined(this.env.ethers);
        assert.containsAllKeys(this.env.ethers, [
          "provider",
          "getSigners",
          "getImpersonatedSigner",
          "getContractFactory",
          "getContractAt",
          ...Object.keys(ethers),
        ]);
      });
    });

    describe("Provider", function () {
      it("the provider should handle requests", async function () {
        const accounts = await this.env.ethers.provider.send(
          "eth_accounts",
          []
        );
        assert.strictEqual(
          accounts[0],
          "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
        );
      });
    });

    describe("Signers and contracts helpers", function () {
      let signers: HardhatEthersSigner[];
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
          assert.strictEqual(
            await sigs[0].getAddress(),
            "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
          );
        });

        it("should expose the address synchronously", async function () {
          const sigs = await this.env.ethers.getSigners();
          assert.strictEqual(
            sigs[0].address,
            "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
          );
        });

        it("should return an empty array of signers if `eth_accounts` is deprecated", async function () {
          const originalSend = this.env.ethers.provider.send;

          this.env.ethers.provider.send = async function (
            method: string,
            params: any
          ) {
            if (method === "eth_accounts") {
              throw new Error("the method has been deprecated: eth_accounts");
            }

            return originalSend.call(this, method, params);
          };

          const sigs = await this.env.ethers.getSigners();

          assert.deepStrictEqual(sigs, []);
        });
      });

      describe("getImpersonatedSigner", function () {
        it("should return the working impersonated signer", async function () {
          const [signer] = await this.env.ethers.getSigners();
          const randomAddress = `0xe7d45f52130a5634f19346a3e5d32994ad821750`;
          const impersonatedSigner =
            await this.env.ethers.getImpersonatedSigner(randomAddress);

          assert.strictEqual(
            impersonatedSigner.address.toLowerCase(),
            randomAddress
          );

          // fund impersonated account
          await signer.sendTransaction({
            to: impersonatedSigner,
            value: 10n ** 18n,
          });

          // send a tx from impersonated account
          await impersonatedSigner.sendTransaction({
            to: this.env.ethers.ZeroAddress,
            value: 10n ** 17n,
          });
        });
      });

      describe("signer", function () {
        it("should sign a message", async function () {
          const [sig] = await this.env.ethers.getSigners();

          const result = await sig.signMessage("hello");

          assert.strictEqual(
            result,
            "0xf16ea9a3478698f695fd1401bfe27e9e4a7e8e3da94aa72b021125e31fa899cc573c48ea3fe1d4ab61a9db10c19032026e3ed2dbccba5a178235ac27f94504311c"
          );
        });

        it("should throw when sign a transaction", async function () {
          const [sig] = await this.env.ethers.getSigners();

          const Greeter = await this.env.ethers.getContractFactory("Greeter");
          const tx = await Greeter.getDeployTransaction();

          await assert.isRejected(sig.signTransaction(tx));
        });

        // `signer.getBalance` is not present in ethers v6; we should re-enable
        // this test when/if it's added back
        it.skip("should return the balance of the account", async function () {
          const [sig] = await this.env.ethers.getSigners();
          assert.strictEqual(
            // @ts-expect-error
            (await sig.getBalance()).toString(),
            "100000000000000000000"
          );
        });

        it("should return the balance of the account", async function () {
          // we use the second signer because the first one is used in previous tests
          const [, secondSigner] = await this.env.ethers.getSigners();
          assert.strictEqual(
            await this.env.ethers.provider.getBalance(secondSigner),
            10_000n * 10n ** 18n
          );
        });

        it("should return the transaction count of the account", async function () {
          // we use the second signer because the first one is used in previous tests
          const [, secondSigner] = await this.env.ethers.getSigners();
          assert.strictEqual(
            await this.env.ethers.provider.getTransactionCount(secondSigner),
            0
          );
        });

        it("should allow to use the estimateGas method", async function () {
          const [sig] = await this.env.ethers.getSigners();

          const Greeter = await this.env.ethers.getContractFactory("Greeter");
          const tx = await Greeter.getDeployTransaction();

          const result = await sig.estimateGas(tx);

          assert.isTrue(result > 0n);
        });

        it("should allow to use the call method", async function () {
          const [sig] = await this.env.ethers.getSigners();

          const Greeter = await this.env.ethers.getContractFactory("Greeter");
          const tx = await Greeter.getDeployTransaction();

          const result = await sig.call(tx);

          assert.isString(result);
        });

        it("should send a transaction", async function () {
          const [sig] = await this.env.ethers.getSigners();

          const Greeter = await this.env.ethers.getContractFactory("Greeter");
          const tx = await Greeter.getDeployTransaction();

          const response = await sig.sendTransaction(tx);

          const receipt = await response.wait();

          if (receipt === null) {
            assert.fail("receipt shouldn't be null");
          }
          assert.strictEqual(receipt.status, 1);
        });

        it("should get the chainId", async function () {
          const { chainId } = await this.env.ethers.provider.getNetwork();

          assert.strictEqual(chainId, 31337n);
        });

        it("should get the gas price", async function () {
          const feeData: EthersT.FeeData =
            await this.env.ethers.provider.getFeeData();

          assertIsNotNull(feeData.gasPrice);
          assert.isTrue(feeData.gasPrice > 0);
        });

        it("should populate a transaction", async function () {
          const [sig] = await this.env.ethers.getSigners();

          const Greeter = await this.env.ethers.getContractFactory("Greeter");
          const tx = await Greeter.getDeployTransaction();

          const populatedTransaction = await sig.populateTransaction(tx);

          assert.strictEqual(populatedTransaction.from, sig.address);
        });
      });

      describe("getContractFactory", function () {
        describe("By name", function () {
          it("should return a contract factory", async function () {
            // It's already compiled in artifacts/
            const contract = await this.env.ethers.getContractFactory(
              "Greeter"
            );

            assert.isNotNull(contract.interface.getFunction("greet"));
            assert.isNotNull(contract.interface.getFunction("setGreeting"));

            // non-existent functions should be null
            assert.isNull(contract.interface.getFunction("doesntExist"));
            assertIsSigner(contract.runner);

            assert.strictEqual(
              await contract.runner.getAddress(),
              await signers[0].getAddress()
            );
          });

          it("should fail to return a contract factory for an interface", async function () {
            try {
              await this.env.ethers.getContractFactory("IGreeter");
            } catch (reason: any) {
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

            const contractFactory = await this.env.ethers.getContractFactory<
              [],
              TestContractLib
            >("TestContractLib", {
              libraries: { TestLibrary: library.target },
            });
            assertIsSigner(contractFactory.runner);
            assert.strictEqual(
              await contractFactory.runner.getAddress(),
              await signers[0].getAddress()
            );
            const numberPrinter = await contractFactory.deploy();
            const someNumber = 50n;
            assert.strictEqual(
              await numberPrinter.printNumber.staticCall(someNumber),
              someNumber * 2n
            );
          });

          it("should fail to link when passing in an ambiguous library link", async function () {
            const libraryFactory = await this.env.ethers.getContractFactory(
              "contracts/TestContractLib.sol:TestLibrary"
            );
            const library = await libraryFactory.deploy();

            try {
              await this.env.ethers.getContractFactory("TestContractLib", {
                libraries: {
                  TestLibrary: await library.getAddress(),
                  "contracts/TestContractLib.sol:TestLibrary":
                    await library.getAddress(),
                },
              });
            } catch (reason: any) {
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
              { libraries: { NonUniqueLibrary: await library.getAddress() } }
            );
            assertIsSigner(contractFactory.runner);
            assert.strictEqual(
              await contractFactory.runner.getAddress(),
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
            const library2 = await library2Factory.deploy();

            try {
              await this.env.ethers.getContractFactory("TestAmbiguousLib", {
                libraries: {
                  AmbiguousLibrary: await library.getAddress(),
                  "contracts/AmbiguousLibrary2.sol:AmbiguousLibrary":
                    await library2.getAddress(),
                },
              });
            } catch (reason: any) {
              if (!(reason instanceof NomicLabsHardhatPluginError)) {
                assert.fail(
                  "getContractFactory should fail with a hardhat plugin error"
                );
              }
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
            } catch (reason: any) {
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
            } catch (reason: any) {
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

          it("should contract instances as libraries", async function () {
            const libraryFactory = await this.env.ethers.getContractFactory(
              "TestLibrary"
            );
            const library = await libraryFactory.deploy();

            await this.env.ethers.getContractFactory("TestContractLib", {
              libraries: { TestLibrary: library },
            });
          });

          it("Should be able to send txs and make calls", async function () {
            const Greeter = await this.env.ethers.getContractFactory<
              [],
              GreeterContract
            >("Greeter");
            const greeter = await Greeter.deploy();

            assert.strictEqual(await greeter.greet(), "Hi");
            await greeter.setGreeting("Hola");
            assert.strictEqual(await greeter.greet(), "Hola");
          });

          describe("with hardhat's signer", function () {
            it("should return a contract factory connected to the hardhat's signer", async function () {
              // It's already compiled in artifacts/
              const contract = await this.env.ethers.getContractFactory(
                "Greeter",
                signers[1]
              );

              assert.isNotNull(contract.interface.getFunction("greet"));
              assert.isNotNull(contract.interface.getFunction("setGreeting"));
              assertIsSigner(contract.runner);

              assert.strictEqual(
                await contract.runner.getAddress(),
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

            assert.isNotNull(contract.interface.getFunction("greet"));
            assert.isNotNull(contract.interface.getFunction("setGreeting"));
            assertIsSigner(contract.runner);

            assert.strictEqual(
              await contract.runner.getAddress(),
              await signers[0].getAddress()
            );
          });

          it("should return a contract factory for an interface", async function () {
            const contract = await this.env.ethers.getContractFactory(
              iGreeterArtifact.abi,
              iGreeterArtifact.bytecode
            );
            assert.strictEqual(contract.bytecode, "0x");
            assert.isNotNull(contract.interface.getFunction("greet"));
            assertIsSigner(contract.runner);

            assert.strictEqual(
              await contract.runner.getAddress(),
              await signers[0].getAddress()
            );
          });

          it("Should be able to send txs and make calls", async function () {
            const Greeter = await this.env.ethers.getContractFactory<
              [],
              GreeterContract
            >(greeterArtifact.abi, greeterArtifact.bytecode);
            const greeter = await Greeter.deploy();

            assert.strictEqual(await greeter.greet(), "Hi");
            await greeter.setGreeting("Hola");
            assert.strictEqual(await greeter.greet(), "Hola");
          });

          describe("with hardhat's signer", function () {
            it("should return a contract factory connected to the hardhat's signer", async function () {
              // It's already compiled in artifacts/
              const contract = await this.env.ethers.getContractFactory(
                greeterArtifact.abi,
                greeterArtifact.bytecode,
                signers[1]
              );

              assert.isNotNull(contract.interface.getFunction("greet"));
              assert.isNotNull(contract.interface.getFunction("setGreeting"));
              assertIsSigner(contract.runner);

              assert.strictEqual(
                await contract.runner.getAddress(),
                await signers[1].getAddress()
              );
            });
          });
        });
      });

      describe("getContractFactoryFromArtifact", function () {
        it("should return a contract factory", async function () {
          const contract = await this.env.ethers.getContractFactoryFromArtifact(
            greeterArtifact
          );

          assert.isNotNull(contract.interface.getFunction("greet"));
          assert.isNotNull(contract.interface.getFunction("setGreeting"));
          assertIsSigner(contract.runner);

          assert.strictEqual(
            await contract.runner.getAddress(),
            await signers[0].getAddress()
          );
        });

        it("should link a library", async function () {
          const libraryFactory = await this.env.ethers.getContractFactory(
            "TestLibrary"
          );
          const library = await libraryFactory.deploy();

          const testContractLibArtifact = await this.env.artifacts.readArtifact(
            "TestContractLib"
          );

          const contractFactory =
            await this.env.ethers.getContractFactoryFromArtifact<
              [],
              TestContractLib
            >(testContractLibArtifact, {
              libraries: { TestLibrary: await library.getAddress() },
            });
          assertIsSigner(contractFactory.runner);

          assert.strictEqual(
            await contractFactory.runner.getAddress(),
            await signers[0].getAddress()
          );

          const numberPrinter = await contractFactory.deploy();
          const someNumber = 50n;
          assert.strictEqual(
            await numberPrinter.printNumber.staticCall(someNumber),
            someNumber * 2n
          );
        });

        it("Should be able to send txs and make calls", async function () {
          const Greeter = await this.env.ethers.getContractFactoryFromArtifact<
            [],
            GreeterContract
          >(greeterArtifact);
          const greeter = await Greeter.deploy();

          assert.strictEqual(await greeter.greet(), "Hi");
          await greeter.setGreeting("Hola");
          assert.strictEqual(await greeter.greet(), "Hola");
        });

        describe("with hardhat's signer", function () {
          it("should return a contract factory connected to the hardhat's signer", async function () {
            const contract =
              await this.env.ethers.getContractFactoryFromArtifact(
                greeterArtifact,
                signers[1]
              );

            assert.isNotNull(contract.interface.getFunction("greet"));
            assert.isNotNull(contract.interface.getFunction("setGreeting"));
            assertIsSigner(contract.runner);

            assert.strictEqual(
              await contract.runner.getAddress(),
              await signers[1].getAddress()
            );
          });
        });
      });

      describe("getContractAt", function () {
        let deployedGreeter: GreeterContract;

        beforeEach(async function () {
          const Greeter = await this.env.ethers.getContractFactory<
            [],
            GreeterContract
          >("Greeter");
          deployedGreeter = await Greeter.deploy();
        });

        describe("by name and address", function () {
          it("Should not throw if address does not belong to a contract", async function () {
            const address = await signers[0].getAddress();
            // shouldn't throw
            await this.env.ethers.getContractAt("Greeter", address);
          });

          it("Should return an instance of a contract", async function () {
            const contract = await this.env.ethers.getContractAt(
              "Greeter",
              deployedGreeter.target
            );

            assert.exists(contract.setGreeting);
            assert.exists(contract.greet);
            assertIsSigner(contract.runner);

            assert.strictEqual(
              await contract.runner.getAddress(),
              await signers[0].getAddress()
            );
          });

          it("Should return an instance of an interface", async function () {
            const contract = await this.env.ethers.getContractAt(
              "IGreeter",
              deployedGreeter.target
            );

            assert.isNotNull(contract.interface.getFunction("greet"));
            assertIsSigner(contract.runner);

            assert.strictEqual(
              await contract.runner.getAddress(),
              await signers[0].getAddress()
            );
          });

          it("Should be able to send txs and make calls", async function () {
            const greeter = await this.env.ethers.getContractAt(
              "Greeter",
              deployedGreeter.target
            );

            assert.strictEqual(await greeter.greet(), "Hi");
            await greeter.setGreeting("Hola");
            assert.strictEqual(await greeter.greet(), "Hola");
          });

          describe("with hardhat's signer", function () {
            it("Should return an instance of a contract associated to a hardhat's signer", async function () {
              const contract = await this.env.ethers.getContractAt(
                "Greeter",
                deployedGreeter.target,
                signers[1]
              );
              assertIsSigner(contract.runner);
              assert.strictEqual(
                await contract.runner.getAddress(),
                await signers[1].getAddress()
              );
            });
          });
        });

        describe("by abi and address", function () {
          it("Should return an instance of a contract", async function () {
            const contract = await this.env.ethers.getContractAt(
              greeterArtifact.abi,
              deployedGreeter.target
            );

            assert.isNotNull(contract.interface.getFunction("greet"));
            assert.isNotNull(contract.interface.getFunction("setGreeting"));
            assertIsSigner(contract.runner);

            assert.strictEqual(
              await contract.runner.getAddress(),
              await signers[0].getAddress()
            );
          });

          it("Should return an instance of an interface", async function () {
            const contract = await this.env.ethers.getContractAt(
              iGreeterArtifact.abi,
              deployedGreeter.target
            );

            assert.isNotNull(contract.interface.getFunction("greet"));
            assertIsSigner(contract.runner);

            assert.strictEqual(
              await contract.runner.getAddress(),
              await signers[0].getAddress()
            );
          });

          it("Should be able to send txs and make calls", async function () {
            const greeter = await this.env.ethers.getContractAt(
              greeterArtifact.abi,
              deployedGreeter.target
            );

            assert.strictEqual(await greeter.greet(), "Hi");
            await greeter.setGreeting("Hola");
            assert.strictEqual(await greeter.greet(), "Hola");
          });

          // TODO re-enable when we make .on("event") work
          // it("Should be able to detect events", async function () {
          //   const greeter = await this.env.ethers.getContractAt(
          //     greeterArtifact.abi,
          //     deployedGreeter.target
          //   );
          //
          //   // at the time of this writing, ethers' default polling interval is
          //   // 4000 ms. here we turn it down in order to speed up this test.
          //   // see also
          //   // https://github.com/ethers-io/ethers.js/issues/615#issuecomment-848991047
          //   // const provider = greeter.provider as any;
          //   // provider.pollingInterval = 100;
          //
          //   let eventEmitted = false;
          //   await greeter.on("GreetingUpdated", () => {
          //     eventEmitted = true;
          //   });
          //
          //   await greeter.setGreeting("Hola");
          //
          //   // wait for 1.5 polling intervals for the event to fire
          //   await new Promise((resolve) => setTimeout(resolve, 10_000));
          //
          //   assert.strictEqual(eventEmitted, true);
          // });

          describe("with hardhat's signer", function () {
            it("Should return an instance of a contract associated to a hardhat's signer", async function () {
              const contract = await this.env.ethers.getContractAt(
                greeterArtifact.abi,
                deployedGreeter.target,
                signers[1]
              );
              assertIsSigner(contract.runner);

              assert.strictEqual(
                await contract.runner.getAddress(),
                await signers[1].getAddress()
              );
            });
          });

          it("should work with linked contracts", async function () {
            const libraryFactory = await this.env.ethers.getContractFactory(
              "TestLibrary"
            );
            const library = await libraryFactory.deploy();

            const contractFactory = await this.env.ethers.getContractFactory<
              [],
              TestContractLib
            >("TestContractLib", {
              libraries: { TestLibrary: library.target },
            });
            const numberPrinter = await contractFactory.deploy();

            const numberPrinterAtAddress = await this.env.ethers.getContractAt(
              "TestContractLib",
              numberPrinter.target
            );

            const someNumber = 50n;
            assert.strictEqual(
              await numberPrinterAtAddress.printNumber.staticCall(someNumber),
              someNumber * 2n
            );
          });
        });
      });

      describe("getContractAtFromArtifact", function () {
        let deployedGreeter: GreeterContract;

        beforeEach(async function () {
          const Greeter = await this.env.ethers.getContractFactory<
            [],
            GreeterContract
          >("Greeter");
          deployedGreeter = await Greeter.deploy();
        });

        describe("by artifact and address", function () {
          it("Should return an instance of a contract", async function () {
            const contract = await this.env.ethers.getContractAtFromArtifact(
              greeterArtifact,
              await deployedGreeter.getAddress()
            );

            assert.isNotNull(contract.interface.getFunction("greet"));
            assert.isNotNull(contract.interface.getFunction("setGreeting"));
            assertIsSigner(contract.runner);

            assert.strictEqual(
              await contract.runner.getAddress(),
              await signers[0].getAddress()
            );
          });

          it("Should be able to send txs and make calls", async function () {
            const greeter = await this.env.ethers.getContractAtFromArtifact(
              greeterArtifact,
              await deployedGreeter.getAddress()
            );

            assert.strictEqual(await greeter.greet(), "Hi");
            await greeter.setGreeting("Hola");
            assert.strictEqual(await greeter.greet(), "Hola");
          });

          describe("with hardhat's signer", function () {
            it("Should return an instance of a contract associated to a hardhat's signer", async function () {
              const contract = await this.env.ethers.getContractAtFromArtifact(
                greeterArtifact,
                await deployedGreeter.getAddress(),
                signers[1]
              );
              assertIsSigner(contract.runner);

              assert.strictEqual(
                await contract.runner.getAddress(),
                await signers[1].getAddress()
              );
            });
          });
        });
      });

      describe("deployContract", function () {
        it("should deploy and return a contract with default signer", async function () {
          const contract = await this.env.ethers.deployContract("Greeter");

          await assertContract(contract, signers[0]);
        });

        it("should deploy and return a contract with hardhat's signer passed directly", async function () {
          const contract = await this.env.ethers.deployContract(
            "Greeter",
            signers[1]
          );

          await assertContract(contract, signers[1]);
        });

        it("should deploy and return a contract with hardhat's signer passed as an option", async function () {
          const contract = await this.env.ethers.deployContract("Greeter", {
            signer: signers[1],
          });

          await assertContract(contract, signers[1]);
        });

        it("should deploy with args and return a contract", async function () {
          const contract = await this.env.ethers.deployContract(
            "GreeterWithConstructorArg",
            ["Hello"]
          );

          await assertContract(contract, signers[0]);
          assert(await contract.greet(), "Hello");
        });

        it("should deploy with args and return a contract with hardhat's signer", async function () {
          const contract = await this.env.ethers.deployContract(
            "GreeterWithConstructorArg",
            ["Hello"],
            signers[1]
          );

          await assertContract(contract, signers[1]);
          assert(await contract.greet(), "Hello");
        });

        it("should deploy with args and return a contract with hardhat's signer as an option", async function () {
          const contract = await this.env.ethers.deployContract(
            "GreeterWithConstructorArg",
            ["Hello"],
            { signer: signers[1] }
          );

          await assertContract(contract, signers[1]);
          assert(await contract.greet(), "Hello");
        });

        it("should accept overrides for the deployment transaction", async function () {
          const contract = await this.env.ethers.deployContract("Greeter", {
            gasLimit: 1_000_000,
          });

          await assertContract(contract, signers[0]);

          const deploymentTx = contract.deploymentTransaction();
          if (deploymentTx === null) {
            assert.fail("Deployment transaction shouldn't be null");
          }

          assert.equal(deploymentTx.gasLimit, 1_000_000n);
        });

        it("should accept overrides for the deployment transaction when there are constructor args", async function () {
          const contract = await this.env.ethers.deployContract(
            "GreeterWithConstructorArg",
            ["Hello"],
            {
              gasLimit: 1_000_000,
            }
          );

          await assertContract(contract, signers[0]);

          const deploymentTx = contract.deploymentTransaction();
          if (deploymentTx === null) {
            assert.fail("Deployment transaction shouldn't be null");
          }

          assert.equal(deploymentTx.gasLimit, 1_000_000n);
        });

        async function assertContract(
          contract: EthersT.Contract,
          signer: HardhatEthersSigner
        ) {
          assert.isNotNull(contract.interface.getFunction("greet"));
          assert.isNotNull(contract.interface.getFunction("setGreeting"));
          assertIsSigner(contract.runner);

          assert.strictEqual(
            await contract.runner.getAddress(),
            await signer.getAddress()
          );
        }
      });
    });
  });

  describe("hardhat", function () {
    useEnvironment("hardhat-project", "hardhat");

    describe("contract events", function () {
      // TODO re-enable when we make .on("event") work
      // it("should be detected", async function () {
      //   const Greeter = await this.env.ethers.getContractFactory("Greeter");
      //   const deployedGreeter: any = await Greeter.deploy();
      //
      //   // at the time of this writing, ethers' default polling interval is
      //   // 4000 ms. here we turn it down in order to speed up this test.
      //   // see also
      //   // https://github.com/ethers-io/ethers.js/issues/615#issuecomment-848991047
      //   // const provider = deployedGreeter.provider as EthersProviderWrapper;
      //   // provider.pollingInterval = 200;
      //
      //   let eventEmitted = false;
      //   deployedGreeter.on("GreetingUpdated", () => {
      //     eventEmitted = true;
      //   });
      //
      //   await deployedGreeter.setGreeting("Hola");
      //
      //   // wait for 1.5 polling intervals for the event to fire
      //   await new Promise((resolve) => setTimeout(resolve, 200 * 2));
      //
      //   assert.strictEqual(eventEmitted, true);
      // });
    });

    describe("hardhat_reset", function () {
      it("should return the correct block number after a hardhat_reset", async function () {
        let blockNumber = await this.env.ethers.provider.getBlockNumber();
        assert.strictEqual(blockNumber.toString(), "0");

        await this.env.ethers.provider.send("evm_mine", []);
        await this.env.ethers.provider.send("evm_mine", []);
        blockNumber = await this.env.ethers.provider.getBlockNumber();
        assert.strictEqual(blockNumber.toString(), "2");

        await this.env.ethers.provider.send("hardhat_reset", []);
        blockNumber = await this.env.ethers.provider.getBlockNumber();
        assert.strictEqual(blockNumber.toString(), "0");
      });

      it("should return the correct block after a hardhat_reset", async function () {
        await this.env.ethers.provider.send("evm_mine", []);

        let blockOne = await this.env.ethers.provider.getBlock(1);
        let blockTwo = await this.env.ethers.provider.getBlock(2);
        assert.isNotNull(blockOne);
        assert.isNull(blockTwo);

        await this.env.ethers.provider.send("hardhat_reset", []);

        blockOne = await this.env.ethers.provider.getBlock(1);
        blockTwo = await this.env.ethers.provider.getBlock(2);
        assert.isNull(blockOne);
        assert.isNull(blockTwo);
      });

      it("should return the correct nonce after a hardhat_reset", async function () {
        const [sig] = await this.env.ethers.getSigners();

        let nonce = await this.env.ethers.provider.getTransactionCount(
          sig.address
        );

        assert.strictEqual(nonce, 0);

        const response = await sig.sendTransaction({
          from: sig.address,
          to: this.env.ethers.ZeroAddress,
          value: "0x1",
        });
        await response.wait();

        nonce = await this.env.ethers.provider.getTransactionCount(sig.address);
        assert.strictEqual(nonce, 1);

        await this.env.ethers.provider.send("hardhat_reset", []);
        nonce = await this.env.ethers.provider.getTransactionCount(sig.address);
        assert.strictEqual(nonce, 0);
      });

      it("should return the correct balance after a hardhat_reset", async function () {
        const [sig] = await this.env.ethers.getSigners();

        let balance = await this.env.ethers.provider.getBalance(sig.address);

        assert.strictEqual(balance.toString(), "10000000000000000000000");

        const response = await sig.sendTransaction({
          from: sig.address,
          to: this.env.ethers.ZeroAddress,
          gasPrice: 8e9,
        });
        await response.wait();

        balance = await this.env.ethers.provider.getBalance(sig.address);
        assert.strictEqual(balance.toString(), "9999999832000000000000");

        await this.env.ethers.provider.send("hardhat_reset", []);
        balance = await this.env.ethers.provider.getBalance(sig.address);
        assert.strictEqual(balance.toString(), "10000000000000000000000");
      });

      it("should return the correct code after a hardhat_reset", async function () {
        const [sig] = await this.env.ethers.getSigners();

        const Greeter = await this.env.ethers.getContractFactory("Greeter");
        const tx = await Greeter.getDeployTransaction();

        const response = await sig.sendTransaction(tx);

        const receipt = await response.wait();
        if (receipt === null) {
          assert.fail("receipt shouldn't be null");
        }
        if (receipt.contractAddress === null) {
          assert.fail("receipt.contractAddress shouldn't be null");
        }

        let code = await this.env.ethers.provider.getCode(
          receipt.contractAddress
        );
        assert.lengthOf(code, 1880);

        await this.env.ethers.provider.send("hardhat_reset", []);

        code = await this.env.ethers.provider.getCode(receipt.contractAddress);
        assert.lengthOf(code, 2);
      });
    });

    describe("evm_revert", function () {
      it("should return the correct block number after a evm_revert", async function () {
        const snapshotId = await this.env.ethers.provider.send(
          "evm_snapshot",
          []
        );
        let blockNumber = await this.env.ethers.provider.getBlockNumber();
        assert.strictEqual(blockNumber.toString(), "0");

        await this.env.ethers.provider.send("evm_mine", []);
        await this.env.ethers.provider.send("evm_mine", []);
        blockNumber = await this.env.ethers.provider.getBlockNumber();
        assert.strictEqual(blockNumber.toString(), "2");

        await this.env.ethers.provider.send("evm_revert", [snapshotId]);
        blockNumber = await this.env.ethers.provider.getBlockNumber();
        assert.strictEqual(blockNumber.toString(), "0");
      });

      it("should return the correct block after a evm_revert", async function () {
        const snapshotId = await this.env.ethers.provider.send(
          "evm_snapshot",
          []
        );
        await this.env.ethers.provider.send("evm_mine", []);

        let blockOne = await this.env.ethers.provider.getBlock(1);
        let blockTwo = await this.env.ethers.provider.getBlock(2);
        assert.isNotNull(blockOne);
        assert.isNull(blockTwo);

        await this.env.ethers.provider.send("evm_revert", [snapshotId]);

        blockOne = await this.env.ethers.provider.getBlock(1);
        blockTwo = await this.env.ethers.provider.getBlock(2);
        assert.isNull(blockOne);
        assert.isNull(blockTwo);
      });

      it("should return the correct nonce after a evm_revert", async function () {
        const snapshotId = await this.env.ethers.provider.send(
          "evm_snapshot",
          []
        );
        const [sig] = await this.env.ethers.getSigners();

        let nonce = await this.env.ethers.provider.getTransactionCount(
          sig.address
        );

        assert.strictEqual(nonce, 0);

        const response = await sig.sendTransaction({
          from: sig.address,
          to: this.env.ethers.ZeroAddress,
          value: "0x1",
        });
        await response.wait();

        nonce = await this.env.ethers.provider.getTransactionCount(sig.address);
        assert.strictEqual(nonce, 1);

        await this.env.ethers.provider.send("evm_revert", [snapshotId]);
        nonce = await this.env.ethers.provider.getTransactionCount(sig.address);
        assert.strictEqual(nonce, 0);
      });

      it("should return the correct balance after a evm_revert", async function () {
        const snapshotId = await this.env.ethers.provider.send(
          "evm_snapshot",
          []
        );
        const [sig] = await this.env.ethers.getSigners();

        let balance = await this.env.ethers.provider.getBalance(sig.address);

        assert.strictEqual(balance.toString(), "10000000000000000000000");

        const response = await sig.sendTransaction({
          from: sig.address,
          to: this.env.ethers.ZeroAddress,
          gasPrice: 8e9,
        });
        await response.wait();

        balance = await this.env.ethers.provider.getBalance(sig.address);
        assert.strictEqual(balance.toString(), "9999999832000000000000");

        await this.env.ethers.provider.send("evm_revert", [snapshotId]);
        balance = await this.env.ethers.provider.getBalance(sig.address);
        assert.strictEqual(balance.toString(), "10000000000000000000000");
      });

      it("should return the correct code after a evm_revert", async function () {
        const snapshotId = await this.env.ethers.provider.send(
          "evm_snapshot",
          []
        );
        const [sig] = await this.env.ethers.getSigners();

        const Greeter = await this.env.ethers.getContractFactory("Greeter");
        const tx = await Greeter.getDeployTransaction();

        const response = await sig.sendTransaction(tx);

        const receipt = await response.wait();

        if (receipt === null) {
          assert.fail("receipt shouldn't be null");
        }
        if (receipt.contractAddress === null) {
          assert.fail("receipt.contractAddress shouldn't be null");
        }

        let code = await this.env.ethers.provider.getCode(
          receipt.contractAddress
        );
        assert.lengthOf(code, 1880);

        await this.env.ethers.provider.send("evm_revert", [snapshotId]);

        code = await this.env.ethers.provider.getCode(receipt.contractAddress);
        assert.lengthOf(code, 2);
      });
    });

    it("signTypedData integration test", async function () {
      // See https://eips.ethereum.org/EIPS/eip-712#parameters
      // There's a json schema and an explanation for each field.
      const typedMessage = {
        domain: {
          chainId: 31337,
          name: "Hardhat Network test suite",
        },
        message: {
          name: "Translation",
          start: {
            x: 200,
            y: 600,
          },
          end: {
            x: 300,
            y: 350,
          },
          cost: 50,
        },
        primaryType: "WeightedVector",
        types: {
          // ethers.js derives the EIP712Domain type from the domain object itself
          // EIP712Domain: [
          //   { name: "name", type: "string" },
          //   { name: "chainId", type: "uint256" },
          // ],
          WeightedVector: [
            { name: "name", type: "string" },
            { name: "start", type: "Point" },
            { name: "end", type: "Point" },
            { name: "cost", type: "uint256" },
          ],
          Point: [
            { name: "x", type: "uint256" },
            { name: "y", type: "uint256" },
          ],
        },
      };
      const [signer] = await this.env.ethers.getSigners();

      const signature = await signer.signTypedData(
        typedMessage.domain,
        typedMessage.types,
        typedMessage.message
      );

      const byteToHex = 2;
      const hexPrefix = 2;
      const signatureSizeInBytes = 65;
      assert.lengthOf(signature, signatureSizeInBytes * byteToHex + hexPrefix);
    });
  });

  describe("hardhat node via WebSocket", function () {
    useEnvironment("hardhat-project", "localhost");
    // TODO re-enable when we make .on("event") work
    // it("should be able to detect events", async function () {
    //   await this.env.run("compile", { quiet: true });
    //
    //   const Greeter = await this.env.ethers.getContractFactory("Greeter");
    //   const deployedGreeter: any = await Greeter.deploy();
    //
    //   const readonlyContract = deployedGreeter.connect(
    //     new ethers.WebSocketProvider("ws://127.0.0.1:8545")
    //   );
    //   let emitted = false;
    //   await readonlyContract.on("GreetingUpdated", () => {
    //     emitted = true;
    //   });
    //
    //   await deployedGreeter.setGreeting("Hola");
    //
    //   // wait for the event to fire
    //   await new Promise((resolve) => setTimeout(resolve, 100));
    //
    //   assert.strictEqual(emitted, true);
    // });
  });
});
