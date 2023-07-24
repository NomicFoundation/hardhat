/* eslint-disable import/no-unused-modules */
import { expect } from "chai";

import { collectLibrariesAndLink } from "../src/new-api/internal/utils/collectLibrariesAndLink";

describe("collectLibrariesAndLink", function () {
  describe("library linking needed", () => {
    it("should substitute in the bytecode via fully qualified name", async () => {
      const artifact = {
        linkReferences: {
          "contracts/WithLibrary.sol": {
            RubbishMath: [
              {
                start: 2,
                length: 10,
              },
            ],
          },
        },
        bytecode: "0x1111$__634881ae738573__$1111",
      } as any;

      const libraries = {
        RubbishMath: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      };

      const result = await collectLibrariesAndLink(artifact, libraries);

      expect(result).to.equal(
        "0x11115FbDB2315678afecb367f032d93F642f64180aa31111"
      );
    });

    it("should substitute in the bytecode via a library name", async () => {
      const artifact = {
        linkReferences: {
          WithLibrary: {
            RubbishMath: [
              {
                start: 2,
                length: 10,
              },
            ],
          },
        },
        bytecode: "0x1111$__634881ae738573__$1111",
      } as any;

      const libraries = {
        RubbishMath: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      };

      const result = await collectLibrariesAndLink(artifact, libraries);

      expect(result).to.equal(
        "0x11115FbDB2315678afecb367f032d93F642f64180aa31111"
      );
    });

    it("should throw if the given library address is invalid", async () => {
      const artifact = {
        contractName: "DependsOnLib",
        linkReferences: {
          "contracts/WithLibrary.sol": {
            RubbishMath: [
              {
                start: 2,
                length: 10,
              },
            ],
          },
        },
        bytecode: "0x1111$__634881ae738573__$1111",
      } as any;

      const libraries = {
        RubbishMath: "0x1234",
      };

      const promise = collectLibrariesAndLink(artifact, libraries);

      await expect(promise).to.eventually.be.rejectedWith(
        /You tried to link the contract DependsOnLib with the library RubbishMath, but provided this invalid address: 0x1234/
      );
    });

    it("should throw if the given library name is wrong", async () => {
      const artifact = {
        contractName: "DependsOnLib",
        linkReferences: {
          "contracts/WithLibrary.sol": {
            RubbishMath: [
              {
                start: 2,
                length: 10,
              },
            ],
          },
        },
        bytecode: "0x1111$__634881ae738573__$1111",
      } as any;

      const libraries = {
        NotRubbishMath: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      };

      const promise = collectLibrariesAndLink(artifact, libraries);

      await expect(promise).to.eventually.be.rejectedWith(
        /You tried to link the contract DependsOnLib with NotRubbishMath, which is not one of its libraries./
      );
    });

    it("should throw if libraries included that aren't needed", async () => {
      const artifact = {
        contractName: "DependsOnLib",
        linkReferences: {},
        bytecode: "0x1111$__634881ae738573__$1111",
      } as any;

      const libraries = {
        RubbishMath: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      };

      const promise = collectLibrariesAndLink(artifact, libraries);

      await expect(promise).to.eventually.be.rejectedWith(
        /This contract doesn't need linking any libraries./
      );
    });

    it("should throw if there is a missing linked library", async () => {
      const artifact = {
        contractName: "DependsOnLib",
        linkReferences: {
          "contracts/WithLibrary.sol": {
            RubbishMath: [
              {
                start: 2,
                length: 10,
              },
            ],
          },
        },
        bytecode: "0x1111$__634881ae738573__$1111",
      } as any;

      const libraries = {};

      const promise = collectLibrariesAndLink(artifact, libraries);

      await expect(promise).to.eventually.be.rejectedWith(
        /The contract DependsOnLib is missing links for the following libraries:/
      );
    });

    it("should throw if ambiguity in link references", async () => {
      const artifact = {
        contractName: "WithLibrary",
        linkReferences: {
          "contracts/WithLibrary.sol": {
            RubbishMath: [
              {
                start: 2,
                length: 10,
              },
            ],
          },
          WithLibrary: {
            RubbishMath: [
              {
                start: 2,
                length: 10,
              },
            ],
          },
        },
        bytecode: "0x1111$__634881ae738573__$1111",
      } as any;

      const libraries = {
        RubbishMath: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      };

      const promise = collectLibrariesAndLink(artifact, libraries);

      await expect(promise).to.eventually.be.rejectedWith(
        /The library name RubbishMath is ambiguous for the contract WithLibrary/
      );
    });

    it("should throw if ambiguity in libraries", async () => {
      const artifact = {
        contractName: "WithLibrary",
        linkReferences: {
          "contracts/WithLibrary.sol": {
            RubbishMath: [
              {
                start: 2,
                length: 10,
              },
            ],
          },
        },
        bytecode: "0x1111$__634881ae738573__$1111",
      } as any;

      const libraries = {
        RubbishMath: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        "contracts/WithLibrary.sol:RubbishMath":
          "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      };

      const promise = collectLibrariesAndLink(artifact, libraries);

      await expect(promise).to.eventually.be.rejectedWith(
        /The library names RubbishMath and contracts\/WithLibrary.sol:RubbishMath refer to the same library and were given as two separate library links./
      );
    });
  });

  describe("no libary linking needed", () => {
    it("should return the bytecode unchanged", async () => {
      const artifact = { linkReferences: {}, bytecode: "0x12345" } as any;
      const libraries = {};

      const result = await collectLibrariesAndLink(artifact, libraries);

      expect(result).to.equal("0x12345");
    });
  });
});
