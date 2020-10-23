import { assert } from "chai";
import cloneDeep from "lodash/cloneDeep";
import * as path from "path";

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

        const hardhatNetworkConfig: HardhatNetworkUserConfig = config.networks
          .hardhat as HardhatNetworkUserConfig;

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
              url: "http://localhost:8545",
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
                      "*": ["metadata"],
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
          "metadata",
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
        });
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

      it("Should let you configure everything", function () {
        const networkConfig: HardhatNetworkConfig = {
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
          automine: false,
          hardfork: "hola",
          initialDate: "today",
        };

        const config = resolveConfig(__filename, {
          networks: { hardhat: networkConfig },
        });

        assert.deepEqual(config.networks.hardhat, networkConfig);
      });
    });

    describe("HTTP networks resolution", function () {
      describe("Localhost network resolution", function () {
        it("always defines a localhost network with a default url", function () {
          const config = resolveConfig(__filename, {});

          assert.isDefined(config.networks.localhost);

          assert.deepEqual(config.networks.localhost, {
            ...defaultLocalhostNetworkParams,
            ...defaultHttpNetworkParams,
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
          const otherNetworkConfig: HttpNetworkConfig = {
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

          assert.deepEqual(config.networks.other, otherNetworkConfig);
        });

        it("Should add default values to HD accounts config objects", function () {
          const config = resolveConfig(__filename, {
            networks: { other: { url: "a", accounts: { mnemonic: "mmmmm" } } },
          });

          const httpNetConfig = config.networks.other as HttpNetworkConfig;

          const accounts = httpNetConfig.accounts as HttpNetworkHDAccountsConfig;
          assert.deepEqual(accounts, {
            mnemonic: "mmmmm",
            ...defaultHdAccountsConfigParams,
          });
        });
      });
    });
  });
});
