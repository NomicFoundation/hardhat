import { assert } from "chai";

import {
  getValidationErrors,
  validateConfig
} from "../../../../src/internal/core/config/config-validation";
import { ERRORS } from "../../../../src/internal/core/errors";
import { expectBuidlerError } from "../../../helpers/errors";

describe("Config validation", function() {
  describe("Solc config", function() {
    const invalidSolcType = {
      solc: 123
    };

    const invalidVersionType = {
      solc: {
        version: 123
      }
    };

    const invalidOptimizerType = {
      solc: {
        optimizer: 123
      }
    };

    const invalidOptimizerEnabledType = {
      solc: {
        optimizer: {
          enabled: 123
        }
      }
    };

    const invalidOptimizerRunsType = {
      solc: {
        optimizer: {
          runs: ""
        }
      }
    };

    const invalidEvmVersionType = {
      solc: {
        evmVersion: 123
      }
    };

    it("Should fail with invalid types", function() {
      expectBuidlerError(
        () => validateConfig(invalidSolcType),
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

    it("Shouldn't fail with an empty solc config", function() {
      const errors = getValidationErrors({
        solc: {}
      });

      assert.isEmpty(errors);
    });

    it("Shouldn't fail without a solc config", function() {
      const errors = getValidationErrors({});

      assert.isEmpty(errors);
    });

    it("Shouldn't fail with valid configs", function() {
      const errors = getValidationErrors({
        solc: {
          version: "123",
          optimizer: {
            enabled: true,
            runs: 123
          },
          evmVersion: "asd"
        }
      });

      assert.isEmpty(errors);
    });

    it("Shouldn't fail with unrecognized params", function() {
      const errors = getValidationErrors({
        solc: {
          unrecognized: 123
        }
      });

      assert.isEmpty(errors);
    });
  });

  describe("paths config", function() {
    const invalidPathsType = {
      paths: 123
    };

    const invalidCacheType = {
      paths: {
        cache: 123
      }
    };

    const invalidArtifactsType = {
      paths: {
        artifacts: 123
      }
    };

    const invalidSourcesType = {
      paths: {
        sources: 123
      }
    };

    const invalidTestsType = {
      paths: {
        tests: 123
      }
    };

    const invalidRootType = {
      paths: {
        root: 123
      }
    };

    it("Should fail with invalid types", function() {
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

    it("Shouldn't fail with an empty paths config", function() {
      const errors = getValidationErrors({
        paths: {}
      });

      assert.isEmpty(errors);
    });

    it("Shouldn't fail without a paths config", function() {
      const errors = getValidationErrors({});

      assert.isEmpty(errors);
    });

    it("Shouldn't fail with valid paths configs", function() {
      const errors = getValidationErrors({
        paths: {
          root: "root",
          cache: "cache",
          artifacts: "artifacts",
          sources: "sources",
          tests: "tests"
        }
      });

      assert.isEmpty(errors);
    });

    it("Shouldn't fail with unrecognized params", function() {
      const errors = getValidationErrors({
        paths: {
          unrecognized: 123
        }
      });

      assert.isEmpty(errors);
    });
  });

  describe("networks config", function() {
    describe("Invalid types", function() {
      describe("Networks object", function() {
        it("Should fail with invalid types", function() {
          expectBuidlerError(
            () => validateConfig({ networks: 123 }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectBuidlerError(
            () =>
              validateConfig({
                networks: {
                  asd: 123
                }
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );
        });
      });

      describe("Auto network config", function() {
        it("Should fail with invalid types", function() {
          expectBuidlerError(
            () =>
              validateConfig({
                networks: {
                  auto: 123
                }
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectBuidlerError(
            () =>
              validateConfig({
                networks: {
                  auto: {
                    chainId: "asd"
                  }
                }
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectBuidlerError(
            () =>
              validateConfig({
                networks: {
                  auto: {
                    from: 123
                  }
                }
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectBuidlerError(
            () =>
              validateConfig({
                networks: {
                  auto: {
                    gas: "asdasd"
                  }
                }
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectBuidlerError(
            () =>
              validateConfig({
                networks: {
                  auto: {
                    gasPrice: "6789"
                  }
                }
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectBuidlerError(
            () =>
              validateConfig({
                networks: {
                  auto: {
                    gasMultiplier: "123"
                  }
                }
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectBuidlerError(
            () =>
              validateConfig({
                networks: {
                  auto: {
                    blockGasLimit: "asd"
                  }
                }
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectBuidlerError(
            () =>
              validateConfig({
                networks: {
                  auto: {
                    accounts: 123
                  }
                }
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectBuidlerError(
            () =>
              validateConfig({
                networks: {
                  auto: {
                    accounts: [{}]
                  }
                }
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectBuidlerError(
            () =>
              validateConfig({
                networks: {
                  auto: {
                    accounts: [{ privateKey: "" }]
                  }
                }
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectBuidlerError(
            () =>
              validateConfig({
                networks: {
                  auto: {
                    accounts: [{ balance: "" }]
                  }
                }
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectBuidlerError(
            () =>
              validateConfig({
                networks: {
                  auto: {
                    accounts: [{ privateKey: 123 }]
                  }
                }
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );

          expectBuidlerError(
            () =>
              validateConfig({
                networks: {
                  auto: {
                    accounts: [{ balance: 213 }]
                  }
                }
              }),
            ERRORS.GENERAL.INVALID_CONFIG
          );
        });
      });

      describe("HTTP network config", function() {
        describe("Accounts filed", function() {
          it("Shouldn't work with invalid types", function() {
            expectBuidlerError(
              () =>
                validateConfig({
                  networks: {
                    asd: {
                      accounts: 123,
                      url: ""
                    }
                  }
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectBuidlerError(
              () =>
                validateConfig({
                  networks: {
                    asd: {
                      accounts: {},
                      url: ""
                    }
                  }
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectBuidlerError(
              () =>
                validateConfig({
                  networks: {
                    asd: {
                      accounts: { asd: 123 },
                      url: ""
                    }
                  }
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );
          });

          describe("HDAccounstConfig", function() {
            it("Should fail with invalid types", function() {
              expectBuidlerError(
                () =>
                  validateConfig({
                    networks: {
                      asd: {
                        accounts: {
                          mnemonic: 123
                        },
                        url: ""
                      }
                    }
                  }),
                ERRORS.GENERAL.INVALID_CONFIG
              );

              expectBuidlerError(
                () =>
                  validateConfig({
                    networks: {
                      asd: {
                        accounts: {
                          initialIndex: "asd"
                        },
                        url: ""
                      }
                    }
                  }),
                ERRORS.GENERAL.INVALID_CONFIG
              );

              expectBuidlerError(
                () =>
                  validateConfig({
                    networks: {
                      asd: {
                        accounts: {
                          count: "asd"
                        },
                        url: ""
                      }
                    }
                  }),
                ERRORS.GENERAL.INVALID_CONFIG
              );

              expectBuidlerError(
                () =>
                  validateConfig({
                    networks: {
                      asd: {
                        accounts: {
                          path: 123
                        },
                        url: ""
                      }
                    }
                  }),
                ERRORS.GENERAL.INVALID_CONFIG
              );
            });
          });

          describe("OtherAccountsConfig", function() {
            it("Should fail with invalid types", function() {
              expectBuidlerError(
                () =>
                  validateConfig({
                    networks: {
                      asd: {
                        accounts: {
                          type: 123
                        },
                        url: ""
                      }
                    }
                  }),
                ERRORS.GENERAL.INVALID_CONFIG
              );
            });
          });

          describe("List of private keys", function() {
            it("Shouldn't work with invalid types", function() {
              expectBuidlerError(
                () =>
                  validateConfig({
                    networks: {
                      asd: {
                        accounts: [123],
                        url: ""
                      }
                    }
                  }),
                ERRORS.GENERAL.INVALID_CONFIG
              );
            });
          });

          describe("Remote accounts", function() {
            it("Should work with accounts: remote", function() {
              assert.isEmpty(
                getValidationErrors({
                  networks: {
                    asd: {
                      accounts: "remote",
                      url: ""
                    }
                  }
                })
              );
            });

            it("Shouldn't work with other strings", function() {
              expectBuidlerError(
                () =>
                  validateConfig({
                    networks: {
                      asd: {
                        accounts: "asd",
                        url: ""
                      }
                    }
                  }),
                ERRORS.GENERAL.INVALID_CONFIG
              );
            });
          });
        });

        describe("Other fields", function() {
          it("Shouldn't accept invalid types", function() {
            expectBuidlerError(
              () =>
                validateConfig({
                  networks: {
                    asd: {
                      chainId: "",
                      url: ""
                    }
                  }
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectBuidlerError(
              () =>
                validateConfig({
                  networks: {
                    asd: {
                      from: 123,
                      url: ""
                    }
                  }
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectBuidlerError(
              () =>
                validateConfig({
                  networks: {
                    asd: {
                      gas: "asdsad",
                      url: ""
                    }
                  }
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectBuidlerError(
              () =>
                validateConfig({
                  networks: {
                    asd: {
                      gasPrice: "asdsad",
                      url: ""
                    }
                  }
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectBuidlerError(
              () =>
                validateConfig({
                  networks: {
                    asd: {
                      gasMultiplier: "asdsad",
                      url: ""
                    }
                  }
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );

            expectBuidlerError(
              () =>
                validateConfig({
                  networks: {
                    asd: {
                      url: false
                    }
                  }
                }),
              ERRORS.GENERAL.INVALID_CONFIG
            );
          });
        });
      });
    });

    it("Shouldn't fail with an empty networks config", function() {
      const errors = getValidationErrors({
        networks: {}
      });

      assert.isEmpty(errors);
    });

    it("Shouldn't fail without a networks config", function() {
      const errors = getValidationErrors({});

      assert.isEmpty(errors);
    });

    it("Shouldn't fail with valid networks configs", function() {
      const errors = getValidationErrors({
        networks: {
          commonThings: {
            chainId: 1,
            from: "0x0001",
            gas: "auto",
            gasPrice: "auto",
            gasMultiplier: 123,
            url: ""
          },
          auto: {
            gas: 678,
            gasPrice: 123,
            blockGasLimit: 8000,
            accounts: [{ privateKey: "asd", balance: "123" }]
          },
          develop: {
            gas: 678,
            gasPrice: 123,
            url: ""
          },
          withRemoteAccounts: {
            accounts: "remote",
            url: ""
          },
          withPrivateKeys: {
            accounts: ["0x0", "0x1"],
            url: ""
          },
          withHdKeys: {
            accounts: {
              mnemonic: "asd asd asd",
              initialIndex: 0,
              count: 123,
              path: "m/123"
            },
            url: ""
          },
          withOtherTypeOfAccounts: {
            accounts: {
              type: "ledger",
              asd: 12
            },
            url: ""
          }
        }
      });

      assert.deepEqual(errors, []);

      assert.deepEqual(
        getValidationErrors({
          networks: {
            custom: {
              url: "http://localhost:8545"
            },
            develop: {
              accounts: [
                "0xa95f9e3e7ae4e4865c5968828fe7c03fffa8a9f3bb52d36d26243f4c868ee166"
              ]
            }
          },
          unknown: {
            asd: 123,
            url: ""
          }
        }),
        []
      );
    });

    it("Shouldn't fail with unrecognized params", function() {
      const errors = getValidationErrors({
        networks: {
          develop: {
            asd: 1232
          },
          auto: {
            asdasd: "123"
          }
        }
      });

      assert.isEmpty(errors);
    });
  });
});
