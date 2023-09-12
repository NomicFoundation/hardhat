import { assert } from "chai";

import { buildModule } from "../../src/build-module";
import { fakeArtifact } from "../helpers";

describe("id rules", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

  // Windows is not going to allow these characters in filenames
  describe("ban colons and other non-alphanumeric characters", () => {
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
  });
});
