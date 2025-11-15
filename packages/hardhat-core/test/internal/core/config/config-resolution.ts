import { assert } from "chai";
import cloneDeep from "lodash/cloneDeep";
import * as path from "path";
import sinon from "sinon";

import { resolveConfig } from "../../../../src/internal/core/config/config-resolution";
import {
  DEFAULT_SOLC_VERSION,
  defaultHardhatNetworkHdAccountsConfigParams,
  defaultHardhatNetworkParams,
  defaultHdAccountsConfigParams,
  defaultHttpNetworkParams,
  defaultLocalhostNetworkParams,
  defaultMochaOptions,
  defaultSolcOutputSelection,
} from "../../../../src/internal/core/config/default-config";
import {
  HardhatConfig,
  HardhatNetworkAccountConfig,
  HardhatNetworkConfig,
  HardhatNetworkUserConfig,
  HttpNetworkConfig,
  HttpNetworkHDAccountsConfig,
  HttpNetworkUserConfig,
} from "../../../../src/types";
import { HardforkName } from "../../../../src/internal/util/hardforks";
import { useFixtureProject } from "../../../helpers/project";
import {
  getAllFilesMatchingSync,
  getRealPathSync,
} from "../../../../src/internal/util/fs-utils";
import { useEnvironment } from "../../../helpers/environment";

function getBuildInfos() {
  return getAllFilesMatchingSync(getRealPathSync("artifacts/build-info"), (f) =>
    f.endsWith(".json")
  );
}

describe("Config resolution", () => {
  describe("Default config merging", () => {
    describe("With default config", () => {
      it("should return the default config", () => {
        const config = resolveConfig(__filename, {});
        assert.lengthOf(config.solidity.compilers, 1);
        assert.equal(
          config.solidity.compilers[0].version,
          DEFAULT_SOLC_VERSION
        );
        assert.containsAllKeys(config.networks, ["localhost"]);
        assert.isUndefined(config.solidity.compilers[0]?.settings?.evmVersion);
        assert.equal(config.defaultNetwork, "hardhat");

        const hardhatNetworkConfig: HardhatNetworkConfig = config.networks
          .hardhat as HardhatNetworkConfig;

        assert.equal(hardhatNetworkConfig.throwOnTransactionFailures, true);
        assert.equal(hardhatNetworkConfig.throwOnCallFailures, true);
      });
    });

    describe("With custom config", () => {
      let config: HardhatConfig;

      beforeEach(() => {
        config = resolveConfig(__filename, {
          defaultNetwork: "custom",
          networks: {
            custom: {
              url: "http://127.0.0.1:8545",
            },
            localhost: {
              accounts: [
                "0xa95f9e3e7ae4e4865c5968828fe7c03fffa8a9f3bb52d36d26243f4c868ee166",
              ],
            },
          },
          solidity: "0.5.15",
          unknown: {
            asd: 123,
          },
        } as any);
      });

      it("should return the config merged ", () => {
        assert.lengthOf(config.solidity.compilers, 1);
        assert.equal(config.solidity.compilers[0].version, "0.5.15");
        assert.containsAllKeys(config.networks, ["localhost", "custom"]);
        assert.equal(config.defaultNetwork, "custom");
      });

      it("should return the config merged ", () => {
        assert.lengthOf(config.solidity.compilers, 1);
        assert.equal(config.solidity.compilers[0].version, "0.5.15");
        assert.containsAllKeys(config.networks, ["localhost", "custom"]);
        assert.equal(
          (config.networks.localhost as HttpNetworkUserConfig).url,
          "http://127.0.0.1:8545"
        );
        assert.deepEqual(config.networks.localhost.accounts, [
          "0xa95f9e3e7ae4e4865c5968828fe7c03fffa8a9f3bb52d36d26243f4c868ee166",
        ]);
      });

      it("should keep any unknown field", () => {
        assert.deepEqual((config as any).unknown, { asd: 123 });
      });
    });

    describe("With custom solidity", () => {
      let config: HardhatConfig;

      beforeEach(() => {
        const optimizer = {
          enabled: false,
          runs: 200,
        };

        config = resolveConfig(__filename, {
          solidity: {
            compilers: [
              {
                version: "0.5.5",
                settings: {
                  optimizer,
                  metadata: {
                    useLiteralContent: true,
                  },
                  outputSelection: {
                    "*": {
                      "*": ["ir"],
                    },
                  },
                },
              },
              { version: "0.6.7", settings: { optimizer } },
            ],
            overrides: {
              "a.sol": {
                version: "0.6.1",
                settings: {
                  optimizer: {
                    enabled: true,
                  },
                },
              },
            },
          },
        });
      });

      it("should return the user's solidity config", () => {
        const solidityConfig: any = config.solidity;

        const modifiedOutputSelections = cloneDeep(defaultSolcOutputSelection);

        modifiedOutputSelections["*"]["*"] = [
          "ir",
          ...modifiedOutputSelections["*"]["*"],
        ];

        assert.deepEqual(solidityConfig, {
          compilers: [
            {
              version: "0.5.5",
              settings: {
                optimizer: { enabled: false, runs: 200 },
                metadata: {
                  useLiteralContent: true,
                },
                outputSelection: modifiedOutputSelections,
              },
            },
            {
              version: "0.6.7",
              settings: {
                optimizer: { enabled: false, runs: 200 },
                outputSelection: defaultSolcOutputSelection,
              },
            },
          ],
          overrides: {
            "a.sol": {
              version: "0.6.1",
              settings: {
                optimizer: { enabled: true, runs: 200 },
                outputSelection: defaultSolcOutputSelection,
              },
            },
          },
        });
      });
    });
  });

  describe("Paths resolution", () => {
    it("Doesn't override paths.configFile", () => {
      const { paths } = resolveConfig(__filename, {
        paths: { configFile: "asd" } as any,
      });
      assert.equal(paths.configFile, __filename);
    });

    it("Should return absolute paths for Hardhat paths, and leave the others as is", () => {
      const { paths } = resolveConfig(__filename, {
        paths: { asd: "asd" } as any,
      });
      Object.entries(paths)
        .filter(([name]) => name !== "asd")
        .forEach(([_, p]) => assert.isTrue(path.isAbsolute(p)));
    });

    it("Should use absolute paths 'as is'", () => {
      const { paths } = resolveConfig(__filename, {
        paths: {
          asd: "/asd",
          root: "/root",
          sources: "/c",
          artifacts: "/a",
          cache: "/ca",
          tests: "/t",
        } as any,
      });

      assert.equal(paths.root, "/root");
      assert.equal((paths as any).asd, "/asd");
      assert.equal(paths.sources, "/c");
      assert.equal(paths.artifacts, "/a");
      assert.equal(paths.cache, "/ca");
      assert.equal(paths.tests, "/t");
    });

    it("Should resolve the root relative to the configFile", () => {
      const { paths } = resolveConfig(__filename, {
        paths: {
          root: "blah",
        },
      });

      assert.equal(paths.root, path.join(__dirname, "blah"));
    });

    it("Should resolve the rest relative to the root, except unknown values, that are left as is", () => {
      const { paths } = resolveConfig(__filename, {
        paths: {
          root: "blah",
          asdf: { a: 123 },
          sources: "c",
          artifacts: "a",
          cache: "ca",
          tests: "t",
        } as any,
      });

      const root = path.join(__dirname, "blah");
      assert.equal(paths.root, root);
      assert.equal(paths.sources, path.join(root, "c"));
      assert.equal(paths.artifacts, path.join(root, "a"));
      assert.equal(paths.cache, path.join(root, "ca"));
      assert.equal(paths.tests, path.join(root, "t"));

      assert.deepEqual((paths as any).asdf, { a: 123 });
    });

    it("Should have the right default values", () => {
      const { paths } = resolveConfig(__filename, {});
      assert.equal(paths.root, __dirname);
      assert.equal(paths.sources, path.join(__dirname, "contracts"));
      assert.equal(paths.artifacts, path.join(__dirname, "artifacts"));
      assert.equal(paths.cache, path.join(__dirname, "cache"));
      assert.equal(paths.tests, path.join(__dirname, "test"));
    });
  });

  describe("Mocha config resolution", () => {
    it("Should set a default time and leave the rest as is", () => {
      const config = resolveConfig(__filename, { mocha: { bail: true } });
      assert.equal(config.mocha.timeout, defaultMochaOptions.timeout);
      assert.isTrue(config.mocha.bail);
    });

    it("Should let the user override the timeout", () => {
      const config = resolveConfig(__filename, { mocha: { timeout: 1 } });
      assert.equal(config.mocha.timeout, 1);
    });
  });

  describe("Networks resolution", function () {
    describe("Hardhat network resolution", function () {
      it("Should always define the hardhat network", function () {
        const config = resolveConfig(__filename, {});

        assert.isDefined(config.networks.hardhat);

        assert.deepEqual(config.networks.hardhat, {
          ...defaultHardhatNetworkParams,
          // The default values of the next tests are dynamic
          gas: config.networks.hardhat.gas,
          initialDate: config.networks.hardhat.initialDate,
        });
      });

      it("Should use the block gas limit as default gas", function () {
        const configWithoutBlockGasLimit = resolveConfig(__filename, {});
        assert.deepEqual(configWithoutBlockGasLimit.networks.hardhat, {
          ...defaultHardhatNetworkParams,
          gas: configWithoutBlockGasLimit.networks.hardhat.blockGasLimit,
          initialDate: configWithoutBlockGasLimit.networks.hardhat.initialDate,
        });

        const configWithBlockGasLimit = resolveConfig(__filename, {
          networks: { hardhat: { blockGasLimit: 1 } },
        });
        assert.deepEqual(configWithBlockGasLimit.networks.hardhat, {
          ...defaultHardhatNetworkParams,
          blockGasLimit: 1,
          gas: 1,
          initialDate: configWithBlockGasLimit.networks.hardhat.initialDate,
        });

        const configWithBlockGasLimitAndGas = resolveConfig(__filename, {
          networks: { hardhat: { blockGasLimit: 2, gas: 3 } },
        });
        assert.deepEqual(configWithBlockGasLimitAndGas.networks.hardhat, {
          ...defaultHardhatNetworkParams,
          blockGasLimit: 2,
          gas: 3,
          initialDate:
            configWithBlockGasLimitAndGas.networks.hardhat.initialDate,
        });
      });

      it("Should resolve initialDate to the current time", function () {
        const fakeNow = new Date(
          "Fri Apr 8 2021 15:21:19 GMT-0300 (Argentina Standard Time)"
        );

        let sinonClock: sinon.SinonFakeTimers | undefined;
        try {
          sinonClock = sinon.useFakeTimers({
            now: fakeNow,
            toFake: [],
          });

          const configWithoutInitialDate = resolveConfig(__filename, {});
          assert.equal(
            new Date(
              configWithoutInitialDate.networks.hardhat.initialDate
            ).valueOf(),
            fakeNow.valueOf()
          );
        } finally {
          if (sinonClock !== undefined) {
            sinonClock.restore();
          }
        }

        const initialDate =
          "Fri Apr 09 2021 15:21:19 GMT-0300 (Argentina Standard Time)";
        const configWithInitialDate = resolveConfig(__filename, {
          networks: {
            hardhat: {
              initialDate,
            },
          },
        });

        assert.equal(
          configWithInitialDate.networks.hardhat.initialDate,
          initialDate
        );
      });

      it("Should normalize the accounts' private keys", function () {
        const config = resolveConfig(__filename, {
          networks: {
            hardhat: {
              accounts: [
                { privateKey: "  aa00 ", balance: "1" },
                { privateKey: "  0XaA00 ", balance: "1" },
              ],
            },
          },
        });

        const accounts = config.networks.hardhat
          .accounts as HardhatNetworkAccountConfig[];

        const privateKeys = accounts.map((a) => a.privateKey);

        assert.deepEqual(privateKeys, ["0xaa00", "0xaa00"]);
      });

      describe("Forking config", function () {
        it("Should enable it if there's an url and no enabled setting", function () {
          const config = resolveConfig(__filename, {
            networks: {
              hardhat: {
                forking: {
                  url: "asd",
                },
              },
            },
          });

          assert.deepEqual(config.networks.hardhat.forking, {
            url: "asd",
            enabled: true,
            httpHeaders: {},
          });
        });

        it("Should respect the enabled setting", function () {
          const config = resolveConfig(__filename, {
            networks: {
              hardhat: {
                forking: {
                  url: "asd",
                  enabled: false,
                },
              },
            },
          });

          assert.deepEqual(config.networks.hardhat.forking, {
            url: "asd",
            enabled: false,
            httpHeaders: {},
          });
        });

        it("Should let you specify a blockNumber ", function () {
          const config = resolveConfig(__filename, {
            networks: {
              hardhat: {
                forking: {
                  url: "asd",
                  blockNumber: 123,
                },
              },
            },
          });

          assert.deepEqual(config.networks.hardhat.forking, {
            url: "asd",
            enabled: true,
            blockNumber: 123,
            httpHeaders: {},
          });
        });
      });

      describe("Accounts settings", function () {
        it("Should let you specify an array of accounts that's used as is", function () {
          const accounts = [{ privateKey: "0x00000", balance: "123" }];
          const config = resolveConfig(__filename, {
            networks: {
              hardhat: {
                accounts,
              },
            },
          });

          assert.deepEqual(config.networks.hardhat.accounts, accounts);
        });

        it("Should accept an hd account with balance", function () {
          const config = resolveConfig(__filename, {
            networks: {
              hardhat: {
                accounts: {
                  mnemonic:
                    "magnet season because hope bind episode labor ready potato glove result modify",
                  path: "m/44'/60'/1'/1",
                  accountsBalance: "12312",
                  count: 1,
                  initialIndex: 2,
                },
              },
            },
          });

          assert.deepEqual(config.networks.hardhat.accounts, {
            mnemonic:
              "magnet season because hope bind episode labor ready potato glove result modify",
            path: "m/44'/60'/1'/1",
            accountsBalance: "12312",
            count: 1,
            initialIndex: 2,
            passphrase: "",
          });
        });

        it("Should use default values for hd accounts", function () {
          const config = resolveConfig(__filename, {
            networks: {
              hardhat: {
                accounts: {
                  mnemonic:
                    "magnet season because hope bind episode labor ready potato glove result modify",
                },
              },
            },
          });

          assert.deepEqual(config.networks.hardhat.accounts, {
            ...defaultHardhatNetworkHdAccountsConfigParams,
            mnemonic:
              "magnet season because hope bind episode labor ready potato glove result modify",
          });
        });
      });

      describe("Mining config", function () {
        it("should default use default mining values ", function () {
          const config = resolveConfig(__filename, {});

          assert.deepEqual(config.networks.hardhat.mining, {
            auto: true,
            interval: 0,
            mempool: {
              order: "priority",
            },
          });
        });

        it("should disable automine if interval is configured", function () {
          const config = resolveConfig(__filename, {
            networks: {
              hardhat: {
                mining: {
                  interval: 1000,
                },
              },
            },
          });

          assert.deepEqual(config.networks.hardhat.mining, {
            auto: false,
            interval: 1000,
            mempool: {
              order: "priority",
            },
          });
        });

        it("should allow configuring only automine", function () {
          const config = resolveConfig(__filename, {
            networks: {
              hardhat: {
                mining: {
                  auto: false,
                },
              },
            },
          });

          assert.deepEqual(config.networks.hardhat.mining, {
            auto: false,
            interval: 0,
            mempool: {
              order: "priority",
            },
          });
        });

        it("should allow configuring both values", function () {
          const config = resolveConfig(__filename, {
            networks: {
              hardhat: {
                mining: {
                  auto: true,
                  interval: 1000,
                },
              },
            },
          });

          assert.deepEqual(config.networks.hardhat.mining, {
            auto: true,
            interval: 1000,
            mempool: {
              order: "priority",
            },
          });
        });

        it("should accept an array for interval mining", function () {
          const config = resolveConfig(__filename, {
            networks: {
              hardhat: {
                mining: {
                  interval: [1000, 5000],
                },
              },
            },
          });

          assert.deepEqual(config.networks.hardhat.mining, {
            auto: false,
            interval: [1000, 5000],
            mempool: {
              order: "priority",
            },
          });
        });

        it("should set the mempool order", function () {
          const config = resolveConfig(__filename, {
            networks: {
              hardhat: {
                mining: {
                  mempool: {
                    order: "fifo",
                  },
                },
              },
            },
          });

          assert.deepEqual(config.networks.hardhat.mining, {
            auto: true,
            interval: 0,
            mempool: {
              order: "fifo",
            },
          });
        });
      });

      describe("minGasPrice", function () {
        it("should default to 0", function () {
          const config = resolveConfig(__filename, {});

          assert.equal(config.networks.hardhat.minGasPrice, 0n);
        });

        it("should accept numbers", function () {
          const config = resolveConfig(__filename, {
            networks: {
              hardhat: {
                minGasPrice: 10,
              },
            },
          });

          assert.equal(config.networks.hardhat.minGasPrice, 10n);
        });

        it("should accept strings", function () {
          const config = resolveConfig(__filename, {
            networks: {
              hardhat: {
                minGasPrice: "100000000000",
              },
            },
          });

          assert.equal(config.networks.hardhat.minGasPrice, 10n ** 11n);
        });
      });

      it("Should let you configure everything", function () {
        const networkConfig: HardhatNetworkUserConfig = {
          accounts: [{ privateKey: "0x00000", balance: "123" }],
          chainId: 123,
          from: "from",
          gas: 1,
          gasMultiplier: 1231,
          gasPrice: 2345678,
          throwOnCallFailures: false,
          throwOnTransactionFailures: false,
          loggingEnabled: true,
          allowUnlimitedContractSize: true,
          blockGasLimit: 567,
          minGasPrice: 10,
          mining: {
            auto: false,
            interval: 0,
            mempool: {
              order: "priority",
            },
          },
          hardfork: "hola",
          initialDate: "today",
          chains: {},
        };

        const config = resolveConfig(__filename, {
          networks: { hardhat: networkConfig },
        });

        assert.deepEqual(config.networks.hardhat, {
          accounts: [{ privateKey: "0x00000", balance: "123" }],
          chainId: 123,
          from: "from",
          gas: 1,
          gasMultiplier: 1231,
          gasPrice: 2345678,
          throwOnCallFailures: false,
          throwOnTransactionFailures: false,
          loggingEnabled: true,
          allowUnlimitedContractSize: true,
          blockGasLimit: 567,
          minGasPrice: 10n,
          mining: {
            auto: false,
            interval: 0,
            mempool: {
              order: "priority",
            },
          },
          hardfork: "hola",
          initialDate: "today",
          chains: defaultHardhatNetworkParams.chains,
        });
      });

      describe("chains", function () {
        it("should default to default", function () {
          const resolvedConfig = resolveConfig(__filename, {});
          assert.deepEqual(
            Array.from(resolvedConfig.networks.hardhat.chains.entries()),
            Array.from(defaultHardhatNetworkParams.chains.entries())
          );
        });
        describe("mixing defaults and user configs", function () {
          const userConfig = {
            networks: {
              hardhat: { chains: { 1: { hardforkHistory: { london: 999 } } } },
            },
          };
          const resolvedConfig = resolveConfig(__filename, userConfig);
          it("If the user provides values for a chain that's included in the default, should use the users' values, and ignore the defaults for that chain.", function () {
            assert.deepEqual(resolvedConfig.networks.hardhat.chains.get(1), {
              hardforkHistory: new Map([[HardforkName.LONDON, 999]]),
            });
          });
          it("If they don't provide any value for a default chain, should use the default for that one.", function () {
            for (const otherChain of Array.from(
              defaultHardhatNetworkParams.chains.keys()
            )) {
              if (otherChain === 1) continue; // don't expect the default there
              assert.deepEqual(
                resolvedConfig.networks.hardhat.chains.get(otherChain),
                defaultHardhatNetworkParams.chains.get(otherChain)
              );
            }
          });
        });
        it("If the user provides values for a chain that's not part of the default, should also use those.", function () {
          const resolvedConfig = resolveConfig(__filename, {
            networks: {
              hardhat: {
                chains: { 999: { hardforkHistory: { london: 1234 } } },
              },
            },
          });
          assert.deepEqual(resolvedConfig.networks.hardhat.chains.get(999), {
            hardforkHistory: new Map([[HardforkName.LONDON, 1234]]),
          });
        });
      });
    });

    describe("HTTP networks resolution", function () {
      describe("Localhost network resolution", function () {
        it("always defines a localhost network with a default url", function () {
          const config = resolveConfig(__filename, {});

          assert.isDefined(config.networks.localhost);

          assert.deepEqual(config.networks.localhost, {
            ...defaultHttpNetworkParams,
            ...defaultLocalhostNetworkParams,
          });
        });

        it("let's you override its url and other things", function () {
          const config = resolveConfig(__filename, {
            networks: { localhost: { url: "asd", timeout: 1 } },
          });

          assert.isDefined(config.networks.localhost);

          assert.deepEqual(config.networks.localhost, {
            ...defaultHttpNetworkParams,
            url: "asd",
            timeout: 1,
          });
        });
      });

      describe("Other networks", function () {
        it("Should let you define other networks", function () {
          const config = resolveConfig(__filename, {
            networks: { other: { url: "asd" } },
          });

          assert.deepEqual(config.networks.other, {
            ...defaultHttpNetworkParams,
            url: "asd",
          });
        });

        it("Should normalize the accounts' private keys", function () {
          const config = resolveConfig(__filename, {
            networks: {
              other: {
                url: "asd",
                accounts: ["  aa00 ", "  0XaA00 "],
              },
            },
          });

          const privateKeys = config.networks.other.accounts;

          assert.deepEqual(privateKeys, ["0xaa00", "0xaa00"]);
        });

        it("Should let you override everything", function () {
          const otherNetworkConfig: HttpNetworkUserConfig = {
            url: "asd",
            timeout: 1,
            accounts: ["0x00000"],
            chainId: 123,
            from: "from",
            gas: 1,
            gasMultiplier: 1231,
            gasPrice: 2345678,
            httpHeaders: {
              header: "asd",
            },
          };

          const config = resolveConfig(__filename, {
            networks: { other: otherNetworkConfig },
          });

          assert.deepEqual(config.networks.other, {
            url: "asd",
            timeout: 1,
            accounts: ["0x00000"],
            chainId: 123,
            from: "from",
            gas: 1,
            gasMultiplier: 1231,
            gasPrice: 2345678,
            httpHeaders: {
              header: "asd",
            },
          });
        });

        it("Should add default values to HD accounts config objects", function () {
          const config = resolveConfig(__filename, {
            networks: { other: { url: "a", accounts: { mnemonic: "mmmmm" } } },
          });

          const httpNetConfig = config.networks.other as HttpNetworkConfig;

          const accounts =
            httpNetConfig.accounts as HttpNetworkHDAccountsConfig;
          assert.deepEqual(accounts, {
            mnemonic: "mmmmm",
            ...defaultHdAccountsConfigParams,
          });
        });
      });
    });
  });

  describe("evmVersion default", function () {
    it("Should default to paris if solc is gte 0.8.20", () => {
      let config = resolveConfig(__filename, {
        solidity: "0.8.20",
      });
      assert.equal(config.solidity.compilers[0]?.settings?.evmVersion, "paris");

      config = resolveConfig(__filename, {
        solidity: "0.8.21",
      });
      assert.equal(config.solidity.compilers[0]?.settings?.evmVersion, "paris");

      config = resolveConfig(__filename, {
        solidity: {
          compilers: [{ version: "0.8.20" }],
          overrides: {
            "contracts/ERC20.sol": {
              version: "0.8.21",
            },
          },
        },
      });
      assert.equal(config.solidity.compilers[0]?.settings?.evmVersion, "paris");
      assert.equal(
        config.solidity.overrides["contracts/ERC20.sol"]?.settings?.evmVersion,
        "paris"
      );
    });

    it("Should use the solc default if solc is lt 0.8.20", () => {
      let config = resolveConfig(__filename, {
        solidity: "0.8.19",
      });
      assert.isUndefined(config.solidity.compilers[0]?.settings?.evmVersion);

      config = resolveConfig(__filename, {
        solidity: {
          compilers: [{ version: "0.5.7" }],
          overrides: {
            "contracts/ERC20.sol": {
              version: "0.7.6",
            },
          },
        },
      });
      assert.isUndefined(config.solidity.compilers[0]?.settings?.evmVersion);
      assert.isUndefined(
        config.solidity.overrides["contracts/ERC20.sol"]?.settings?.evmVersion
      );
    });

    it("Should let the user override the evmVersion", () => {
      const config = resolveConfig(__filename, {
        solidity: {
          compilers: [
            { version: "0.8.20", settings: { evmVersion: "istanbul" } },
          ],
          overrides: {
            "contracts/ERC20.sol": {
              version: "0.8.21",
              settings: { evmVersion: "shanghai" },
            },
          },
        },
      });

      assert.equal(
        config.solidity.compilers[0]?.settings?.evmVersion,
        "istanbul"
      );
      assert.equal(
        config.solidity.overrides["contracts/ERC20.sol"]?.settings?.evmVersion,
        "shanghai"
      );
    });

    describe("With a solc 0.8.20 project and default config", () => {
      useFixtureProject("project-0.8.20");
      useEnvironment();

      it("Should not emit PUSH0 opcodes when compiling a contract with solc gte 0.8.20 and default config", async function () {
        await this.env.run("compile");
        const source = "contracts/Lock.sol";
        const contract = "Lock";

        const [buildInfo] = getBuildInfos();
        const { output } = require(buildInfo);

        assert.notInclude(
          output.contracts[source][contract].evm.bytecode.opcodes,
          "PUSH0"
        );
      });
    });

    describe("With a solc 0.8.20 project and overridden config", () => {
      useFixtureProject("project-0.8.20-override-evm-version");
      useEnvironment();

      it("Should emit PUSH0 opcodes when compiling a contract with solc gte 0.8.20 and overridden config", async function () {
        await this.env.run("compile");
        const source = "contracts/Lock.sol";
        const contract = "Lock";

        const [buildInfo] = getBuildInfos();
        const { output } = require(buildInfo);

        assert.include(
          output.contracts[source][contract].evm.bytecode.opcodes,
          "PUSH0"
        );
      });
    });
  });
});
