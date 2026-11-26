import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatInferredSolcVersion,
  parseBytecodeMetadata,
} from "../src/internal/metadata.js";

describe("metadata", () => {
  describe("parseBytecodeMetadata", () => {
    it("should return an exact compiler version", () => {
      // Bytecode generated with Solidity 0.5.9
      const solc059Bytecode =
        "0x6080604052348015600f57600080fd5b50603e80601d6000396000f3fe6080604052600080fdfea265627a7a723058201d7a6a3b37a66e79d9dd0abb90d493ba6ba82af0d76bf7bcbd53aa63fad4316664736f6c63430005090032";
      // Bytecode generated with Solidity 0.8.19
      const solc0819Bytecode =
        "0x6080604052348015600f57600080fd5b50603f80601d6000396000f3fe6080604052600080fdfea26469706673582212205a428cebe312fc68fec73aec069d4922dd88c8404183b33f93424ee0ee18423b64736f6c63430008130033";

      assert.deepEqual(parseBytecodeMetadata(solc059Bytecode).solcVersion, {
        type: "exact",
        version: [0, 5, 9],
      });
      assert.deepEqual(parseBytecodeMetadata(solc0819Bytecode).solcVersion, {
        type: "exact",
        version: [0, 8, 19],
      });
    });

    it("should keep the entire bytecode when it has no Solidity metadata", () => {
      for (const bytecode of [
        "",
        "ab", // Too short to contain a length field.
        "0123ffff", // The claimed metadata doesn't fit.
        "6000fd0001", // The claimed payload isn't valid CBOR.
        "6000a00001", // The claimed payload is valid CBOR, but isn't Solidity metadata.
        // Bytecode generated with Solidity 0.4.6.
        "6060604052346000575b60098060156000396000f360606040525b600056",
      ]) {
        assert.deepEqual(parseBytecodeMetadata(`0x${bytecode}`), {
          executableSection: bytecode,
          solcVersion: { type: "unknown" },
        });
      }
    });

    it("should return the 0.4.7-to-0.5.8 fallback when metadata has no version field", () => {
      // Bytecode generated with Solidity 0.4.7
      const solc047Bytecode =
        "0x6060604052346000575b60358060166000396000f30060606040525b60005600a165627a7a7230582074ab9e158d4cb2b2c83bd9efe2ee6bd219f3e2cda7d80ddfe56a1e844f81a2950029";
      // Bytecode generated with Solidity 0.5.8
      const solc058Bytecode =
        "0x6080604052348015600f57600080fd5b50603580601d6000396000f3fe6080604052600080fdfea165627a7a723058209251767f58375bfe02f871bf86ffdae7ab9f6503c50146effb0e7bf96e5a0db90029";

      const expected = {
        type: "between",
        min: [0, 4, 7],
        max: [0, 5, 8],
      };
      assert.deepEqual(
        parseBytecodeMetadata(solc047Bytecode).solcVersion,
        expected,
      );
      assert.deepEqual(
        parseBytecodeMetadata(solc058Bytecode).solcVersion,
        expected,
      );
    });
  });

  describe("formatInferredSolcVersion", () => {
    it("should format an exact version as x.y.z", () => {
      assert.equal(
        formatInferredSolcVersion({ type: "exact", version: [0, 8, 19] }),
        "0.8.19",
      );
    });

    it("should format an unknown version", () => {
      assert.equal(formatInferredSolcVersion({ type: "unknown" }), "unknown");
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
});
