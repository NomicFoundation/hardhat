import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hexStringToBytes,
  utf8StringToBytes,
} from "@nomicfoundation/hardhat-utils/bytes";

import {
  formatInferredSolcVersion,
  getMetadataSectionBytesLength,
  inferSolcVersion,
} from "../src/internal/metadata.js";

describe("metadata", () => {
  describe("inferSolcVersion", () => {
    it("should return an exact compiler version", async () => {
      // Bytecode generated with Solidity 0.5.9
      const solc059Bytecode = hexStringToBytes(
        "0x6080604052348015600f57600080fd5b50603e80601d6000396000f3fe6080604052600080fdfea265627a7a723058201d7a6a3b37a66e79d9dd0abb90d493ba6ba82af0d76bf7bcbd53aa63fad4316664736f6c63430005090032",
      );
      // Bytecode generated with Solidity 0.8.19
      const solc0819Bytecode = hexStringToBytes(
        "0x6080604052348015600f57600080fd5b50603f80601d6000396000f3fe6080604052600080fdfea26469706673582212205a428cebe312fc68fec73aec069d4922dd88c8404183b33f93424ee0ee18423b64736f6c63430008130033",
      );

      assert.deepEqual(await inferSolcVersion(solc059Bytecode), {
        type: "exact",
        version: [0, 5, 9],
      });
      assert.deepEqual(await inferSolcVersion(solc0819Bytecode), {
        type: "exact",
        version: [0, 8, 19],
      });
    });

    it("should return the lessThan-0.4.7 fallback when metadata can't be decoded", async () => {
      const emptyBytecode = new Uint8Array([0, 0]);
      const noBytecode = utf8StringToBytes("This is no contract bytecode.");
      // Bytecode generated with Solidity 0.4.6
      const noMetadataBytecode = hexStringToBytes(
        "0x6060604052346000575b60098060156000396000f360606040525b600056",
      );

      const expected = { type: "lessThan", bound: [0, 4, 7] };
      assert.deepEqual(await inferSolcVersion(emptyBytecode), expected);
      assert.deepEqual(await inferSolcVersion(noBytecode), expected);
      assert.deepEqual(await inferSolcVersion(noMetadataBytecode), expected);
    });

    it("should return the 0.4.7-to-0.5.8 fallback when metadata has no version field", async () => {
      // Bytecode generated with Solidity 0.4.7
      const solc047Bytecode = hexStringToBytes(
        "0x6060604052346000575b60358060166000396000f30060606040525b60005600a165627a7a7230582074ab9e158d4cb2b2c83bd9efe2ee6bd219f3e2cda7d80ddfe56a1e844f81a2950029",
      );
      // Bytecode generated with Solidity 0.5.8
      const solc058Bytecode = hexStringToBytes(
        "0x6080604052348015600f57600080fd5b50603580601d6000396000f3fe6080604052600080fdfea165627a7a723058209251767f58375bfe02f871bf86ffdae7ab9f6503c50146effb0e7bf96e5a0db90029",
      );

      const expected = {
        type: "between",
        min: [0, 4, 7],
        max: [0, 5, 8],
      };
      assert.deepEqual(await inferSolcVersion(solc047Bytecode), expected);
      assert.deepEqual(await inferSolcVersion(solc058Bytecode), expected);
    });
  });

  describe("formatInferredSolcVersion", () => {
    it("should format an exact version as x.y.z", () => {
      assert.equal(
        formatInferredSolcVersion({ type: "exact", version: [0, 8, 19] }),
        "0.8.19",
      );
    });

    it("should format a lessThan bound as <x.y.z", () => {
      assert.equal(
        formatInferredSolcVersion({ type: "lessThan", bound: [0, 4, 7] }),
        "<0.4.7",
      );
    });

    it("should format a between range as 'x.y.z - x.y.z'", () => {
      assert.equal(
        formatInferredSolcVersion({
          type: "between",
          min: [0, 4, 7],
          max: [0, 5, 8],
        }),
        "0.4.7 - 0.5.8",
      );
    });
  });

  describe("getMetadataSectionBytesLength", () => {
    it("should return the length of the metadata section", () => {
      const solc0819Bytecode = hexStringToBytes(
        "0x6080604052348015600f57600080fd5b50603f80601d6000396000f3fe6080604052600080fdfea26469706673582212205a428cebe312fc68fec73aec069d4922dd88c8404183b33f93424ee0ee18423b64736f6c63430008130033",
      );

      assert.equal(getMetadataSectionBytesLength(solc0819Bytecode), 53);
    });
  });
});
