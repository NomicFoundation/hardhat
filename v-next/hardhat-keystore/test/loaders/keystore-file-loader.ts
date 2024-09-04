import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { UnencryptedKeystore } from "../../src/internal/keystores/unencrypted-keystore.js";
import { KeystoreFileLoader } from "../../src/internal/loaders/keystore-file-loader.js";
import { MockFileManager } from "../helpers/mock-file-manager.js";

const fakeKeystoreFilePath = "./fake-keystore-path.json";

describe("KeystoreFileLoader", () => {
  describe("keystore file validation", () => {
    describe("when the keystore file is valid on disk", () => {
      let keystoreLoader: KeystoreFileLoader;

      beforeEach(async () => {
        const mockFileManager = new MockFileManager();

        mockFileManager.setupExistingKeystoreFile({ mykey: "myvalue" });

        keystoreLoader = new KeystoreFileLoader(
          fakeKeystoreFilePath,
          mockFileManager,
        );
      });

      it("should load the keystore", async () => {
        const keystore = await keystoreLoader.load();

        const value = await keystore.readValue("mykey");

        assert.equal(value, "myvalue");
      });
    });
  });

  describe("when the keystore file is invalid on disk", () => {
    let keystoreLoader: KeystoreFileLoader;

    beforeEach(async () => {
      const mockFileManager = new MockFileManager();

      const invalidKeystore =
        UnencryptedKeystore.createEmptyUnencryptedKeystoreFile();
      invalidKeystore._format =
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing invalid format
        "invalid" as unknown as "hh-unencrypted-keystore";

      mockFileManager.setKeystoreFile(invalidKeystore);

      keystoreLoader = new KeystoreFileLoader(
        fakeKeystoreFilePath,
        mockFileManager,
      );
    });

    it("should throw on attempted load", async () => {
      await assertRejectsWithHardhatError(
        async () => keystoreLoader.load(),
        HardhatError.ERRORS.KEYSTORE.INVALID_KEYSTORE_FILE_FORMAT,
        {},
      );
    });
  });
});
