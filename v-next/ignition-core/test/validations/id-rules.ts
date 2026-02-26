import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { assert } from "chai";

import { buildModule } from "../../src/build-module.js";
import { fakeArtifact } from "../helpers.js";

describe("id rules", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

  describe("constrain module ids", () => {
    it("should not allow non-alphanumerics in module ids", () => {
      assertThrowsHardhatError(
        () => {
          buildModule("MyModule:v2", (m) => {
            const myContract = m.contract("MyContract");

            return { myContract };
          });
        },
        HardhatError.ERRORS.IGNITION.MODULE.INVALID_MODULE_ID_CHARACTERS,
        {
          moduleId: "MyModule:v2",
        },
      );
    });

    it("should not allow duplicate module ids", () => {
      const MyModule = buildModule("MyModule", (m) => {
        const myContract = m.contract("MyContract");

        return { myContract };
      });

      assertThrowsHardhatError(
        () => {
          buildModule("MyModule", (m) => {
            const { myContract } = m.useModule(MyModule);

            return { myContract };
          });
        },
        HardhatError.ERRORS.IGNITION.MODULE.DUPLICATE_MODULE_ID,
        {
          duplicateModuleIds: "MyModule",
        },
      );
    });
  });

  // Windows is not going to allow these characters in filenames
  describe("constrain user provided ids", () => {
    it("should not allow non-alphanumerics in contract ids", () => {
      assertThrowsHardhatError(
        () => {
          buildModule("MyModule", (m) => {
            const myContract = m.contract("MyContract", [], {
              id: "MyContract:v2",
            });

            return { myContract };
          });
        },
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        {
          message:
            'The id "MyContract:v2" is invalid. Ids can only contain alphanumerics or underscores, and they must start with an alphanumeric character.',
        },
      );
    });

    it("should not allow non-alphanumerics in contractFromArtifact ids", () => {
      assertThrowsHardhatError(
        () => {
          buildModule("MyModule", (m) => {
            const myContract = m.contract(
              "MyContractFromArtifact",
              fakeArtifact,
              [],
              {
                id: "MyContractFromArtifact:v2",
              },
            );

            return { myContract };
          });
        },
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        {
          message:
            'The id "MyContractFromArtifact:v2" is invalid. Ids can only contain alphanumerics or underscores, and they must start with an alphanumeric character.',
        },
      );
    });

    it("should not allow non-alphanumerics in library ids", () => {
      assertThrowsHardhatError(
        () => {
          buildModule("MyModule", (m) => {
            const library = m.library("MyLibrary", {
              id: "MyLibrary:v2",
            });

            return { library };
          });
        },
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        {
          message: `The id "MyLibrary:v2" is invalid. Ids can only contain alphanumerics or underscores, and they must start with an alphanumeric character.`,
        },
      );
    });

    it("should not allow non-alphanumerics in libraryFromArtifact ids", () => {
      assertThrowsHardhatError(
        () => {
          buildModule("MyModule", (m) => {
            const myLibraryFromArtifact = m.library(
              "MyLibraryFromArtifact",
              fakeArtifact,
              {
                id: "MyLibraryFromArtifact:v2",
              },
            );

            return { myLibraryFromArtifact };
          });
        },
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        {
          message: `The id "MyLibraryFromArtifact:v2" is invalid. Ids can only contain alphanumerics or underscores, and they must start with an alphanumeric character.`,
        },
      );
    });

    it("should not allow non-alphanumerics in call ids", () => {
      assertThrowsHardhatError(
        () => {
          buildModule("MyModule", (m) => {
            const myContract = m.contract("MyContract");

            m.call(myContract, "config", [], {
              id: "MyCall:v2",
            });

            return { myContract };
          });
        },
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        {
          message: `The id "MyCall:v2" is invalid. Ids can only contain alphanumerics or underscores, and they must start with an alphanumeric character.`,
        },
      );
    });

    it("should not allow non-alphanumerics in static call ids", () => {
      assertThrowsHardhatError(
        () => {
          buildModule("MyModule", (m) => {
            const myContract = m.contract("MyContract");

            m.staticCall(myContract, "config", [], 0, {
              id: "MyStaticCall:v2",
            });

            return { myContract };
          });
        },
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        {
          message: `The id "MyStaticCall:v2" is invalid. Ids can only contain alphanumerics or underscores, and they must start with an alphanumeric character.`,
        },
      );
    });

    it("should not allow non-alphanumerics in contractAt ids", () => {
      assertThrowsHardhatError(
        () => {
          buildModule("MyModule", (m) => {
            const myContractAt = m.contractAt("MyContract", exampleAddress, {
              id: "MyContractAt:v2",
            });

            return { myContractAt };
          });
        },
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        {
          message: `The id "MyContractAt:v2" is invalid. Ids can only contain alphanumerics or underscores, and they must start with an alphanumeric character.`,
        },
      );
    });

    it("should not allow non-alphanumerics in contractAtFromArtifact ids", () => {
      assertThrowsHardhatError(
        () => {
          buildModule("MyModule", (m) => {
            const myContractAt = m.contractAt(
              "MyContract",
              fakeArtifact,
              exampleAddress,
              {
                id: "MyContractAt:v2",
              },
            );

            return { myContractAt };
          });
        },
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        {
          message: `The id "MyContractAt:v2" is invalid. Ids can only contain alphanumerics or underscores, and they must start with an alphanumeric character.`,
        },
      );
    });

    it("should not allow non-alphanumerics in readEventArgument ids", () => {
      assertThrowsHardhatError(
        () => {
          buildModule("MyModule", (m) => {
            const myContract = m.contract("MyContract");

            m.readEventArgument(myContract, "MyEvent", "ArgName", {
              id: "MyReadEventArgument:v2",
            });

            return { myContract };
          });
        },
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        {
          message: `The id "MyReadEventArgument:v2" is invalid. Ids can only contain alphanumerics or underscores, and they must start with an alphanumeric character.`,
        },
      );
    });

    it("should not allow non-alphanumerics in send id", () => {
      assertThrowsHardhatError(
        () => {
          buildModule("MyModule", (m) => {
            m.send("MySend:v2", exampleAddress, 2n);

            return {};
          });
        },
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        {
          message: `The id "MySend:v2" is invalid. Ids can only contain alphanumerics or underscores, and they must start with an alphanumeric character.`,
        },
      );
    });
  });

  describe("constrain contract names", () => {
    it("should not allow non-alphanumerics in contract name", () => {
      assertThrowsHardhatError(
        () => {
          buildModule("MyModule", (m) => {
            const myContract = m.contract("MyContract#v2");

            return { myContract };
          });
        },
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        { message: `The contract name "MyContract#v2" is invalid.` },
      );
    });

    it("should not allow non-alphanumerics in contractFromArtifact contract name", () => {
      assertThrowsHardhatError(
        () => {
          buildModule("MyModule", (m) => {
            const myContract = m.contract("MyContract#v2", fakeArtifact);

            return { myContract };
          });
        },
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        { message: `The contract name "MyContract#v2" is invalid.` },
      );
    });

    it("should not allow non-alphanumerics in library contract names", () => {
      assertThrowsHardhatError(
        () => {
          buildModule("MyModule", (m) => {
            const library = m.library("MyLibrary#v2");

            return { library };
          });
        },
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        { message: `The contract name "MyLibrary#v2" is invalid.` },
      );
    });

    it("should not allow non-alphanumerics in libraryFromArtifact contract names", () => {
      assertThrowsHardhatError(
        () => {
          buildModule("MyModule", (m) => {
            const myLibraryFromArtifact = m.library(
              "MyLibraryFromArtifact#v2",
              fakeArtifact,
            );

            return { myLibraryFromArtifact };
          });
        },
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        { message: `The contract name "MyLibraryFromArtifact#v2" is invalid.` },
      );
    });

    it("should not allow non-alphanumerics in contractAt contract names", () => {
      assertThrowsHardhatError(
        () => {
          buildModule("MyModule", (m) => {
            const myContractAt = m.contractAt("MyContract#v2", exampleAddress);

            return { myContractAt };
          });
        },
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        { message: `The contract name "MyContract#v2" is invalid.` },
      );
    });

    it("should not allow non-alphanumerics in contractAtFromArtifact contract names", () => {
      assertThrowsHardhatError(
        () => {
          buildModule("MyModule", (m) => {
            const myContractAt = m.contractAt(
              "MyContractAt#v2",
              fakeArtifact,
              exampleAddress,
            );

            return { myContractAt };
          });
        },
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        { message: `The contract name "MyContractAt#v2" is invalid.` },
      );
    });

    describe("With Fully Qualified Names", () => {
      it("should allow non-alphanumerics in the source name", () => {
        assert.doesNotThrow(() => {
          buildModule("MyModule", (m) => {
            m.contract("sourceName.sol:MyContract");
            m.contract("asd/sourceName.sol:MyContract2");
            m.contractAt("sourceName.sol:MyContractAt", exampleAddress);
            m.library("sourceName.sol:MyLibrary");

            return {};
          });
        });
      });

      it("should throw if the FQN has no contract name", () => {
        assertThrowsHardhatError(
          () => {
            buildModule("MyModule", (m) => {
              const myContract = m.contract("sourceName.sol:");

              return { myContract };
            });
          },
          HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
          { message: `The contract name "sourceName.sol:" is invalid.` },
        );
      });

      describe("All the same validations should apply, but to the contract name part of the FQN", () => {
        it("should not allow non-alphanumerics in contract name", () => {
          assertThrowsHardhatError(
            () => {
              buildModule("MyModule", (m) => {
                const myContract = m.contract("sourceName.sol:MyContract#v2");

                return { myContract };
              });
            },
            HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
            {
              message: `The contract name "sourceName.sol:MyContract#v2" is invalid.`,
            },
          );
        });

        it("should not allow non-alphanumerics in contractFromArtifact contract name", () => {
          assertThrowsHardhatError(
            () => {
              buildModule("MyModule", (m) => {
                const myContract = m.contract(
                  "sourceName.sol:MyContract#v2",
                  fakeArtifact,
                );

                return { myContract };
              });
            },
            HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
            {
              message: `The contract name "sourceName.sol:MyContract#v2" is invalid.`,
            },
          );
        });

        it("should not allow non-alphanumerics in library contract names", () => {
          assertThrowsHardhatError(
            () => {
              buildModule("MyModule", (m) => {
                const library = m.library("sourceName.sol:MyLibrary#v2");

                return { library };
              });
            },
            HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
            {
              message: `The contract name "sourceName.sol:MyLibrary#v2" is invalid.`,
            },
          );
        });

        it("should not allow non-alphanumerics in libraryFromArtifact contract names", () => {
          assertThrowsHardhatError(
            () => {
              buildModule("MyModule", (m) => {
                const myLibraryFromArtifact = m.library(
                  "sourceName.sol:MyLibraryFromArtifact#v2",
                  fakeArtifact,
                );

                return { myLibraryFromArtifact };
              });
            },
            HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
            {
              message: `The contract name "sourceName.sol:MyLibraryFromArtifact#v2" is invalid.`,
            },
          );
        });

        it("should not allow non-alphanumerics in contractAt contract names", () => {
          assertThrowsHardhatError(
            () => {
              buildModule("MyModule", (m) => {
                const myContractAt = m.contractAt(
                  "sourceName.sol:MyContract#v2",
                  exampleAddress,
                );

                return { myContractAt };
              });
            },
            HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
            {
              message: `The contract name "sourceName.sol:MyContract#v2" is invalid.`,
            },
          );
        });

        it("should not allow non-alphanumerics in contractAtFromArtifact contract names", () => {
          assertThrowsHardhatError(
            () => {
              buildModule("MyModule", (m) => {
                const myContractAt = m.contractAt(
                  "sourceName.sol:MyContractAt#v2",
                  fakeArtifact,
                  exampleAddress,
                );

                return { myContractAt };
              });
            },
            HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
            {
              message: `The contract name "sourceName.sol:MyContractAt#v2" is invalid.`,
            },
          );
        });
      });
    });
  });

  describe("constrain function names", () => {
    it("should not allow non-alphanumerics in call function names", () => {
      assertThrowsHardhatError(
        () => {
          buildModule("MyModule", (m) => {
            const myContract = m.contract("MyContract");

            m.call(myContract, "config:v2");

            return { myContract };
          });
        },
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        {
          message: `The function name "config:v2" is invalid, make sure you use a valid identifier.`,
        },
      );
    });

    it("should not allow non-alphanumerics in static call ids", () => {
      assertThrowsHardhatError(
        () => {
          buildModule("MyModule", (m) => {
            const myContract = m.contract("MyContract");

            m.staticCall(myContract, "config:v2");

            return { myContract };
          });
        },
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        {
          message: `The function name "config:v2" is invalid, make sure you use a valid identifier.`,
        },
      );
    });

    it("should allow ethers style function specification", () => {
      assert.doesNotThrow(() => {
        buildModule("MyModule", (m) => {
          const myContract = m.contract("MyContract");

          m.staticCall(myContract, "config(uint256,bool)");

          return { myContract };
        });
      });
    });
  });

  describe("constrain event names", () => {
    it("should not allow non-alphanumerics in readEventArgument event names", () => {
      assertThrowsHardhatError(
        () => {
          buildModule("MyModule", (m) => {
            const myContract = m.contract("MyContract");

            m.readEventArgument(myContract, "MyEvent:v2", "MyArg");

            return { myContract };
          });
        },
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        {
          message: `The event name "MyEvent:v2" is invalid, make sure you use a valid identifier.`,
        },
      );
    });

    it("should allow ethers style event specification", () => {
      assert.doesNotThrow(() => {
        buildModule("MyModule", (m) => {
          const myContract = m.contract("MyContract");

          m.readEventArgument(myContract, "MyEvent(bool,bool)", "MyArg");

          return { myContract };
        });
      });
    });
  });

  describe("constrain argument names", () => {
    it("should not allow non-alphanumerics in readEventArgument argument names", () => {
      assertThrowsHardhatError(
        () => {
          buildModule("MyModule", (m) => {
            const myContract = m.contract("MyContract");

            m.readEventArgument(myContract, "MyEvent", "MyArg:v2");

            return { myContract };
          });
        },
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        {
          message: `The argument "MyArg:v2" is expected to have a valid name, but it's invalid.`,
        },
      );
    });
  });
});
