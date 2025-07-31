import assert from "node:assert/strict";
import path from "node:path";
import { after, beforeEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { assertRejects } from "@nomicfoundation/hardhat-test-utils";
import { remove } from "@nomicfoundation/hardhat-utils/fs";

import { createMasterKey } from "../../src/internal/keystores/encryption.js";
import { KeystoreFileLoader } from "../../src/internal/loaders/keystore-file-loader.js";
import { MockFileManager } from "../helpers/mock-file-manager.js";
import {
  TEST_PASSWORD_DEV,
  TEST_PASSWORD_PROD,
} from "../helpers/test-password.js";

const fakeKeystoreProdFilePath = "./fake-keystore-path.json";
const fakeKeystoreDevFilePath = "./fake-keystore-dev-path.json";
const fakeKeystoreDevPasswordFilePath = path.join(
  fileURLToPath(import.meta.url),
  "..",
  "..",
  "fixture-projects",
  "keystore",
  "fake-keystore-dev-password-path-loader.txt",
);

describe("KeystoreFileLoader", () => {
  let masterKey: Uint8Array;

  after(async () => {
    await remove(fakeKeystoreDevPasswordFilePath);
  });

  for (const dev of [false, true]) {
    const fakeKeystoreFilePath = dev
      ? fakeKeystoreDevFilePath
      : fakeKeystoreProdFilePath;

    describe(`${dev ? "development" : "production"} keystore`, () => {
      describe("keystore file validation", () => {
        describe("when the keystore file is valid on disk", () => {
          let keystoreLoader: KeystoreFileLoader;

          beforeEach(async () => {
            const mockFileManager = new MockFileManager(dev);

            if (dev) {
              await mockFileManager.writePAsswordFileForDevKeystore(
                fakeKeystoreDevPasswordFilePath,
              );
            }

            mockFileManager.setupExistingKeystoreFile({ myKey: "myValue" });

            keystoreLoader = new KeystoreFileLoader(
              fakeKeystoreFilePath,
              fakeKeystoreDevPasswordFilePath,
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

        describe("when the keystore file is invalid on disk and the user tries to read it", () => {
          let mockFileManager: MockFileManager;

          beforeEach(async () => {
            mockFileManager = new MockFileManager(dev);

            if (dev) {
              await mockFileManager.writePAsswordFileForDevKeystore(
                fakeKeystoreDevPasswordFilePath,
              );
            }

            mockFileManager.setupExistingKeystoreFile({ myKey: "myValue" });

            masterKey = mockFileManager.masterKey;

            // Modify the keystore file to intentionally corrupt it.
            const encryptedFile =
              await mockFileManager.readJsonFile(fakeKeystoreFilePath);

            encryptedFile.hmac = "corrupted-hmac";

            await mockFileManager.writeJsonFile(
              fakeKeystoreFilePath,
              encryptedFile,
            );
          });

          it("should load the keystore", async () => {
            const keystoreLoader = new KeystoreFileLoader(
              fakeKeystoreFilePath,
              fakeKeystoreDevPasswordFilePath,
              mockFileManager,
            );

            const keystore = await keystoreLoader.loadKeystore();

            await assertRejects(
              keystore.readValue("myKey", masterKey),
              (err) => err.message === "Invalid hmac in keystore",
            );
          });
        });
      });

      describe("keystore caching", () => {
        describe("when the keystore has not been loaded", () => {
          let keystoreLoader: KeystoreFileLoader;
          let mockFileManager: MockFileManager;

          beforeEach(async () => {
            mockFileManager = new MockFileManager(dev);

            if (dev) {
              await mockFileManager.writePAsswordFileForDevKeystore(
                fakeKeystoreDevPasswordFilePath,
              );
            }

            mockFileManager.setupExistingKeystoreFile({ myKey: "myValue" });

            keystoreLoader = new KeystoreFileLoader(
              fakeKeystoreFilePath,
              fakeKeystoreDevPasswordFilePath,
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
            mockFileManager = new MockFileManager(dev);

            if (dev) {
              await mockFileManager.writePAsswordFileForDevKeystore(
                fakeKeystoreDevPasswordFilePath,
              );
            }

            mockFileManager.setupExistingKeystoreFile({ myKey: "myValue" });

            keystoreLoader = new KeystoreFileLoader(
              fakeKeystoreFilePath,
              fakeKeystoreDevPasswordFilePath,
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
            mockFileManager = new MockFileManager(dev);

            if (dev) {
              await mockFileManager.writePAsswordFileForDevKeystore(
                fakeKeystoreDevPasswordFilePath,
              );
            }

            mockFileManager.setupNoKeystoreFile();

            keystoreLoader = new KeystoreFileLoader(
              fakeKeystoreFilePath,
              fakeKeystoreDevPasswordFilePath,
              mockFileManager,
            );
          });

          it("should return the same keystore for subsequent loads", async () => {
            const createdVersion = await keystoreLoader.createUnsavedKeystore(
              createMasterKey({
                password: dev ? TEST_PASSWORD_DEV : TEST_PASSWORD_PROD,
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
  }
});
