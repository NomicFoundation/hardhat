import type {
  GreeterContract,
  TestContractLib,
} from "./helpers/example-contracts.js";
import type { HardhatEthers, HardhatEthersSigner } from "../src/types.js";
import type {
  Artifact,
  ArtifactManager,
} from "@ignored/hardhat-vnext/types/artifacts";
import type * as EthersT from "ethers";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import {
  assertIsNotNull,
  assertIsSigner,
  initializeTestEthers,
} from "./helpers/helpers.js";

describe("Ethers plugin", () => {
  let ethers: HardhatEthers;
  let artifactManager: ArtifactManager;

  beforeEach(async () => {
    // Declare all the artifacts that we need during the test
    ({ ethers, artifactManager } = await initializeTestEthers([
      { artifactName: "Greeter", fileName: "greeter" },
      { artifactName: "IGreeter", fileName: "igreeter" },
      { artifactName: "TestContractLib", fileName: "test-contract-lib" },
      { artifactName: "TestLibrary", fileName: "test-library" },
      {
        artifactName: "contracts/TestContractLib.sol:TestLibrary",
        fileName: "test-library",
      },
      {
        artifactName: "contracts/TestNonUniqueLib.sol:NonUniqueLibrary",
        fileName: "non-unique-lib",
      },
      {
        artifactName: "TestNonUniqueLib",
        fileName: "test-non-unique-lib",
      },
      {
        artifactName: "contracts/AmbiguousLibrary.sol:AmbiguousLibrary",
        fileName: "ambiguous-library",
      },
      {
        artifactName: "contracts/AmbiguousLibrary2.sol:AmbiguousLibrary",
        fileName: "ambiguous-library",
      },
      {
        artifactName: "TestAmbiguousLib",
        fileName: "test-ambiguous-library",
      },
      {
        artifactName: "GreeterWithConstructorArg",
        fileName: "greeter-with-constructor-arg",
      },
    ]));
  });

  describe("hardhat node", () => {
    describe("Provider", () => {
      it("the provider should handle requests", async () => {
        const accounts = await ethers.provider.send("eth_accounts", []);
        assert.equal(accounts[0], "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
      });
    });

    describe("Signers and contracts helpers", () => {
      let signers: HardhatEthersSigner[];
      let greeterArtifact: Artifact;
      let iGreeterArtifact: Artifact;

      beforeEach(async () => {
        signers = await ethers.getSigners();

        greeterArtifact = await artifactManager.readArtifact("Greeter");
        iGreeterArtifact = await artifactManager.readArtifact("IGreeter");
      });

      describe("getSigners", () => {
        it("should return the signers", async () => {
          const sigs = await ethers.getSigners();
          assert.equal(
            await sigs[0].getAddress(),
            "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          );
        });

        it("should expose the address synchronously", async () => {
          const sigs = await ethers.getSigners();
          assert.equal(
            sigs[0].address,
            "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          );
        });

        it("should return an empty array of signers if `eth_accounts` is deprecated", async () => {
          const originalSend = ethers.provider.send;
          ethers.provider.send = async function (method: string, params: any) {
            if (method === "eth_accounts") {
              throw new Error("the method has been deprecated: eth_accounts");
            }
            return originalSend.call(this, method, params);
          };

          const sigs = await ethers.getSigners();

          assert.deepEqual(sigs, []);
        });
      });

      describe("getImpersonatedSigner", () => {
        it("should return the working impersonated signer", async () => {
          const [signer] = await ethers.getSigners();
          const randomAddress = `0xe7d45f52130a5634f19346a3e5d32994ad821750`;
          const impersonatedSigner =
            await ethers.getImpersonatedSigner(randomAddress);
          assert.equal(impersonatedSigner.address.toLowerCase(), randomAddress);
          // fund impersonated account
          await signer.sendTransaction({
            to: impersonatedSigner,
            value: 10n ** 18n,
          });
          // send a tx from impersonated account
          await impersonatedSigner.sendTransaction({
            to: ethers.ZeroAddress,
            value: 10n ** 17n,
          });
        });
      });

      describe("signer", () => {
        it("should sign a message", async () => {
          const [sig] = await ethers.getSigners();
          const result = await sig.signMessage("hello");
          assert.equal(
            result,
            "0xf16ea9a3478698f695fd1401bfe27e9e4a7e8e3da94aa72b021125e31fa899cc573c48ea3fe1d4ab61a9db10c19032026e3ed2dbccba5a178235ac27f94504311c",
          );
        });

        it("should throw when sign a transaction", async () => {
          const [sig] = await ethers.getSigners();
          const Greeter = await ethers.getContractFactory("Greeter");
          const tx = await Greeter.getDeployTransaction();

          // eslint-disable-next-line no-restricted-syntax -- it tests a non Hardhat error
          await assert.rejects(sig.signTransaction(tx));
        });

        // `signer.getBalance` is not present in ethers v6; we should re-enable
        // this test when/if it's added back
        it.skip("should return the balance of the account", async () => {
          const [sig] = await ethers.getSigners();
          assert.equal(
            // @ts-expect-error -- method not available yet in ethers v6
            (await sig.getBalance()).toString(),
            "100000000000000000000",
          );
        });

        it("should return the balance of the account", async () => {
          // we use the second signer because the first one is used in previous tests
          const [, secondSigner] = await ethers.getSigners();
          assert.equal(
            await ethers.provider.getBalance(secondSigner),
            10_000n * 10n ** 18n,
          );
        });

        it("should return the transaction count of the account", async () => {
          // we use the second signer because the first one is used in previous tests
          const [, secondSigner] = await ethers.getSigners();
          assert.equal(
            await ethers.provider.getTransactionCount(secondSigner),
            0,
          );
        });

        it("should allow to use the estimateGas method", async () => {
          const [sig] = await ethers.getSigners();
          const Greeter = await ethers.getContractFactory("Greeter");
          const tx = await Greeter.getDeployTransaction();
          const result = await sig.estimateGas(tx);
          assert.equal(result > 0n, true);
        });

        it("should allow to use the call method", async () => {
          const [sig] = await ethers.getSigners();
          const Greeter = await ethers.getContractFactory("Greeter");
          const tx = await Greeter.getDeployTransaction();
          const result = await sig.call(tx);
          assert.equal(typeof result === "string", true);
        });

        it("should send a transaction", async () => {
          const [sig] = await ethers.getSigners();
          const Greeter = await ethers.getContractFactory("Greeter");
          const tx = await Greeter.getDeployTransaction();
          const response = await sig.sendTransaction(tx);
          const receipt = await response.wait();
          if (receipt === null) {
            assert.fail("receipt shoudn't be null");
          }
          assert.equal(receipt.status, 1);
        });

        it("should get the chainId", async () => {
          const { chainId } = await ethers.provider.getNetwork();
          assert.equal(chainId, 31337n);
        });

        it("should get the gas price", async () => {
          const feeData = await ethers.provider.getFeeData();

          assertIsNotNull(feeData.gasPrice);

          assert.equal(feeData.gasPrice > 0, true);
        });

        it("should populate a transaction", async () => {
          const [sig] = await ethers.getSigners();
          const Greeter = await ethers.getContractFactory("Greeter");
          const tx = await Greeter.getDeployTransaction();
          const populatedTransaction = await sig.populateTransaction(tx);
          assert.equal(populatedTransaction.from, sig.address);
        });
      });

      describe("getContractFactory", () => {
        describe("By name", () => {
          it("should return a contract factory", async () => {
            // It's already compiled in artifacts/
            const contract = await ethers.getContractFactory("Greeter");

            assert.notEqual(contract.interface.getFunction("greet"), null);
            assert.notEqual(
              contract.interface.getFunction("setGreeting"),
              null,
            );

            // non-existent functions should be null
            assert.equal(contract.interface.getFunction("doesntExist"), null);

            assertIsSigner(contract.runner);

            assert.equal(
              await contract.runner.getAddress(),
              await signers[0].getAddress(),
            );
          });

          it("should fail to return a contract factory for an interface", async () => {
            await assertRejectsWithHardhatError(
              ethers.getContractFactory("IGreeter"),
              HardhatError.ERRORS.ETHERS.INVALID_ABSTRACT_CONTRACT_FOR_FACTORY,
              {
                contractName: "IGreeter",
              },
            );
          });

          it("should link a library", async () => {
            const libraryFactory =
              await ethers.getContractFactory("TestLibrary");
            const library = await libraryFactory.deploy();

            const contractFactory = await ethers.getContractFactory<
              [],
              TestContractLib
            >("TestContractLib", {
              libraries: { TestLibrary: library.target },
            });

            assertIsSigner(contractFactory.runner);

            assert.equal(
              await contractFactory.runner.getAddress(),
              await signers[0].getAddress(),
            );

            const numberPrinter = await contractFactory.deploy();
            const someNumber = 50n;

            assert.equal(
              await numberPrinter.printNumber.staticCall(someNumber),
              someNumber * 2n,
            );
          });

          it("should fail to link when passing in an ambiguous library link", async () => {
            const libraryFactory = await ethers.getContractFactory(
              "contracts/TestContractLib.sol:TestLibrary",
            );
            const library = await libraryFactory.deploy();

            await assertRejectsWithHardhatError(
              ethers.getContractFactory("TestContractLib", {
                libraries: {
                  TestLibrary: await library.getAddress(),
                  "contracts/TestContractLib.sol:TestLibrary":
                    await library.getAddress(),
                },
              }),
              HardhatError.ERRORS.ETHERS.REFERENCE_TO_SAME_LIBRARY,
              {
                linkedLibraryName1: "TestLibrary",
                linkedLibraryName2: "contracts/TestContractLib.sol:TestLibrary",
              },
            );
          });

          it("should link a library even if there's an identically named library in the project", async () => {
            const libraryFactory = await ethers.getContractFactory(
              "contracts/TestNonUniqueLib.sol:NonUniqueLibrary",
            );

            const library = await libraryFactory.deploy();
            const contractFactory = await ethers.getContractFactory(
              "TestNonUniqueLib",
              { libraries: { NonUniqueLibrary: await library.getAddress() } },
            );

            assertIsSigner(contractFactory.runner);
            assert.equal(
              await contractFactory.runner.getAddress(),
              await signers[0].getAddress(),
            );
          });

          it("should fail to link an ambiguous library", async () => {
            const libraryFactory = await ethers.getContractFactory(
              "contracts/AmbiguousLibrary.sol:AmbiguousLibrary",
            );
            const library = await libraryFactory.deploy();

            const library2Factory = await ethers.getContractFactory(
              "contracts/AmbiguousLibrary2.sol:AmbiguousLibrary",
            );
            const library2 = await library2Factory.deploy();

            await assertRejectsWithHardhatError(
              ethers.getContractFactory("TestAmbiguousLib", {
                libraries: {
                  AmbiguousLibrary: await library.getAddress(),
                  "contracts/AmbiguousLibrary2.sol:AmbiguousLibrary":
                    await library2.getAddress(),
                },
              }),
              HardhatError.ERRORS.ETHERS.AMBIGUOUS_LIBRARY_NAME,
              {
                linkedLibraryName: "AmbiguousLibrary",
                contractName: "TestAmbiguousLib",
                matchingNeededLibrariesFQNs:
                  "* contracts/AmbiguousLibrary.sol:AmbiguousLibrary\n* contracts/AmbiguousLibrary2.sol:AmbiguousLibrary",
              },
            );
          });

          it("should fail to create a contract factory with missing libraries", async () => {
            await assertRejectsWithHardhatError(
              ethers.getContractFactory("TestContractLib"),
              HardhatError.ERRORS.ETHERS.MISSING_LINK_FOR_LIBRARY,
              {
                contractName: "TestContractLib",
                missingLibraries: "* contracts/TestContractLib.sol:TestLibrary",
              },
            );
          });

          it("should fail to create a contract factory with an invalid address", async () => {
            const notAnAddress = "definitely not an address";

            await assertRejectsWithHardhatError(
              ethers.getContractFactory("TestContractLib", {
                libraries: { TestLibrary: notAnAddress },
              }),
              HardhatError.ERRORS.ETHERS
                .INVALID_ADDRESS_TO_LINK_CONTRACT_TO_LIBRARY,
              {
                contractName: "TestContractLib",
                linkedLibraryName: "TestLibrary",
                resolvedAddress: notAnAddress,
              },
            );
          });

          it("should contract instances as libraries", async () => {
            const libraryFactory =
              await ethers.getContractFactory("TestLibrary");
            const library = await libraryFactory.deploy();
            await ethers.getContractFactory("TestContractLib", {
              libraries: { TestLibrary: library },
            });
          });

          it("Should be able to send txs and make calls", async () => {
            const Greeter = await ethers.getContractFactory<
              [],
              GreeterContract
            >("Greeter");
            const greeter = await Greeter.deploy();
            assert.equal(await greeter.greet(), "Hi");
            await greeter.setGreeting("Hola");
            assert.equal(await greeter.greet(), "Hola");
          });

          describe("with hardhat's signer", () => {
            it("should return a contract factory connected to the hardhat's signer", async () => {
              // It's already compiled in artifacts/
              const contract = await ethers.getContractFactory(
                "Greeter",
                signers[1],
              );
              assert.notEqual(contract.interface.getFunction("greet"), null);
              assert.notEqual(
                contract.interface.getFunction("setGreeting"),
                null,
              );

              assertIsSigner(contract.runner);

              assert.equal(
                await contract.runner.getAddress(),
                await signers[1].getAddress(),
              );
            });
          });
        });

        describe("by abi and bytecode", () => {
          it("should return a contract factory", async () => {
            // It's already compiled in artifacts/
            const contract = await ethers.getContractFactory(
              greeterArtifact.abi,
              greeterArtifact.bytecode,
            );
            assert.notEqual(contract.interface.getFunction("greet"), null);
            assert.notEqual(
              contract.interface.getFunction("setGreeting"),
              null,
            );

            assertIsSigner(contract.runner);

            assert.equal(
              await contract.runner.getAddress(),
              await signers[0].getAddress(),
            );
          });

          it("should return a contract factory for an interface", async () => {
            const contract = await ethers.getContractFactory(
              iGreeterArtifact.abi,
              iGreeterArtifact.bytecode,
            );
            assert.equal(contract.bytecode, "0x");
            assert.notEqual(contract.interface.getFunction("greet"), null);
            assertIsSigner(contract.runner);
            assert.equal(
              await contract.runner.getAddress(),
              await signers[0].getAddress(),
            );
          });

          it("Should be able to send txs and make calls", async () => {
            const Greeter = await ethers.getContractFactory<
              [],
              GreeterContract
            >(greeterArtifact.abi, greeterArtifact.bytecode);
            const greeter = await Greeter.deploy();
            assert.equal(await greeter.greet(), "Hi");
            await greeter.setGreeting("Hola");
            assert.equal(await greeter.greet(), "Hola");
          });

          describe("with hardhat's signer", () => {
            it("should return a contract factory connected to the hardhat's signer", async () => {
              // It's already compiled in artifacts/
              const contract = await ethers.getContractFactory(
                greeterArtifact.abi,
                greeterArtifact.bytecode,
                signers[1],
              );

              assert.notEqual(contract.interface.getFunction("greet"), null);
              assert.notEqual(
                contract.interface.getFunction("setGreeting"),
                null,
              );

              assertIsSigner(contract.runner);

              assert.equal(
                await contract.runner.getAddress(),
                await signers[1].getAddress(),
              );
            });
          });
        });
      });

      describe("getContractFactoryFromArtifact", () => {
        it("should return a contract factory", async () => {
          const contract =
            await ethers.getContractFactoryFromArtifact(greeterArtifact);

          assert.notEqual(contract.interface.getFunction("greet"), null);
          assert.notEqual(contract.interface.getFunction("setGreeting"), null);

          assertIsSigner(contract.runner);

          assert.equal(
            await contract.runner.getAddress(),
            await signers[0].getAddress(),
          );
        });

        it("should link a library", async () => {
          const libraryFactory = await ethers.getContractFactory("TestLibrary");
          const library = await libraryFactory.deploy();
          const testContractLibArtifact =
            await artifactManager.readArtifact("TestContractLib");
          const contractFactory = await ethers.getContractFactoryFromArtifact<
            [],
            TestContractLib
          >(testContractLibArtifact, {
            libraries: { TestLibrary: await library.getAddress() },
          });

          assertIsSigner(contractFactory.runner);

          assert.equal(
            await contractFactory.runner.getAddress(),
            await signers[0].getAddress(),
          );

          const numberPrinter = await contractFactory.deploy();
          const someNumber = 50n;

          assert.equal(
            await numberPrinter.printNumber.staticCall(someNumber),
            someNumber * 2n,
          );
        });

        it("Should be able to send txs and make calls", async () => {
          const Greeter = await ethers.getContractFactoryFromArtifact<
            [],
            GreeterContract
          >(greeterArtifact);
          const greeter = await Greeter.deploy();
          assert.equal(await greeter.greet(), "Hi");
          await greeter.setGreeting("Hola");
          assert.equal(await greeter.greet(), "Hola");
        });

        describe("with hardhat's signer", () => {
          it("should return a contract factory connected to the hardhat's signer", async () => {
            const contract = await ethers.getContractFactoryFromArtifact(
              greeterArtifact,
              signers[1],
            );
            assert.notEqual(contract.interface.getFunction("greet"), null);
            assert.notEqual(
              contract.interface.getFunction("setGreeting"),
              null,
            );

            assertIsSigner(contract.runner);

            assert.equal(
              await contract.runner.getAddress(),
              await signers[1].getAddress(),
            );
          });
        });
      });

      describe("getContractAt", () => {
        let deployedGreeter: GreeterContract;
        beforeEach(async () => {
          const Greeter = await ethers.getContractFactory<[], GreeterContract>(
            "Greeter",
          );
          deployedGreeter = await Greeter.deploy();
        });

        describe("by name and address", () => {
          it("Should not throw if address does not belong to a contract", async () => {
            const address = await signers[0].getAddress();
            // shouldn't throw
            await ethers.getContractAt("Greeter", address);
          });

          it("Should return an instance of a contract", async () => {
            const contract = await ethers.getContractAt(
              "Greeter",
              deployedGreeter.target,
            );

            assert.notEqual(contract.setGreeting, undefined);
            assert.notEqual(contract.greet, undefined);

            assertIsSigner(contract.runner);

            assert.equal(
              await contract.runner.getAddress(),
              await signers[0].getAddress(),
            );
          });

          it("Should return an instance of an interface", async () => {
            const contract = await ethers.getContractAt(
              "IGreeter",
              deployedGreeter.target,
            );
            assert.notEqual(contract.interface.getFunction("greet"), null);
            assertIsSigner(contract.runner);
            assert.equal(
              await contract.runner.getAddress(),
              await signers[0].getAddress(),
            );
          });

          it("Should be able to send txs and make calls", async () => {
            const greeter = await ethers.getContractAt(
              "Greeter",
              deployedGreeter.target,
            );
            assert.equal(await greeter.greet(), "Hi");
            await greeter.setGreeting("Hola");
            assert.equal(await greeter.greet(), "Hola");
          });

          describe("with hardhat's signer", () => {
            it("Should return an instance of a contract associated to a hardhat's signer", async () => {
              const contract = await ethers.getContractAt(
                "Greeter",
                deployedGreeter.target,
                signers[1],
              );
              assertIsSigner(contract.runner);
              assert.equal(
                await contract.runner.getAddress(),
                await signers[1].getAddress(),
              );
            });
          });
        });

        describe("by abi and address", () => {
          it("Should return an instance of a contract", async () => {
            const contract = await ethers.getContractAt(
              greeterArtifact.abi,
              deployedGreeter.target,
            );

            assert.notEqual(contract.interface.getFunction("greet"), null);
            assert.notEqual(
              contract.interface.getFunction("setGreeting"),
              null,
            );

            assertIsSigner(contract.runner);

            assert.equal(
              await contract.runner.getAddress(),
              await signers[0].getAddress(),
            );
          });

          it("Should return an instance of an interface", async () => {
            const contract = await ethers.getContractAt(
              iGreeterArtifact.abi,
              deployedGreeter.target,
            );
            assert.notEqual(contract.interface.getFunction("greet"), null);

            assertIsSigner(contract.runner);

            assert.equal(
              await contract.runner.getAddress(),
              await signers[0].getAddress(),
            );
          });

          it("Should be able to send txs and make calls", async () => {
            const greeter = await ethers.getContractAt(
              greeterArtifact.abi,
              deployedGreeter.target,
            );

            assert.equal(await greeter.greet(), "Hi");

            await greeter.setGreeting("Hola");

            assert.equal(await greeter.greet(), "Hola");
          });

          // TODO re-enable when we make .on("event") work
          // it("Should be able to detect events", async ()=> {
          //   const greeter = await ethers.getContractAt(
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
          //   assert.equal(eventEmitted, true);
          // });

          describe("with hardhat's signer", () => {
            it("Should return an instance of a contract associated to a hardhat's signer", async () => {
              const contract = await ethers.getContractAt(
                greeterArtifact.abi,
                deployedGreeter.target,
                signers[1],
              );

              assertIsSigner(contract.runner);

              assert.equal(
                await contract.runner.getAddress(),
                await signers[1].getAddress(),
              );
            });
          });

          it("should work with linked contracts", async () => {
            const libraryFactory =
              await ethers.getContractFactory("TestLibrary");
            const library = await libraryFactory.deploy();
            const contractFactory = await ethers.getContractFactory<
              [],
              TestContractLib
            >("TestContractLib", {
              libraries: { TestLibrary: library.target },
            });

            const numberPrinter = await contractFactory.deploy();
            const numberPrinterAtAddress = await ethers.getContractAt(
              "TestContractLib",
              numberPrinter.target,
            );

            const someNumber = 50n;
            assert.equal(
              await numberPrinterAtAddress.printNumber.staticCall(someNumber),
              someNumber * 2n,
            );
          });
        });
      });

      describe("getContractAtFromArtifact", () => {
        let deployedGreeter: GreeterContract;

        beforeEach(async () => {
          const Greeter = await ethers.getContractFactory<[], GreeterContract>(
            "Greeter",
          );
          deployedGreeter = await Greeter.deploy();
        });

        describe("by artifact and address", () => {
          it("Should return an instance of a contract", async () => {
            const contract = await ethers.getContractAtFromArtifact(
              greeterArtifact,
              await deployedGreeter.getAddress(),
            );
            assert.notEqual(contract.interface.getFunction("greet"), null);
            assert.notEqual(
              contract.interface.getFunction("setGreeting"),
              null,
            );

            assertIsSigner(contract.runner);

            assert.equal(
              await contract.runner.getAddress(),
              await signers[0].getAddress(),
            );
          });

          it("Should be able to send txs and make calls", async () => {
            const greeter = await ethers.getContractAtFromArtifact(
              greeterArtifact,
              await deployedGreeter.getAddress(),
            );

            assert.equal(await greeter.greet(), "Hi");

            await greeter.setGreeting("Hola");

            assert.equal(await greeter.greet(), "Hola");
          });

          describe("with hardhat's signer", () => {
            it("Should return an instance of a contract associated to a hardhat's signer", async () => {
              const contract = await ethers.getContractAtFromArtifact(
                greeterArtifact,
                await deployedGreeter.getAddress(),
                signers[1],
              );

              assertIsSigner(contract.runner);

              assert.equal(
                await contract.runner.getAddress(),
                await signers[1].getAddress(),
              );
            });
          });
        });
      });

      describe("deployContract", () => {
        it("should deploy and return a contract with default signer", async () => {
          const contract = await ethers.deployContract("Greeter");
          await assertContract(contract, signers[0]);
        });

        it("should deploy and return a contract with hardhat's signer passed directly", async () => {
          const contract = await ethers.deployContract("Greeter", signers[1]);
          await assertContract(contract, signers[1]);
        });

        it("should deploy and return a contract with hardhat's signer passed as an option", async () => {
          const contract = await ethers.deployContract("Greeter", {
            signer: signers[1],
          });
          await assertContract(contract, signers[1]);
        });

        it("should deploy with args and return a contract", async () => {
          const contract = await ethers.deployContract(
            "GreeterWithConstructorArg",
            ["Hello"],
          );

          await assertContract(contract, signers[0]);

          assert.equal(await contract.greet(), "Hello");
        });

        it("should deploy with args and return a contract with hardhat's signer", async () => {
          const contract = await ethers.deployContract(
            "GreeterWithConstructorArg",
            ["Hello"],
            signers[1],
          );

          await assertContract(contract, signers[1]);

          assert.equal(await contract.greet(), "Hello");
        });

        it("should deploy with args and return a contract with hardhat's signer as an option", async () => {
          const contract = await ethers.deployContract(
            "GreeterWithConstructorArg",
            ["Hello"],
            { signer: signers[1] },
          );
          await assertContract(contract, signers[1]);
          assert.equal(await contract.greet(), "Hello");
        });

        it("should accept overrides for the deployment transaction", async () => {
          const contract = await ethers.deployContract("Greeter", {
            gasLimit: 1_000_000,
          });

          await assertContract(contract, signers[0]);

          const deploymentTx = contract.deploymentTransaction();
          if (deploymentTx === null) {
            assert.fail("Deployment transaction shouldn't be null");
          }

          assert.equal(deploymentTx.gasLimit, 1_000_000n);
        });

        it("should accept overrides for the deployment transaction when there are constructor args", async () => {
          const contract = await ethers.deployContract(
            "GreeterWithConstructorArg",
            ["Hello"],
            {
              gasLimit: 1_000_000,
            },
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
          signer: HardhatEthersSigner,
        ) {
          assert.notEqual(contract.interface.getFunction("greet"), null);
          assert.notEqual(contract.interface.getFunction("setGreeting"), null);

          assertIsSigner(contract.runner);

          assert.equal(
            await contract.runner.getAddress(),
            await signer.getAddress(),
          );
        }
      });
    });
  });

  describe("hardhat", () => {
    describe("contract events", () => {
      // TODO re-enable when we make .on("event") work
      // it("should be detected", async ()=> {
      //   const Greeter = await ethers.getContractFactory("Greeter");
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
      //   assert.equal(eventEmitted, true);
      // });
    });

    describe("hardhat_reset", () => {
      it("should return the correct block number after a hardhat_reset", async () => {
        let blockNumber = await ethers.provider.getBlockNumber();
        assert.equal(blockNumber.toString(), "0");

        await ethers.provider.send("evm_mine", []);
        await ethers.provider.send("evm_mine", []);
        blockNumber = await ethers.provider.getBlockNumber();
        assert.equal(blockNumber.toString(), "2");

        await ethers.provider.send("hardhat_reset", []);
        blockNumber = await ethers.provider.getBlockNumber();
        assert.equal(blockNumber.toString(), "0");
      });

      it("should return the correct block after a hardhat_reset", async () => {
        await ethers.provider.send("evm_mine", []);

        let blockOne = await ethers.provider.getBlock(1);
        let blockTwo = await ethers.provider.getBlock(2);
        assert.notEqual(blockOne, null);
        assert.equal(blockTwo, null);

        await ethers.provider.send("hardhat_reset", []);

        blockOne = await ethers.provider.getBlock(1);
        blockTwo = await ethers.provider.getBlock(2);
        assert.equal(blockOne, null);
        assert.equal(blockTwo, null);
      });

      it("should return the correct nonce after a hardhat_reset", async () => {
        const [sig] = await ethers.getSigners();

        let nonce = await ethers.provider.getTransactionCount(sig.address);

        assert.equal(nonce, 0);

        const response = await sig.sendTransaction({
          from: sig.address,
          to: ethers.ZeroAddress,
          value: "0x1",
        });
        await response.wait();

        nonce = await ethers.provider.getTransactionCount(sig.address);
        assert.equal(nonce, 1);

        await ethers.provider.send("hardhat_reset", []);
        nonce = await ethers.provider.getTransactionCount(sig.address);
        assert.equal(nonce, 0);
      });

      it("should return the correct balance after a hardhat_reset", async () => {
        const [sig] = await ethers.getSigners();

        let balance = await ethers.provider.getBalance(sig.address);

        assert.equal(balance.toString(), "10000000000000000000000");

        const response = await sig.sendTransaction({
          from: sig.address,
          to: ethers.ZeroAddress,
          gasPrice: 8e9,
        });
        await response.wait();

        balance = await ethers.provider.getBalance(sig.address);
        assert.equal(balance.toString(), "9999999832000000000000");

        await ethers.provider.send("hardhat_reset", []);
        balance = await ethers.provider.getBalance(sig.address);
        assert.equal(balance.toString(), "10000000000000000000000");
      });

      it("should return the correct code after a hardhat_reset", async () => {
        const [sig] = await ethers.getSigners();

        const Greeter = await ethers.getContractFactory("Greeter");
        const tx = await Greeter.getDeployTransaction();

        const response = await sig.sendTransaction(tx);

        const receipt = await response.wait();
        if (receipt === null) {
          assert.fail("receipt shoudn't be null");
        }
        if (receipt.contractAddress === null) {
          assert.fail("receipt.contractAddress shoudn't be null");
        }

        let code = await ethers.provider.getCode(receipt.contractAddress);
        assert.equal(code.length, 1880);

        await ethers.provider.send("hardhat_reset", []);

        code = await ethers.provider.getCode(receipt.contractAddress);
        assert.equal(code.length, 2);
      });
    });

    describe("evm_revert", () => {
      it("should return the correct block number after a evm_revert", async () => {
        const snapshotId = await ethers.provider.send("evm_snapshot", []);
        let blockNumber = await ethers.provider.getBlockNumber();
        assert.equal(blockNumber.toString(), "0");

        await ethers.provider.send("evm_mine", []);
        await ethers.provider.send("evm_mine", []);
        blockNumber = await ethers.provider.getBlockNumber();
        assert.equal(blockNumber.toString(), "2");

        await ethers.provider.send("evm_revert", [snapshotId]);
        blockNumber = await ethers.provider.getBlockNumber();
        assert.equal(blockNumber.toString(), "0");
      });

      it("should return the correct block after a evm_revert", async () => {
        const snapshotId = await ethers.provider.send("evm_snapshot", []);
        await ethers.provider.send("evm_mine", []);

        let blockOne = await ethers.provider.getBlock(1);
        let blockTwo = await ethers.provider.getBlock(2);
        assert.notEqual(blockOne, null);
        assert.equal(blockTwo, null);

        await ethers.provider.send("evm_revert", [snapshotId]);

        blockOne = await ethers.provider.getBlock(1);
        blockTwo = await ethers.provider.getBlock(2);
        assert.equal(blockOne, null);
        assert.equal(blockTwo, null);
      });

      it("should return the correct nonce after a evm_revert", async () => {
        const snapshotId = await ethers.provider.send("evm_snapshot", []);
        const [sig] = await ethers.getSigners();

        let nonce = await ethers.provider.getTransactionCount(sig.address);

        assert.equal(nonce, 0);

        const response = await sig.sendTransaction({
          from: sig.address,
          to: ethers.ZeroAddress,
          value: "0x1",
        });
        await response.wait();

        nonce = await ethers.provider.getTransactionCount(sig.address);
        assert.equal(nonce, 1);

        await ethers.provider.send("evm_revert", [snapshotId]);
        nonce = await ethers.provider.getTransactionCount(sig.address);
        assert.equal(nonce, 0);
      });

      it("should return the correct balance after a evm_revert", async () => {
        const snapshotId = await ethers.provider.send("evm_snapshot", []);
        const [sig] = await ethers.getSigners();

        let balance = await ethers.provider.getBalance(sig.address);

        assert.equal(balance.toString(), "10000000000000000000000");

        const response = await sig.sendTransaction({
          from: sig.address,
          to: ethers.ZeroAddress,
          gasPrice: 8e9,
        });
        await response.wait();

        balance = await ethers.provider.getBalance(sig.address);
        assert.equal(balance.toString(), "9999999832000000000000");

        await ethers.provider.send("evm_revert", [snapshotId]);
        balance = await ethers.provider.getBalance(sig.address);
        assert.equal(balance.toString(), "10000000000000000000000");
      });

      it("should return the correct code after a evm_revert", async () => {
        const snapshotId = await ethers.provider.send("evm_snapshot", []);
        const [sig] = await ethers.getSigners();

        const Greeter = await ethers.getContractFactory("Greeter");
        const tx = await Greeter.getDeployTransaction();

        const response = await sig.sendTransaction(tx);

        const receipt = await response.wait();

        if (receipt === null) {
          assert.fail("receipt shoudn't be null");
        }
        if (receipt.contractAddress === null) {
          assert.fail("receipt.contractAddress shoudn't be null");
        }

        let code = await ethers.provider.getCode(receipt.contractAddress);
        assert.equal(code.length, 1880);

        await ethers.provider.send("evm_revert", [snapshotId]);

        code = await ethers.provider.getCode(receipt.contractAddress);
        assert.equal(code.length, 2);
      });
    });

    it("signTypedData integration test", async () => {
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
      const [signer] = await ethers.getSigners();

      const signature = await signer.signTypedData(
        typedMessage.domain,
        typedMessage.types,
        typedMessage.message,
      );

      const byteToHex = 2;
      const hexPrefix = 2;
      const signatureSizeInBytes = 65;
      assert.equal(
        signature.length,
        signatureSizeInBytes * byteToHex + hexPrefix,
      );
    });
  });

  describe("hardhat node via WebSocket", () => {
    // TODO re-enable when we make .on("event") work
    // useEnvironment("hardhat-project", "localhost");
    // it("should be able to detect events", async ()=> {
    //   await this.env.run("compile", { quiet: true });
    //
    //   const Greeter = await ethers.getContractFactory("Greeter");
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
    //   assert.equal(emitted, true);
    // });
  });
});
