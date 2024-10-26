import type { JsonFragment } from "@ethersproject/abi";
import type { SolidityConfig } from "hardhat/types";
import type { ChainConfig } from "../../src/types";

import path from "path";
import { assert, expect } from "chai";
import sinon from "sinon";
import picocolors from "picocolors";

import {
  encodeArguments,
  getCompilerVersions,
  printSupportedNetworks,
  printVerificationErrors,
  resolveConstructorArguments,
  resolveLibraries,
} from "../../src/internal/utilities";
import { HardhatVerifyError } from "../../src/internal/errors";
import { builtinChains } from "../../src/internal/chain-config";

describe("Utilities", () => {
  describe("printSupportedNetworks", () => {
    it("should print supported and custom networks", async () => {
      const customChains: ChainConfig[] = [
        {
          network: "MyNetwork",
          chainId: 1337,
          urls: {
            apiURL: "https://api.mynetwork.io/api",
            browserURL: "https://mynetwork.io",
          },
        },
      ];

      const logStub = sinon.stub(console, "log");

      await printSupportedNetworks(customChains);

      sinon.restore();

      assert.isTrue(logStub.calledOnce);
      const actualTableOutput = logStub.getCall(0).args[0];
      const allChains = [...builtinChains, ...customChains];
      allChains.forEach(({ network, chainId }) => {
        const regex = new RegExp(`║\\s*${network}\\s*│\\s*${chainId}\\s*║`);
        assert.isTrue(regex.test(actualTableOutput));
      });
    });
  });

  describe("printVerificationErrors", () => {
    it("should print verification errors", () => {
      const errors: Record<string, HardhatVerifyError> = {
        Etherscan: new HardhatVerifyError("Etherscan error message"),
        Sourcify: new HardhatVerifyError("Sourcify error message"),
      };

      const errorStub = sinon.stub(console, "error");

      printVerificationErrors(errors);

      sinon.restore();

      assert.isTrue(errorStub.calledOnce);
      const errorMessage = errorStub.getCall(0).args[0];
      assert.equal(
        errorMessage,
        picocolors.red(
          `hardhat-verify found one or more errors during the verification process:

Etherscan:
Etherscan error message

Sourcify:
Sourcify error message

`
        )
      );
    });
  });

  describe("resolveConstructorArguments", () => {
    it("should return the constructorArgsParams if constructorArgsModule is not defined", async () => {
      const constructorArgsParams = ["1", "arg2", "false"];
      const result = await resolveConstructorArguments(constructorArgsParams);

      assert.equal(constructorArgsParams, result);
    });

    it("should return the constructor arguments exported in constructorArgsModule", async () => {
      const constructorArgsModule = "test/unit/mocks/valid-constructor-args.js";
      const expected = [
        50,
        "a string argument",
        {
          x: 10,
          y: 5,
        },
        "0xabcdef",
      ];
      const result = await resolveConstructorArguments(
        [],
        constructorArgsModule
      );

      assert.deepEqual(result, expected);
    });

    it("should throw if constructorArgsModule can't be imported", async () => {
      await expect(
        resolveConstructorArguments([], "not-a-valid-path.js")
      ).to.be.rejectedWith(/Cannot find module/);
    });

    it("should throw if the constructor arguments exported in constructorArgsModule are not an array", async () => {
      const constructorArgsModule =
        "test/unit/mocks/invalid-constructor-args.js";
      const constructorArgsModulePath = path
        .resolve(process.cwd(), constructorArgsModule)
        // make test work on windows
        .replace(/\\/g, "\\\\");
      await expect(
        resolveConstructorArguments([], constructorArgsModule)
      ).to.be.rejectedWith(
        new RegExp(
          `The module ${constructorArgsModulePath} doesn't export a list.`
        )
      );
    });

    it("should throw an error if both parameters are provided", async () => {
      const constructorArgsParams = ["1", "arg2", "false"];
      const constructorArgsModule = "test/unit/mocks/valid-constructor-args.js";
      await expect(
        resolveConstructorArguments(
          constructorArgsParams,
          constructorArgsModule
        )
      ).to.be.rejectedWith(
        "The parameters constructorArgsParams and constructorArgsModule are exclusive. Please provide only one of them."
      );
    });
  });

  describe("resolveLibraries", () => {
    it("should return an empty object if librariesModule is not defined", async () => {
      const result = await resolveLibraries();

      assert.deepEqual(result, {});
    });

    it("should return the library dictionary exported in librariesModule", async () => {
      const librariesModule = "test/unit/mocks/valid-libraries.js";
      const expected = {
        SomeLibrary: "0x...",
        AnotherLibrary: "0x...",
      };

      const result = await resolveLibraries(librariesModule);

      assert.deepEqual(result, expected);
    });

    it("should throw if librariesModule can't be imported", async () => {
      await expect(resolveLibraries("not-a-valid-path.js")).to.be.rejectedWith(
        /Cannot find module/
      );
    });

    it("should throw if the libraries exported in librariesModule are not a dictionary", async () => {
      const librariesModule = "test/unit/mocks/invalid-libraries.js";
      const librariesModulePath = path
        .resolve(process.cwd(), librariesModule)
        // make test work on windows
        .replace(/\\/g, "\\\\");

      await expect(resolveLibraries(librariesModule)).to.be.rejectedWith(
        new RegExp(
          `The module ${librariesModulePath} doesn't export a dictionary.`
        )
      );
    });
  });

  describe("getCompilerVersions", () => {
    it("should return the list of compiler versions defined in the hardhat config (compilers + overrides)", async () => {
      const solidityConfig: SolidityConfig = {
        compilers: [
          {
            version: "0.8.18",
            settings: {},
          },
          {
            version: "0.7.2",
            settings: {},
          },
        ],
        overrides: {
          "contracts/Foo.sol": {
            version: "0.5.5",
            settings: {},
          },
          "contracts/Bar.sol": {
            version: "0.6.4",
            settings: {},
          },
        },
      };
      const expected = ["0.8.18", "0.7.2", "0.5.5", "0.6.4"];
      const compilerVersions = await getCompilerVersions(solidityConfig);
      assert.deepEqual(compilerVersions, expected);
    });

    it("should return the list of compiler versions defined in the hardhat config (compilers - no overrides)", async () => {
      const solidityConfig = {
        compilers: [
          {
            version: "0.8.18",
            settings: {},
          },
          {
            version: "0.7.2",
            settings: {},
          },
          {
            version: "0.4.11",
            settings: {},
          },
        ],
        overrides: {},
      };
      const expected = ["0.8.18", "0.7.2", "0.4.11"];
      const compilerVersions = await getCompilerVersions(solidityConfig);
      assert.deepEqual(compilerVersions, expected);
    });

    it("should return the list of compiler versions defined in the hardhat config (compilers + overrides (dup))", async () => {
      const solidityConfig = {
        compilers: [
          {
            version: "0.8.18",
            settings: {},
          },
        ],
        overrides: {
          "contracts/Foo.sol": {
            version: "0.8.18",
            settings: {},
          },
        },
      };
      const expected = ["0.8.18", "0.8.18"];
      const compilerVersions = await getCompilerVersions(solidityConfig);
      assert.deepEqual(compilerVersions, expected);
    });

    it("should throw if any version is below Etherscan supported version (compilers)", async () => {
      const solidityConfig = {
        compilers: [
          {
            version: "0.8.18",
            settings: {},
          },
          {
            version: "0.4.10",
            settings: {},
          },
        ],
        overrides: {
          "contracts/Foo.sol": {
            version: "0.8.15",
            settings: {},
          },
        },
      };

      await expect(getCompilerVersions(solidityConfig)).to.be.rejectedWith(
        /Etherscan only supports compiler versions 0.4.11 and higher/
      );
    });

    it("should throw if any version is below Etherscan supported version (overrides)", async () => {
      const solidityConfig = {
        compilers: [
          {
            version: "0.8.18",
            settings: {},
          },
          {
            version: "0.7.6",
            settings: {},
          },
        ],
        overrides: {
          "contracts/Foo.sol": {
            version: "0.3.5",
            settings: {},
          },
        },
      };

      await expect(getCompilerVersions(solidityConfig)).to.be.rejectedWith(
        /Etherscan only supports compiler versions 0.4.11 and higher/
      );
    });
  });

  describe("encodeArguments", () => {
    const sourceName = "TheContract.sol";
    const contractName = "TheContract";

    it("should correctly encode a single constructor argument", async () => {
      const abi: JsonFragment[] = [
        {
          inputs: [
            {
              name: "amount",
              type: "uint256",
            },
          ],
          stateMutability: "nonpayable",
          type: "constructor",
        },
      ];
      const constructorArguments: any[] = [50];
      const encodedArguments = await encodeArguments(
        abi,
        sourceName,
        contractName,
        constructorArguments
      );
      assert.equal(
        encodedArguments,
        "0000000000000000000000000000000000000000000000000000000000000032"
      );
    });

    it("should correctly encode multiple constructor arguments", async () => {
      const abi: JsonFragment[] = [
        {
          inputs: [
            {
              name: "amount",
              type: "uint256",
            },
            {
              name: "amount",
              type: "string",
            },
            {
              name: "amount",
              type: "address",
            },
          ],
          stateMutability: "nonpayable",
          type: "constructor",
        },
      ];
      const constructorArguments: any[] = [
        50,
        "initializer",
        "0x752C8191E6b1Db38B41A8c8921F7a703F2969d18",
      ];
      const encodedArguments = await encodeArguments(
        abi,
        sourceName,
        contractName,
        constructorArguments
      );
      const expectedArguments = [
        "0000000000000000000000000000000000000000000000000000000000000032",
        "0000000000000000000000000000000000000000000000000000000000000060",
        "000000000000000000000000752c8191e6b1db38b41a8c8921f7a703f2969d18",
        "000000000000000000000000000000000000000000000000000000000000000b",
        "696e697469616c697a6572000000000000000000000000000000000000000000",
      ].join("");
      assert.equal(encodedArguments, expectedArguments);
    });

    it("should correctly encode ABIv2 nested tuples", async () => {
      const abi: JsonFragment[] = [
        {
          inputs: [
            {
              name: "t",
              type: "tuple",
              components: [
                {
                  name: "x",
                  type: "uint256",
                },
                {
                  name: "y",
                  type: "uint256",
                },
                {
                  name: "nestedProperty",
                  type: "tuple",
                  components: [
                    {
                      name: "x",
                      type: "uint256",
                    },
                    {
                      name: "y",
                      type: "uint256",
                    },
                  ],
                },
              ],
            },
          ],
          stateMutability: "nonpayable",
          type: "constructor",
        },
      ];
      const constructorArguments: any[] = [
        {
          x: 8,
          y: 8 + 16,
          nestedProperty: {
            x: 8 + 16 * 2,
            y: 8 + 16 * 3,
          },
        },
      ];
      const encodedArguments = await encodeArguments(
        abi,
        sourceName,
        contractName,
        constructorArguments
      );
      const expectedArguments = [
        "0000000000000000000000000000000000000000000000000000000000000008",
        "0000000000000000000000000000000000000000000000000000000000000018",
        "0000000000000000000000000000000000000000000000000000000000000028",
        "0000000000000000000000000000000000000000000000000000000000000038",
      ].join("");
      assert.equal(encodedArguments, expectedArguments);
    });

    it("should return an empty string when there are no constructor arguments", async () => {
      const abi: JsonFragment[] = [
        {
          inputs: [],
          stateMutability: "nonpayable",
          type: "constructor",
        },
      ];
      const constructorArguments: any[] = [];
      const encodedArguments = await encodeArguments(
        abi,
        sourceName,
        contractName,
        constructorArguments
      );
      assert.equal(encodedArguments, "");
    });

    it("should throw if there are less arguments than expected", async () => {
      const abi: JsonFragment[] = [
        {
          inputs: [
            {
              name: "amount",
              type: "uint256",
            },
            {
              name: "anotherAmount",
              type: "uint256",
            },
          ],
          stateMutability: "nonpayable",
          type: "constructor",
        },
      ];
      const constructorArguments: any[] = [50];
      await expect(
        encodeArguments(abi, sourceName, contractName, constructorArguments)
      ).to.be
        .rejectedWith(`The constructor for ${sourceName}:${contractName} has 2 parameters
but 1 arguments were provided instead.`);
    });

    it("should throw if there are more arguments than expected", async () => {
      const abi: JsonFragment[] = [
        {
          inputs: [
            {
              name: "amount",
              type: "uint256",
            },
          ],
          stateMutability: "nonpayable",
          type: "constructor",
        },
      ];
      const constructorArguments: any[] = [50, 100];
      await expect(
        encodeArguments(abi, sourceName, contractName, constructorArguments)
      ).to.be
        .rejectedWith(`The constructor for ${sourceName}:${contractName} has 1 parameters
but 2 arguments were provided instead.`);
    });

    it("should throw if a parameter type does not match its expected type", async () => {
      const abi: JsonFragment[] = [
        {
          inputs: [
            {
              name: "amount",
              type: "uint256",
            },
            {
              name: "amount",
              type: "string",
            },
            {
              name: "amount",
              type: "address",
            },
          ],
          stateMutability: "nonpayable",
          type: "constructor",
        },
      ];
      const constructorArguments: any[] = [
        50,
        "initializer",
        "0x752c8191e6b1db38b41a752C8191E6b1Db38B41A8c8921F7a703F2969d18", // Invalid address
      ];
      await expect(
        encodeArguments(abi, sourceName, contractName, constructorArguments)
      ).to.be.rejectedWith(
        /Value 0x752c8191e6b1db38b41a752C8191E6b1Db38B41A8c8921F7a703F2969d18 cannot be encoded for the parameter amount./
      );
    });

    it("should throw if a parameter type does not match its expected type: number instead of string", async () => {
      const abi: JsonFragment[] = [
        {
          inputs: [
            {
              name: "amount",
              type: "uint256",
            },
            {
              name: "amount",
              type: "string",
            },
            {
              name: "amount",
              type: "address",
            },
          ],
          stateMutability: "nonpayable",
          type: "constructor",
        },
      ];
      const constructorArguments: any[] = [
        50,
        50, // Invalid string
        "0x752C8191E6b1Db38B41A8c8921F7a703F2969d18",
      ];
      await expect(
        encodeArguments(abi, sourceName, contractName, constructorArguments)
      ).to.be.rejectedWith(
        /Value 50 cannot be encoded for the parameter amount./
      );
    });

    it("should throw if an unsafe integer is provided as an argument", async () => {
      const abi: JsonFragment[] = [
        {
          inputs: [
            {
              name: "amount",
              type: "uint256",
            },
          ],
          stateMutability: "nonpayable",
          type: "constructor",
        },
      ];

      const amount = 1000000000000000000;
      assert.isFalse(Number.isSafeInteger(amount));
      const constructorArguments: any[] = [amount];

      await expect(
        encodeArguments(abi, sourceName, contractName, constructorArguments)
      ).to.be.rejectedWith(
        /Value 1000000000000000000 is not a safe integer and cannot be encoded./
      );
    });
  });
});
