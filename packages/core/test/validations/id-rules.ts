import { assert } from "chai";

import { buildModule } from "../../src/build-module";
import { fakeArtifact } from "../helpers";

describe("id rules", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

  describe("constrain module ids", () => {
    it("should not allow non-alphanumerics in module ids", () => {
      assert.throws(() => {
        buildModule("MyModule:v2", (m) => {
          const myContract = m.contract("MyContract");

          return { myContract };
        });
      }, /IGN201: The moduleId "MyModule:v2" is invalid. Module ids can only have alphanumerics and underscore, and they must start with an alphanumeric./);
    });
  });

  // Windows is not going to allow these characters in filenames
  describe("constrain user provided ids", () => {
    it("should not allow non-alphanumerics in contract ids", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContract = m.contract("MyContract", [], {
            id: "MyContract:v2",
          });

          return { myContract };
        });
      }, /IGN702: Module validation failed with reason: The id "MyContract:v2" is invalid. Ids can only contain alphanumerics or underscores, and they must start with an alphanumeric character./);
    });

    it("should not allow non-alphanumerics in contractFromArtifact ids", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContract = m.contract(
            "MyContractFromArtifact",
            fakeArtifact,
            [],
            {
              id: "MyContractFromArtifact:v2",
            }
          );

          return { myContract };
        });
      }, /IGN702: Module validation failed with reason: The id "MyContractFromArtifact:v2" is invalid. Ids can only contain alphanumerics or underscores, and they must start with an alphanumeric character./);
    });

    it("should not allow non-alphanumerics in library ids", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const library = m.library("MyLibrary", {
            id: "MyLibrary:v2",
          });

          return { library };
        });
      }, /IGN702: Module validation failed with reason: The id "MyLibrary:v2" is invalid. Ids can only contain alphanumerics or underscores, and they must start with an alphanumeric character./);
    });

    it("should not allow non-alphanumerics in libraryFromArtifact ids", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myLibraryFromArtifact = m.library(
            "MyLibraryFromArtifact",
            fakeArtifact,
            {
              id: "MyLibraryFromArtifact:v2",
            }
          );

          return { myLibraryFromArtifact };
        });
      }, /IGN702: Module validation failed with reason: The id "MyLibraryFromArtifact:v2" is invalid. Ids can only contain alphanumerics or underscores, and they must start with an alphanumeric character./);
    });

    it("should not allow non-alphanumerics in call ids", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContract = m.contract("MyContract");

          m.call(myContract, "config", [], {
            id: "MyCall:v2",
          });

          return { myContract };
        });
      }, /IGN702: Module validation failed with reason: The id "MyCall:v2" is invalid. Ids can only contain alphanumerics or underscores, and they must start with an alphanumeric character./);
    });

    it("should not allow non-alphanumerics in static call ids", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContract = m.contract("MyContract");

          m.staticCall(myContract, "config", [], 0, {
            id: "MyStaticCall:v2",
          });

          return { myContract };
        });
      }, /IGN702: Module validation failed with reason: The id "MyStaticCall:v2" is invalid. Ids can only contain alphanumerics or underscores, and they must start with an alphanumeric character./);
    });

    it("should not allow non-alphanumerics in contractAt ids", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContractAt = m.contractAt("MyContract", exampleAddress, {
            id: "MyContractAt:v2",
          });

          return { myContractAt };
        });
      }, /IGN702: Module validation failed with reason: The id "MyContractAt:v2" is invalid. Ids can only contain alphanumerics or underscores, and they must start with an alphanumeric character./);
    });

    it("should not allow non-alphanumerics in contractAtFromArtifact ids", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContractAt = m.contractAt(
            "MyContract",
            exampleAddress,
            fakeArtifact,
            {
              id: "MyContractAt:v2",
            }
          );

          return { myContractAt };
        });
      }, /IGN702: Module validation failed with reason: The id "MyContractAt:v2" is invalid. Ids can only contain alphanumerics or underscores, and they must start with an alphanumeric character./);
    });

    it("should not allow non-alphanumerics in readEventArgument ids", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContract = m.contract("MyContract");

          m.readEventArgument(myContract, "MyEvent", "ArgName", {
            id: "MyReadEventArgument:v2",
          });

          return { myContract };
        });
      }, /IGN702: Module validation failed with reason: The id "MyReadEventArgument:v2" is invalid. Ids can only contain alphanumerics or underscores, and they must start with an alphanumeric character./);
    });

    it("should not allow non-alphanumerics in send id", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          m.send("MySend:v2", exampleAddress, 2n);

          return {};
        });
      }, /IGN702: Module validation failed with reason: The id "MySend:v2" is invalid. Ids can only contain alphanumerics or underscores, and they must start with an alphanumeric character./);
    });
  });

  describe("constrain contract names", () => {
    it("should not allow non-alphanumerics in contract name", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContract = m.contract("MyContract:v2");

          return { myContract };
        });
      }, /IGN702: Module validation failed with reason: The contract name "MyContract:v2" is invalid, make sure you use a valid identifier./);
    });

    it("should not allow non-alphanumerics in contractFromArtifact contract name", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContract = m.contract("MyContract:v2", fakeArtifact);

          return { myContract };
        });
      }, /IGN702: Module validation failed with reason: The contract name "MyContract:v2" is invalid, make sure you use a valid identifier./);
    });

    it("should not allow non-alphanumerics in library contract names", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const library = m.library("MyLibrary:v2");

          return { library };
        });
      }, /IGN702: Module validation failed with reason: The contract name "MyLibrary:v2" is invalid, make sure you use a valid identifier./);
    });

    it("should not allow non-alphanumerics in libraryFromArtifact contract names", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myLibraryFromArtifact = m.library(
            "MyLibraryFromArtifact:v2",
            fakeArtifact
          );

          return { myLibraryFromArtifact };
        });
      }, /IGN702: Module validation failed with reason: The contract name "MyLibraryFromArtifact:v2" is invalid, make sure you use a valid identifier./);
    });

    it("should not allow non-alphanumerics in contractAt contract names", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContractAt = m.contractAt("MyContract:v2", exampleAddress);

          return { myContractAt };
        });
      }, /IGN702: Module validation failed with reason: The contract name "MyContract:v2" is invalid, make sure you use a valid identifier./);
    });

    it("should not allow non-alphanumerics in contractAtFromArtifact contract names", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContractAt = m.contractAt(
            "MyContractAt:v2",
            exampleAddress,
            fakeArtifact
          );

          return { myContractAt };
        });
      }, /IGN702: Module validation failed with reason: The contract name "MyContractAt:v2" is invalid, make sure you use a valid identifier./);
    });
  });

  describe("constrain function names", () => {
    it("should not allow non-alphanumerics in call function names", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContract = m.contract("MyContract");

          m.call(myContract, "config:v2");

          return { myContract };
        });
      }, /IGN702: Module validation failed with reason: The function name "config:v2" is invalid, make sure you use a valid identifier./);
    });

    it("should not allow non-alphanumerics in static call ids", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContract = m.contract("MyContract");

          m.staticCall(myContract, "config:v2");

          return { myContract };
        });
      }, /IGN702: Module validation failed with reason: The function name "config:v2" is invalid, make sure you use a valid identifier./);
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
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContract = m.contract("MyContract");

          m.readEventArgument(myContract, "MyEvent:v2", "MyArg");

          return { myContract };
        });
      }, /IGN702: Module validation failed with reason: The event name "MyEvent:v2" is invalid, make sure you use a valid identifier./);
    });

    it("should allow ethers sytle event specification", () => {
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
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContract = m.contract("MyContract");

          m.readEventArgument(myContract, "MyEvent", "MyArg:v2");

          return { myContract };
        });
      }, /IGN702: Module validation failed with reason: The argument "MyArg:v2" is expected to have a valid name, but it's invalid./);
    });
  });
});
