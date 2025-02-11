import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { createMasterKey } from "../../src/internal/keystores/encryption.js";
import { KeystoreFileLoader } from "../../src/internal/loaders/keystore-file-loader.js";
import { MockFileManager } from "../helpers/mock-file-manager.js";
import { TEST_PASSWORD } from "../helpers/test-password.js";

const fakeKeystoreFilePath = "./fake-keystore-path.json";

describe("KeystoreFileLoader", () => {
  let masterKey: Uint8Array;

  describe("keystore file validation", () => {
    describe("when the keystore file is valid on disk", () => {
      let keystoreLoader: KeystoreFileLoader;

      beforeEach(async () => {
        const mockFileManager = new MockFileManager();

        mockFileManager.setupExistingKeystoreFile({ myKey: "myValue" });

        keystoreLoader = new KeystoreFileLoader(
          fakeKeystoreFilePath,
          mockFileManager,
        );

        masterKey = mockFileManager.masterKey;
      });

      it("should load the keystore", async () => {
        const keystore = await keystoreLoader.loadKeystore();

        const value = await keystore.readValue("myKey", masterKey);

        assert.equal(value, "myValue");
      });
    });
  });

  describe("keystore caching", () => {
    describe("when the keystore has not been loaded", () => {
      let keystoreLoader: KeystoreFileLoader;
      let mockFileManager: MockFileManager;

      beforeEach(async () => {
        mockFileManager = new MockFileManager();

        mockFileManager.setupExistingKeystoreFile({ myKey: "myValue" });

        keystoreLoader = new KeystoreFileLoader(
          fakeKeystoreFilePath,
          mockFileManager,
        );
      });

      it("should determine if the keystore exists based on the file system", async () => {
        assert.ok(
          await keystoreLoader.isKeystoreInitialized(),
          "keystore should exist",
        );

        assert.equal(mockFileManager.fileExists.mock.callCount(), 1);
      });
    });

    describe("when the keystore has been loaded from file", () => {
      let keystoreLoader: KeystoreFileLoader;
      let mockFileManager: MockFileManager;

      beforeEach(async () => {
        mockFileManager = new MockFileManager();

        mockFileManager.setupExistingKeystoreFile({ myKey: "myValue" });

        keystoreLoader = new KeystoreFileLoader(
          fakeKeystoreFilePath,
          mockFileManager,
        );
      });

      it("should return the same keystore no matter how many loads", async () => {
        const load1 = await keystoreLoader.loadKeystore();
        const load2 = await keystoreLoader.loadKeystore();

        assert.equal(load1, load2, "keystores should be the same instance");
      });
    });

    describe("when the keystore is initialized in memory", () => {
      let keystoreLoader: KeystoreFileLoader;
      let mockFileManager: MockFileManager;

      beforeEach(async () => {
        mockFileManager = new MockFileManager();

        mockFileManager.setupNoKeystoreFile();

        keystoreLoader = new KeystoreFileLoader(
          fakeKeystoreFilePath,
          mockFileManager,
        );
      });

      it("should return the same keystore for subsequent loads", async () => {
        const createdVersion = await keystoreLoader.createUnsavedKeystore(
          createMasterKey({
            password: TEST_PASSWORD,
          }),
        );

        const loadedVersion = await keystoreLoader.loadKeystore();

        assert.equal(
          createdVersion,
          loadedVersion,
          "keystores should be the same instance",
        );
      });
    });
  });
});
