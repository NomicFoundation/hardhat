import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { after, beforeEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertRejects,
  createTmpDir,
} from "@nomicfoundation/hardhat-test-utils";
import { chmod, remove } from "@nomicfoundation/hardhat-utils/fs";

import { createMasterKey } from "../../src/internal/keystores/encryption.js";
import { setUpPasswordForDevKeystore } from "../../src/internal/keystores/password.js";
import { FileManagerImpl } from "../../src/internal/loaders/file-manager.js";
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
  "fake-keystore-hardhat.checksum-path-loader",
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
              await mockFileManager.writePasswordFileForDevKeystore(
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
              await mockFileManager.writePasswordFileForDevKeystore(
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
              await mockFileManager.writePasswordFileForDevKeystore(
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
              await mockFileManager.writePasswordFileForDevKeystore(
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
              await mockFileManager.writePasswordFileForDevKeystore(
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

describe(
  "FileManagerImpl permissions",
  { skip: process.platform === "win32" },
  () => {
    const tmp = createTmpDir("keystore-perms", "test");
    const emptyKeystore = new MockFileManager(false).setupExistingKeystoreFile(
      {},
    );
    const getMode = async (p: string) =>
      // eslint-disable-next-line no-bitwise -- Bitwise is common in fs permissions
      (await fsPromises.stat(p)).mode & 0o777;
    const writeBoth = async (dirPath: string) => {
      const ks = path.join(dirPath, "keystore.json");
      const pw = path.join(dirPath, "hardhat.checksum");
      await new FileManagerImpl().writeJsonFile(ks, emptyKeystore);
      await setUpPasswordForDevKeystore(pw);
      return [await getMode(dirPath), await getMode(ks), await getMode(pw)];
    };

    it("creates missing directories with 0700 and keystore files with 0600", async () => {
      assert.deepEqual(
        await writeBoth(path.join(tmp.path, "nested")),
        [0o700, 0o600, 0o600],
      );
    });

    it("tightens existing 0644 files and the global config directory", async () => {
      await chmod(tmp.path, 0o755);
      for (const name of ["keystore.json", "hardhat.checksum"]) {
        const filePath = path.join(tmp.path, name);
        await fsPromises.writeFile(filePath, "{}");
        await chmod(filePath, 0o644);
      }

      assert.deepEqual(await writeBoth(tmp.path), [0o755, 0o600, 0o600]);

      const probe = `
        import fs from "node:fs";
        import path from "node:path";
        import { getConfigDir } from "@nomicfoundation/hardhat-utils/global-dir";
        import { setUpPasswordForDevKeystore } from "./dist/src/internal/keystores/password.js";
        const dir = await getConfigDir();
        const file = path.join(dir, "hardhat.checksum");
        await setUpPasswordForDevKeystore(file);
        process.stdout.write(JSON.stringify([fs.statSync(dir).mode & 0o777, fs.statSync(file).mode & 0o777]));
      `;
      const cwd = fileURLToPath(new URL("../..", import.meta.url));
      const env = {
        ...process.env,
        HOME: path.join(tmp.path, "home"),
        XDG_CONFIG_HOME: path.join(tmp.path, "xdg"),
      };
      const out = execFileSync(
        process.execPath,
        ["--input-type=module", "-e", probe],
        { cwd, env, encoding: "utf8" },
      );

      assert.deepEqual(JSON.parse(out), [0o700, 0o600]);
    });
  },
);
