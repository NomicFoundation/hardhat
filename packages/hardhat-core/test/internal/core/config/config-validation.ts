import { assert } from "chai";

import { HARDHAT_NETWORK_NAME } from "../../../../src/internal/constants";
import {
  getValidationErrors,
  validateConfig,
  validateResolvedConfig,
} from "../../../../src/internal/core/config/config-validation";
import { ERRORS } from "../../../../src/internal/core/errors-list";
import { HardhatNetworkHDAccountsUserConfig } from "../../../../src/types";
import { expectHardhatError } from "../../../helpers/errors";

import { resolveConfig } from "../../../../src/internal/core/config/config-resolution";

describe("Config validation", function () {
  describe("default network config", function () {
    it("Should fail if the wrong type is used", function () {
      expectHardhatError(
        () => validateConfig({ defaultNetwork: 123 }),
        ERRORS.GENERAL.INVALID_CONFIG
      );
    });
  });

  describe("Solidity config", function () {
    const invalidSolidityType = {
      solidity: 123,
    };

    const invalidVersionType = {
      solidity: {
        version: 123,
      },
    };

    const invalidOptimizerType = {
      solidity: {
        optimizer: 123,
      },
    };

    const invalidOptimizerEnabledType = {
      solidity: {
        optimizer: {
          enabled: 123,
        },
      },
    };

    const invalidOptimizerRunsType = {
      solidity: {
        optimizer: {
          runs: "",
        },
      },
    };

    const invalidEvmVersionType = {
      solidity: {
        evmVersion: 123,
      },
    };

    it("Should fail with invalid types", function () {
      expectHardhatError(
        () => validateConfig(invalidSolidityType),
        ERRORS.GENERAL.INVALID_CONFIG
      );

      expectHardhatError(
        () => validateConfig(invalidVersionType),
        ERRORS.GENERAL.INVALID_CONFIG
      );

      expectHardhatError(
        () => validateConfig(invalidOptimizerType),
        ERRORS.GENERAL.INVALID_CONFIG
      );

      expectHardhatError(
        () => validateConfig(invalidOptimizerEnabledType),
        ERRORS.GENERAL.INVALID_CONFIG
      );

      expectHardhatError(
        () => validateConfig(invalidOptimizerRunsType),
        ERRORS.GENERAL.INVALID_CONFIG
      );

      expectHardhatError(
        () => validateConfig(invalidEvmVersionType),
        ERRORS.GENERAL.INVALID_CONFIG
      );
    });

    it("Shouldn't fail with an empty solc config", function () {
      const errors = getValidationErrors({
        solc: {},
      });

      assert.isEmpty(errors);
    });

    it("Shouldn't fail without a solc config", function () {
      const errors = getValidationErrors({});

      assert.isEmpty(errors);
    });

    it("Shouldn't fail with valid configs", function () {
      const errors = getValidationErrors({
        solc: {
          version: "123",
          optimizer: {
            enabled: true,
            runs: 123,
          },
          evmVersion: "asd",
        },
      });

      assert.isEmpty(errors);
    });

    it("Shouldn't fail with unrecognized params", function () {
      const errors = getValidationErrors({
        solc: {
          unrecognized: 123,
        },
      });

      assert.isEmpty(errors);
    });
  });

  describe("paths config", function () {
    const invalidPathsType = {
      paths: 123,
    };

    const invalidCacheType = {
      paths: {
        cache: 123,
      },
    };

    const invalidArtifactsType = {
      paths: {
        artifacts: 123,
      },
    };

    const invalidSourcesType = {
      paths: {
        sources: 123,
      },
    };

    const invalidTestsType = {
      paths: {
        tests: 123,
      },
    };

    const invalidRootType = {
      paths: {
        root: 123,
      },
    };

    it("Should fail with invalid types", function () {
      expectHardhatError(
        () => validateConfig(invalidPathsType),
        ERRORS.GENERAL.INVALID_CONFIG
      );

      expectHardhatError(
        () => validateConfig(invalidCacheType),
        ERRORS.GENERAL.INVALID_CONFIG
      );

      expectHardhatError(
        () => validateConfig(invalidArtifactsType),
        ERRORS.GENERAL.INVALID_CONFIG
      );

      expectHardhatError(
        () => validateConfig(invalidRootType),
        ERRORS.GENERAL.INVALID_CONFIG
      );

      expectHardhatError(
        () => validateConfig(invalidSourcesType),
        ERRORS.GENERAL.INVALID_CONFIG
      );

      expectHardhatError(
        () => validateConfig(invalidTestsType),
        ERRORS.GENERAL.INVALID_CONFIG
      );
    });

    it("Shouldn't fail with an empty paths config", function () {
      const errors = getValidationErrors({
        paths: {},
      });

      assert.isEmpty(errors);
    });

    it("Shouldn't fail without a paths config", function () {
      const errors = getValidationErrors({});

      assert.isEmpty(errors);
    });

    it("Shouldn't fail with valid paths configs", function () {
      const errors = getValidationErrors({
        paths: {
          root: "root",
          cache: "cache",
          artifacts: "artifacts",
          sources: "sources",
          tests: "tests",
        },
      });

      assert.isEmpty(errors);
    });

    it("Shouldn't fail with unrecognized params", function () {
      const errors = getValidationErrors({
        paths: {
          unrecognized: 123,
        },
      });

      assert.isEmpty(errors);
    });
  });

  describe("networks config", function () {
    describe("Invalid types", function () {
      describe("Networks object", function () {
        it("Should fail with invalid types", function () {
          expectHardhatError(
            () => validateConfig({ networks: 123 }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  asd: 123,
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );
        });
      });

      /**
       * This describe block will encompass all private key tests
       * for both Hardhat and HTTP networks
       */
      describe("Private key config", function () {
        describe("HTTP network accounts", function () {
          it("Should allow an array of valid private keys", function () {
            validateConfig({
              networks: {
                custom: {
                  url: "http://127.0.0.1",
                  accounts: [
                    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                    "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                    "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
                  ],
                },
              },
            });
          });

          it("Should allow valid private keys with missing hex prefix", function () {
            validateConfig({
              networks: {
                custom: {
                  url: "http://127.0.0.1",
                  accounts: [
                    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                  ],
                },
              },
            });
          });

          it("Should not allow hex literals", function () {
            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    custom: {
                      url: "http://127.0.0.1",
                      accounts: [
                        0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
                      ],
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );
          });

          it("Should not allow private keys of incorrect length", function () {
            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    custom: {
                      url: "http://127.0.0.1",
                      accounts: ["0xaaaa"],
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    custom: {
                      url: "http://127.0.0.1",
                      accounts: [
                        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabb",
                      ],
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );
          });

          it("Should not allow invalid private keys", function () {
            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    custom: {
                      url: "http://127.0.0.1",
                      accounts: [
                        "0xgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg",
                      ],
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );
          });
        });

        describe("Hardhat Network accounts", function () {
          it("Should allow an array of account objects with valid private keys", function () {
            validateConfig({
              networks: {
                [HARDHAT_NETWORK_NAME]: {
                  accounts: [
                    {
                      balance: "123",
                      privateKey:
                        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                    },
                    {
                      balance: "123",
                      privateKey:
                        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                    },
                    {
                      balance: "123",
                      privateKey:
                        "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
                    },
                  ],
                },
              },
            });
          });

          it("Should allow valid private keys with missing hex prefix", function () {
            validateConfig({
              networks: {
                [HARDHAT_NETWORK_NAME]: {
                  accounts: [
                    {
                      balance: "123",
                      privateKey:
                        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                    },
                  ],
                },
              },
            });
          });

          it("Should not allow an array that contains a value that is not an object", function () {
            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    [HARDHAT_NETWORK_NAME]: {
                      accounts: [
                        {
                          balance: "123",
                          privateKey:
                            "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                        },
                        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                        {
                          balance: "123",
                          privateKey:
                            "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
                        },
                      ],
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );
          });

          it("Should not allow hex literals", function () {
            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    [HARDHAT_NETWORK_NAME]: {
                      accounts: [
                        {
                          balance: "123",
                          privateKey: 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
                        },
                      ],
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );
          });

          it("Should not allow private keys of incorrect length", function () {
            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    [HARDHAT_NETWORK_NAME]: {
                      accounts: [
                        {
                          balance: "123",
                          privateKey: "0xaaaa",
                        },
                      ],
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    [HARDHAT_NETWORK_NAME]: {
                      accounts: [
                        {
                          balance: "123",
                          privateKey:
                            "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbb",
                        },
                      ],
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );
          });

          it("Should not allow invalid private keys", function () {
            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    [HARDHAT_NETWORK_NAME]: {
                      accounts: [
                        {
                          balance: "123",
                          privateKey:
                            "0xgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg",
                        },
                      ],
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );
          });
        });
      });

      describe("Hardhat Network config", function () {
        it("Should fail with invalid types", function () {
          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: 123,
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    chainId: "asd",
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    hardfork: "not-supported",
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    throwOnCallFailures: "a",
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    throwOnTransactionFailures: "a",
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    from: 123,
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    gas: "asdasd",
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    gasPrice: "6789",
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    gasMultiplier: "123",
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    blockGasLimit: "asd",
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    minGasPrice: [],
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    accounts: 123,
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    accounts: [{}],
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    accounts: [{ privateKey: "" }],
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    accounts: [{ balance: "" }],
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    accounts: [{ privateKey: 123 }],
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    accounts: [{ balance: 213 }],
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    accounts: [{ privateKey: "0xxxxx", balance: 213 }],
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    accounts: [{ privateKey: "0xxxxx", balance: "0.1231" }],
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    accounts: [{ privateKey: "0xxxxx", balance: "001231" }],
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    accounts: [{ privateKey: "0xxxxx", balance: ".02123" }],
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    accounts: [{ privateKey: "0xxxxx", balance: "-123" }],
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    loggingEnabled: 123,
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    loggingEnabled: "a",
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          // Non boolean allowUnlimitedContractSize
          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    allowUnlimitedContractSize: "a",
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          // Non string initialDate
          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    initialDate: 123,
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          // Invalid forking settings
          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    forking: 123,
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    forking: {},
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    forking: { url: 123 },
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    forking: { url: "" },
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    forking: { url: " " },
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    forking: { url: "asd", blockNumber: "asd" },
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectHardhatError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    forking: { url: "asd", blockNumber: 123, enabled: 123 },
                  },
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );
        });

        describe("HardhatNetworkHDAccounstConfig", function () {
          it("Should accept a valid HD config", function () {
            let hdConfig: HardhatNetworkHDAccountsUserConfig = {
              mnemonic: "asd",
            };

            validateConfig({
              networks: {
                [HARDHAT_NETWORK_NAME]: {
                  accounts: hdConfig,
                },
              },
            });

            hdConfig = {
              mnemonic: "asd",
              accountsBalance: "123",
              count: 123,
              initialIndex: 1,
              path: "m/1/2",
            };

            validateConfig({
              networks: {
                [HARDHAT_NETWORK_NAME]: {
                  accounts: hdConfig,
                },
              },
            });

            hdConfig = {
              mnemonic: "asd",
              accountsBalance: "123",
              count: 123,
              initialIndex: 1,
              path: "m/1/2",
              passphrase: "this is a secret",
            };

            validateConfig({
              networks: {
                [HARDHAT_NETWORK_NAME]: {
                  accounts: hdConfig,
                },
              },
            });

            validateConfig({
              networks: {
                [HARDHAT_NETWORK_NAME]: {
                  accounts: {},
                },
              },
            });
          });

          it("Should fail with invalid types", function () {
            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    [HARDHAT_NETWORK_NAME]: {
                      accounts: {
                        mnemonic: 123,
                      },
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    [HARDHAT_NETWORK_NAME]: {
                      accounts: {
                        initialIndex: "asd",
                      },
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    [HARDHAT_NETWORK_NAME]: {
                      accounts: {
                        count: "asd",
                      },
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    [HARDHAT_NETWORK_NAME]: {
                      accounts: {
                        path: 123,
                      },
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    [HARDHAT_NETWORK_NAME]: {
                      accounts: {
                        mnemonic: "asd",
                        accountsBalance: {},
                      },
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );
          });
        });

        describe("HardhatNetworkMempoolConfig", function () {
          it("Should accept a valid Mempool config", function () {
            validateConfig({
              networks: {
                [HARDHAT_NETWORK_NAME]: {
                  mining: {
                    auto: true,
                    interval: 0,
                  },
                },
              },
            });

            validateConfig({
              networks: {
                [HARDHAT_NETWORK_NAME]: {
                  mining: {
                    auto: true,
                    interval: [10, 100],
                  },
                },
              },
            });

            validateConfig({
              networks: {
                [HARDHAT_NETWORK_NAME]: {
                  mining: {
                    mempool: {
                      order: "priority",
                    },
                  },
                },
              },
            });

            validateConfig({
              networks: {
                [HARDHAT_NETWORK_NAME]: {
                  mining: {
                    mempool: {
                      order: "fifo",
                    },
                  },
                },
              },
            });
          });

          it("Should fail with invalid types", function () {
            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    [HARDHAT_NETWORK_NAME]: {
                      mining: {
                        auto: "not-supported",
                      },
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    [HARDHAT_NETWORK_NAME]: {
                      mining: {
                        auto: true,
                        interval: "not-supported",
                      },
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    [HARDHAT_NETWORK_NAME]: {
                      mining: {
                        mempool: {
                          order: "not-supported",
                        },
                      },
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );
          });
        });

        describe("Hardhat network's coinbase", function () {
          it("Should fail if it's not a valid address", function () {
            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    [HARDHAT_NETWORK_NAME]: {
                      coinbase: "0x123",
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    [HARDHAT_NETWORK_NAME]: {
                      coinbase: 123,
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    [HARDHAT_NETWORK_NAME]: {
                      coinbase: "123",
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );
          });

          it("Should accept an optional address", function () {
            assert.isEmpty(
              getValidationErrors({
                networks: {
                  [HARDHAT_NETWORK_NAME]: {
                    coinbase: "   0x0000000000000000000000000000000000000001  ",
                  },
                },
              })
            );
          });
        });
      });

      describe("HTTP network config", function () {
        describe("Url field", function () {
          it("Should fail if no url is set for custom networks", function () {
            expectHardhatError(
              () => validateConfig({ networks: { custom: {} } }),
              ERRORS.GENERAL.INVALID_CONFIG
            );
          });

          it("Should fail if an empty url is set for custom networks", function () {
            // Empty string
            expectHardhatError(
              () => validateConfig({ networks: { custom: { url: "" } } }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            // Empty string with at least 1 whitespace
            expectHardhatError(
              () => validateConfig({ networks: { custom: { url: " " } } }),
              ERRORS.GENERAL.INVALID_CONFIG
            );
          });

          it("Shouldn't fail if no url is set for localhost network", function () {
            const errors = getValidationErrors({ networks: { localhost: {} } });
            assert.isEmpty(errors);
          });

          it("Should fail if url is set for hardhat network (undefined)", function () {
            const errors = getValidationErrors({
              networks: { [HARDHAT_NETWORK_NAME]: { url: undefined } },
            });
            assert.isNotEmpty(errors);
          });

          it("Should fail if url is set for hardhat network", function () {
            const errors = getValidationErrors({
              networks: { [HARDHAT_NETWORK_NAME]: { url: "anyurl" } },
            });
            assert.isNotEmpty(errors);
          });

          it("Shouldn't fail if no url is set for hardhat network", function () {
            const errors = getValidationErrors({
              networks: { [HARDHAT_NETWORK_NAME]: {} },
            });
            assert.isEmpty(errors);
          });
        });

        describe("HttpHeaders", function () {
          it("Should be optional", function () {
            const errors = getValidationErrors({
              networks: {
                custom: {
                  url: "http://127.0.0.1",
                },
              },
            });
            assert.isEmpty(errors);
          });

          it("Should accept a mapping of strings to strings", function () {
            const errors = getValidationErrors({
              networks: {
                custom: {
                  url: "http://127.0.0.1",
                  httpHeaders: {
                    a: "asd",
                    b: "a",
                  },
                },
              },
            });
            assert.isEmpty(errors);
          });

          it("Should reject other types", function () {
            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    custom: {
                      url: "http://127.0.0.1",
                      httpHeaders: 123,
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    custom: {
                      url: "http://127.0.0.1",
                      httpHeaders: "123",
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );
          });

          it("Should reject non-string values", function () {
            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    custom: {
                      url: "http://127.0.0.1",
                      httpHeaders: {
                        a: "a",
                        b: 123,
                      },
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    custom: {
                      url: "http://127.0.0.1",
                      httpHeaders: {
                        a: "a",
                        b: false,
                      },
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );
          });
        });

        describe("Accounts field", function () {
          it("Shouldn't work with invalid types", function () {
            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    asd: {
                      accounts: 123,
                      url: "",
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    asd: {
                      accounts: {},
                      url: "",
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    asd: {
                      accounts: { asd: 123 },
                      url: "",
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );
          });

          describe("HDAccounstConfig", function () {
            it("Should fail with invalid types", function () {
              expectHardhatError(
                () =>
                  validateConfig({
                    networks: {
                      asd: {
                        accounts: {
                          mnemonic: 123,
                        },
                        url: "",
                      },
                    },
                  }),
                ERRORS.GENERAL.INVALID_CONFIG
              );

              expectHardhatError(
                () =>
                  validateConfig({
                    networks: {
                      asd: {
                        accounts: {
                          initialIndex: "asd",
                        },
                        url: "",
                      },
                    },
                  }),
                ERRORS.GENERAL.INVALID_CONFIG
              );

              expectHardhatError(
                () =>
                  validateConfig({
                    networks: {
                      asd: {
                        accounts: {
                          count: "asd",
                        },
                        url: "",
                      },
                    },
                  }),
                ERRORS.GENERAL.INVALID_CONFIG
              );

              expectHardhatError(
                () =>
                  validateConfig({
                    networks: {
                      asd: {
                        accounts: {
                          path: 123,
                        },
                        url: "",
                      },
                    },
                  }),
                ERRORS.GENERAL.INVALID_CONFIG
              );
            });
          });

          describe("OtherAccountsConfig", function () {
            it("Should fail with invalid types", function () {
              expectHardhatError(
                () =>
                  validateConfig({
                    networks: {
                      asd: {
                        accounts: {
                          type: 123,
                        },
                        url: "",
                      },
                    },
                  }),
                ERRORS.GENERAL.INVALID_CONFIG
              );
            });
          });

          describe("List of private keys", function () {
            it("Shouldn't work with invalid types", function () {
              expectHardhatError(
                () =>
                  validateConfig({
                    networks: {
                      asd: {
                        accounts: [123],
                        url: "",
                      },
                    },
                  }),
                ERRORS.GENERAL.INVALID_CONFIG
              );
            });
          });

          describe("Remote accounts", function () {
            it("Should work with accounts: remote", function () {
              assert.isEmpty(
                getValidationErrors({
                  networks: {
                    asd: {
                      accounts: "remote",
                      url: "",
                    },
                  },
                })
              );
            });

            it("Shouldn't work with other strings", function () {
              expectHardhatError(
                () =>
                  validateConfig({
                    networks: {
                      asd: {
                        accounts: "asd",
                        url: "",
                      },
                    },
                  }),
                ERRORS.GENERAL.INVALID_CONFIG
              );
            });
          });
        });

        describe("Other fields", function () {
          it("Shouldn't accept invalid types", function () {
            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    asd: {
                      url: "",
                      timeout: "asd",
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    asd: {
                      chainId: "",
                      url: "",
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    asd: {
                      from: 123,
                      url: "",
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    asd: {
                      gas: "asdsad",
                      url: "",
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    asd: {
                      gasPrice: "asdsad",
                      url: "",
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    asd: {
                      gasMultiplier: "asdsad",
                      url: "",
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    asd: {
                      url: false,
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );
          });
        });
      });
    });

    it("Shouldn't fail with an empty networks config", function () {
      const errors = getValidationErrors({
        networks: {},
      });

      assert.isEmpty(errors);
    });

    it("Shouldn't fail without a networks config", function () {
      const errors = getValidationErrors({});

      assert.isEmpty(errors);
    });

    it("Shouldn't fail with valid networks configs", function () {
      const errors = getValidationErrors({
        networks: {
          commonThings: {
            chainId: 1,
            from: "0x0001",
            gas: "auto",
            gasPrice: "auto",
            gasMultiplier: 123,
            url: "",
          },
          [HARDHAT_NETWORK_NAME]: {
            gas: 678,
            gasPrice: 123,
            blockGasLimit: 8000,
            accounts: [
              {
                balance: "123",
                privateKey:
                  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              },
            ],
            forking: {
              url: "asd",
              blockNumber: 123,
            },
          },
          localhost: {
            gas: 678,
            gasPrice: 123,
            url: "",
          },
          withRemoteAccounts: {
            accounts: "remote",
            url: "",
          },
          withPrivateKeys: {
            accounts: [
              "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            ],
            url: "",
          },
          withHdKeys: {
            accounts: {
              mnemonic: "asd asd asd",
              initialIndex: 0,
              count: 123,
              path: "m/123",
            },
            url: "",
          },
        },
      });

      assert.deepEqual(errors, []);
      assert.deepEqual(
        getValidationErrors({
          networks: {
            [HARDHAT_NETWORK_NAME]: {
              accounts: [
                {
                  privateKey:
                    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                  balance: "0",
                },
              ],
            },
          },
        }),
        []
      );
      assert.deepEqual(
        getValidationErrors({
          networks: {
            [HARDHAT_NETWORK_NAME]: {
              accounts: [
                {
                  privateKey:
                    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                  balance: "1",
                },
              ],
            },
          },
        }),
        []
      );
      assert.deepEqual(
        getValidationErrors({
          networks: {
            [HARDHAT_NETWORK_NAME]: {
              accounts: [
                {
                  privateKey:
                    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                  balance: "100123",
                },
              ],
            },
          },
        }),
        []
      );
      assert.deepEqual(
        getValidationErrors({
          networks: {
            [HARDHAT_NETWORK_NAME]: {
              accounts: [
                {
                  privateKey:
                    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                  balance: "12300000000123",
                },
              ],
            },
          },
        }),
        []
      );
      assert.deepEqual(
        getValidationErrors({
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
          unknown: {
            asd: 123,
            url: "",
          },
        }),
        []
      );
    });

    it("Shouldn't fail with unrecognized params", function () {
      const errors = getValidationErrors({
        networks: {
          localhost: {
            asd: 1232,
          },
          [HARDHAT_NETWORK_NAME]: {
            asdasd: "123",
          },
        },
      });

      assert.isEmpty(errors);
    });

    describe("London-specific fields and validations", function () {
      describe("Hardhat network", function () {
        describe("When using a hardfork before London", function () {
          it("Should throw if an initialBaseFeePerGas is used", function () {
            expectHardhatError(
              () =>
                validateConfig({
                  networks: {
                    hardhat: {
                      hardfork: "berlin",
                      initialBaseFeePerGas: 123,
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );
          });
        });

        describe("When using London or later", function () {
          for (const hardfork of ["london", "arrowGlacier"]) {
            it(`Should throw if minGasPrice is used when ${hardfork} is activated`, function () {
              expectHardhatError(
                () =>
                  validateConfig({
                    networks: {
                      hardhat: {
                        hardfork,
                        minGasPrice: 123,
                      },
                    },
                  }),
                ERRORS.GENERAL.INVALID_CONFIG
              );
            });
          }
        });
      });
    });

    describe("Hardfork history usage", function () {
      it("Should validate good config", function () {
        validateConfig({
          networks: {
            hardhat: {
              chains: {
                1: {
                  hardforkHistory: {
                    berlin: 12965000 - 1000,
                    london: 12965000,
                  },
                },
              },
            },
          },
        });
      });
      it("Should validate good config with chainId as a string", function () {
        validateConfig({
          networks: {
            hardhat: {
              chains: {
                "1": {
                  hardforkHistory: {
                    berlin: 12965000 - 1000,
                    london: 12965000,
                  },
                },
              },
            },
          },
        });
      });
      it("should reject an invalid hardfork name", function () {
        expectHardhatError(() => {
          validateConfig({
            networks: {
              hardhat: {
                chains: {
                  1: { hardforkHistory: { bogusHardforkName: 12965000 } },
                },
              },
            },
          });
        }, ERRORS.GENERAL.INVALID_CONFIG);
      });
    });

    describe("enableTransientStorage", function () {
      it("should fail if enableTransientStorage is enabled and the hardfork is not cancun", async function () {
        expectHardhatError(
          () =>
            validateConfig({
              networks: {
                hardhat: {
                  hardfork: "shanghai",
                  enableTransientStorage: true,
                },
              },
            }),
          ERRORS.GENERAL.INVALID_CONFIG
        );
      });

      it("should fail if enableTransientStorage is disabled and the hardfork is cancun", async function () {
        expectHardhatError(
          () =>
            validateConfig({
              networks: {
                hardhat: {
                  hardfork: "cancun",
                  enableTransientStorage: false,
                },
              },
            }),
          ERRORS.GENERAL.INVALID_CONFIG
        );
      });

      it("shouldn't fail if only the hardfork or only enableTransientStorage are set", async function () {
        validateConfig({
          networks: {
            hardhat: {
              hardfork: "shanghai",
            },
          },
        });
        validateConfig({
          networks: {
            hardhat: {
              hardfork: "cancun",
            },
          },
        });
        validateConfig({
          networks: {
            hardhat: {
              enableTransientStorage: true,
            },
          },
        });
        validateConfig({
          networks: {
            hardhat: {
              enableTransientStorage: false,
            },
          },
        });
      });
    });
  });

  describe("Resolved Config validation", function () {
    it("Should fail if the optimizer runs has invalid number", function () {
      const optimizer = {
        enabled: true,
        runs: 2 ** 32,
      };
      const resolved = resolveConfig(__filename, {
        solidity: {
          compilers: [{ version: "0.6.7", settings: { optimizer } }],
        },
      });
      expectHardhatError(
        () => validateResolvedConfig(resolved),
        ERRORS.GENERAL.INVALID_CONFIG,
        "The number of optimizer runs exceeds the maximum of 2**32 - 1"
      );
    });

    it("Shouldn't fail if the optimizer has a valid runs", function () {
      const optimizer = {
        enabled: true,
        runs: 123,
      };
      const resolved = resolveConfig(__filename, {
        solidity: {
          compilers: [{ version: "0.6.7", settings: { optimizer } }],
        },
      });

      validateResolvedConfig(resolved);
    });

    it("Should allow using the maximum number of runs", function () {
      const optimizer = {
        enabled: true,
        runs: 2 ** 32 - 1,
      };
      const resolved = resolveConfig(__filename, {
        solidity: {
          compilers: [{ version: "0.6.7", settings: { optimizer } }],
        },
      });

      validateResolvedConfig(resolved);
    });

    it("Shouldn't fail if the optimizer doesn't have run config", function () {
      const optimizer = {
        enabled: true,
      };
      const resolved = resolveConfig(__filename, {
        solidity: {
          compilers: [{ version: "0.6.7", settings: { optimizer } }],
        },
      });

      validateResolvedConfig(resolved);
    });

    it("Should fail if the optimizer runs has invalid number in overrides config", function () {
      const optimizer = {
        enabled: true,
        runs: 2 ** 32,
      };
      const resolved = resolveConfig(__filename, {
        solidity: {
          compilers: [{ version: "0.6.7" }],
          overrides: {
            "contracts/Foo.sol": {
              version: "0.6.7",
              settings: {
                optimizer,
              },
            },
          },
        },
      });
      expectHardhatError(
        () => validateResolvedConfig(resolved),
        ERRORS.GENERAL.INVALID_CONFIG,
        "The number of optimizer runs exceeds the maximum of 2**32 - 1"
      );
    });
  });
});
