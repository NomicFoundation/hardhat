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
      }, /The moduleId "MyModule:v2" contains banned characters, ids can only contain alphanumerics, underscores or dashes/);
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
      }, /The id "MyContract:v2" contains banned characters, ids can only contain alphanumerics, underscores or dashes/);
    });

    it("should not allow non-alphanumerics in contractFromArtifact ids", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContract = m.contractFromArtifact(
            "MyContractFromArtifact",
            fakeArtifact,
            [],
            {
              id: "MyContractFromArtifact:v2",
            }
          );

          return { myContract };
        });
      }, /The id "MyContractFromArtifact:v2" contains banned characters, ids can only contain alphanumerics, underscores or dashes/);
    });

    it("should not allow non-alphanumerics in library ids", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const library = m.library("MyLibrary", {
            id: "MyLibrary:v2",
          });

          return { library };
        });
      }, /The id "MyLibrary:v2" contains banned characters, ids can only contain alphanumerics, underscores or dashes/);
    });

    it("should not allow non-alphanumerics in libraryFromArtifact ids", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myLibraryFromArtifact = m.libraryFromArtifact(
            "MyLibraryFromArtifact",
            fakeArtifact,
            {
              id: "MyLibraryFromArtifact:v2",
            }
          );

          return { myLibraryFromArtifact };
        });
      }, /The id "MyLibraryFromArtifact:v2" contains banned characters, ids can only contain alphanumerics, underscores or dashes/);
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
      }, /The id "MyCall:v2" contains banned characters, ids can only contain alphanumerics, underscores or dashes/);
    });

    it("should not allow non-alphanumerics in static call ids", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContract = m.contract("MyContract");

          m.staticCall(myContract, "config", [], {
            id: "MyStaticCall:v2",
          });

          return { myContract };
        });
      }, /The id "MyStaticCall:v2" contains banned characters, ids can only contain alphanumerics, underscores or dashes/);
    });

    it("should not allow non-alphanumerics in contractAt ids", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContractAt = m.contractAt("MyContract", exampleAddress, {
            id: "MyContractAt:v2",
          });

          return { myContractAt };
        });
      }, /The id "MyContractAt:v2" contains banned characters, ids can only contain alphanumerics, underscores or dashes/);
    });

    it("should not allow non-alphanumerics in contractAtFromArtifact ids", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContractAt = m.contractAtFromArtifact(
            "MyContract",
            exampleAddress,
            fakeArtifact,
            {
              id: "MyContractAt:v2",
            }
          );

          return { myContractAt };
        });
      }, /The id "MyContractAt:v2" contains banned characters, ids can only contain alphanumerics, underscores or dashes/);
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
      }, /The id "MyReadEventArgument:v2" contains banned characters, ids can only contain alphanumerics, underscores or dashes/);
    });

    it("should not allow non-alphanumerics in send id", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          m.send("MySend:v2", exampleAddress, 2n);

          return {};
        });
      }, /The id "MySend:v2" contains banned characters, ids can only contain alphanumerics, underscores or dashes/);
    });
  });

  describe("constrain contract names", () => {
    it("should not allow non-alphanumerics in contract name", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContract = m.contract("MyContract:v2");

          return { myContract };
        });
      }, /The contract "MyContract:v2" contains banned characters, contract names can only contain alphanumerics, underscores or dollar signs/);
    });

    it("should not allow non-alphanumerics in contractFromArtifact contract name", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContract = m.contractFromArtifact(
            "MyContract:v2",
            fakeArtifact
          );

          return { myContract };
        });
      }, /The contract "MyContract:v2" contains banned characters, contract names can only contain alphanumerics, underscores or dollar signs/);
    });

    it("should not allow non-alphanumerics in library contract names", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const library = m.library("MyLibrary:v2");

          return { library };
        });
      }, /The contract "MyLibrary:v2" contains banned characters, contract names can only contain alphanumerics, underscores or dollar signs/);
    });

    it("should not allow non-alphanumerics in libraryFromArtifact contract names", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myLibraryFromArtifact = m.libraryFromArtifact(
            "MyLibraryFromArtifact:v2",
            fakeArtifact
          );

          return { myLibraryFromArtifact };
        });
      }, /The contract "MyLibraryFromArtifact:v2" contains banned characters, contract names can only contain alphanumerics, underscores or dollar signs/);
    });

    it("should not allow non-alphanumerics in contractAt contract names", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContractAt = m.contractAt("MyContract:v2", exampleAddress);

          return { myContractAt };
        });
      }, /The contract "MyContract:v2" contains banned characters, contract names can only contain alphanumerics, underscores or dollar signs/);
    });

    it("should not allow non-alphanumerics in contractAtFromArtifact contract names", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContractAt = m.contractAtFromArtifact(
            "MyContractAt:v2",
            exampleAddress,
            fakeArtifact
          );

          return { myContractAt };
        });
      }, /The contract "MyContractAt:v2" contains banned characters, contract names can only contain alphanumerics, underscores or dollar signs/);
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
      }, /The function name "config:v2" contains banned characters, contract names can only contain alphanumerics, underscores or dollar signs/);
    });

    it("should not allow non-alphanumerics in static call ids", () => {
      assert.throws(() => {
        buildModule("MyModule", (m) => {
          const myContract = m.contract("MyContract");

          m.staticCall(myContract, "config:v2");

          return { myContract };
        });
      }, /The function name "config:v2" contains banned characters, contract names can only contain alphanumerics, underscores or dollar signs/);
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
      }, /The event "MyEvent:v2" contains banned characters, event names can only contain alphanumerics, underscores or dollar signs/);
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
      }, /The argument "MyArg:v2" contains banned characters, argument names can only contain alphanumerics, underscores or dollar signs/);
    });
  });
});
