import { assert } from "chai";

import { HARDHAT_NETWORK_NAME } from "../../../../src/internal/constants";
import {
  getValidationErrors,
  validateConfig,
} from "../../../../src/internal/core/config/config-validation";
import { ERRORS } from "../../../../src/internal/core/errors-list";
import { HardhatNetworkHDAccountsConfig } from "../../../../src/types";
import { expectBuidlerError } from "../../../helpers/errors";

describe("Config validation", function () {
  describe("default network config", function () {
    it("Should fail if the wrong type is used", function () {
      expectBuidlerError(
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
      expectBuidlerError(
        () => validateConfig(invalidSolidityType),
        ERRORS.GENERAL.INVALID_CONFIG
      );

      expectBuidlerError(
        () => validateConfig(invalidVersionType),
        ERRORS.GENERAL.INVALID_CONFIG
      );

      expectBuidlerError(
        () => validateConfig(invalidOptimizerType),
        ERRORS.GENERAL.INVALID_CONFIG
      );

      expectBuidlerError(
        () => validateConfig(invalidOptimizerEnabledType),
        ERRORS.GENERAL.INVALID_CONFIG
      );

      expectBuidlerError(
        () => validateConfig(invalidOptimizerRunsType),
        ERRORS.GENERAL.INVALID_CONFIG
      );

      expectBuidlerError(
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
      expectBuidlerError(
        () => validateConfig(invalidPathsType),
        ERRORS.GENERAL.INVALID_CONFIG
      );

      expectBuidlerError(
        () => validateConfig(invalidCacheType),
        ERRORS.GENERAL.INVALID_CONFIG
      );

      expectBuidlerError(
        () => validateConfig(invalidArtifactsType),
        ERRORS.GENERAL.INVALID_CONFIG
      );

      expectBuidlerError(
        () => validateConfig(invalidRootType),
        ERRORS.GENERAL.INVALID_CONFIG
      );

      expectBuidlerError(
        () => validateConfig(invalidSourcesType),
        ERRORS.GENERAL.INVALID_CONFIG
      );

      expectBuidlerError(
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
          expectBuidlerError(
            () => validateConfig({ networks: 123 }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectBuidlerError(
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

      describe("Hardhat Network config", function () {
        it("Should fail with invalid types", function () {
          expectBuidlerError(
            () =>
              validateConfig({
                networks: {
                  [HARDHAT_NETWORK_NAME]: 123,
                },
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectBuidlerError(
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

          expectBuidlerError(
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

          expectBuidlerError(
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

          expectBuidlerError(
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

          expectBuidlerError(
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

          expectBuidlerError(
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

          expectBuidlerError(
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

          expectBuidlerError(
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

          expectBuidlerError(
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

          expectBuidlerError(
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

          expectBuidlerError(
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

          expectBuidlerError(
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

          expectBuidlerError(
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

          expectBuidlerError(
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

          expectBuidlerError(
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

          expectBuidlerError(
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

          expectBuidlerError(
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
          expectBuidlerError(
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
          expectBuidlerError(
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
        });

        describe("BuidlerNetworkHDAccounstConfig", function () {
          it("Should accept a valid HD config", function () {
            let hdConfig: HardhatNetworkHDAccountsConfig = {
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
          });

          it("Should fail with invalid types", function () {
            expectBuidlerError(
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

            expectBuidlerError(
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

            expectBuidlerError(
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

            expectBuidlerError(
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

            expectBuidlerError(
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
      });

      describe("HTTP network config", function () {
        describe("Url field", function () {
          it("Should fail if no url is set for custom networks", function () {
            expectBuidlerError(
              () => validateConfig({ networks: { custom: {} } }),
              ERRORS.GENERAL.INVALID_CONFIG
            );
          });

          it("Shouldn't fail if no url is set for localhost network", function () {
            const errors = getValidationErrors({ networks: { localhost: {} } });
            assert.isEmpty(errors);
          });

          it("Shouldn't fail if no url is set for buidler network", function () {
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
                  url: "http://localhost",
                },
              },
            });
            assert.isEmpty(errors);
          });

          it("Should accept a mapping of strings to strings", function () {
            const errors = getValidationErrors({
              networks: {
                custom: {
                  url: "http://localhost",
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
            expectBuidlerError(
              () =>
                validateConfig({
                  networks: {
                    custom: {
                      url: "http://localhost",
                      httpHeaders: 123,
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectBuidlerError(
              () =>
                validateConfig({
                  networks: {
                    custom: {
                      url: "http://localhost",
                      httpHeaders: "123",
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );
          });

          it("Should reject non-string values", function () {
            expectBuidlerError(
              () =>
                validateConfig({
                  networks: {
                    custom: {
                      url: "http://localhost",
                      httpHeaders: {
                        a: "a",
                        b: 123,
                      },
                    },
                  },
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectBuidlerError(
              () =>
                validateConfig({
                  networks: {
                    custom: {
                      url: "http://localhost",
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
            expectBuidlerError(
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

            expectBuidlerError(
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

            expectBuidlerError(
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
              expectBuidlerError(
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

              expectBuidlerError(
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

              expectBuidlerError(
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

              expectBuidlerError(
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
              expectBuidlerError(
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
              expectBuidlerError(
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
              expectBuidlerError(
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
            expectBuidlerError(
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

            expectBuidlerError(
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

            expectBuidlerError(
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

            expectBuidlerError(
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

            expectBuidlerError(
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

            expectBuidlerError(
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
            accounts: [{ privateKey: "asd", balance: "123" }],
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
            accounts: ["0x0", "0x1"],
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
          withOtherTypeOfAccounts: {
            accounts: {
              type: "ledger",
              asd: 12,
            },
            url: "",
          },
        },
      });

      assert.deepEqual(errors, []);

      assert.deepEqual(
        getValidationErrors({
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
  });
});
