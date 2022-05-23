import { assert } from "chai";
import fsExtra from "fs-extra";
import path from 'node:path';
// @ts-ignore
// eslint-disable-next-line  import/no-extraneous-dependencies
import Proxy from "proxy";

import { download } from "../../../src/internal/util/download";
import { useTmpDir } from "../../helpers/fs";

describe("Compiler List download", function () {
  useTmpDir("compiler-downloader");

  describe("Compilers list download", function () {
    it("Should call download with the right params", async function () {
      const compilersDir = this.tmpDir;
      const downloadPath = path.join(compilersDir, "downloadedCompiler");
      const expectedUrl = `https://solc-bin.ethereum.org/wasm/list.json`;

      // download the file
      await download(expectedUrl, downloadPath);
      // Assert that the file exists
      assert.isTrue(await fsExtra.pathExists(downloadPath));
    });
  });
});

describe("Compiler List download with proxy", function () {
  let env: typeof process.env;
  let proxy: any;
  let proxyPort: number;

  useTmpDir("compiler-downloader");

  before(function (done) {
    // Setup Proxy Server
    proxy = new Proxy();
    proxy.listen(function () {
      proxyPort = proxy.address().port;
      done();
    });
  });

  describe("Compilers list download with HTTPS_PROXY", function () {
    before(function () {
      // Save the Environment Settings and Set
      env = process.env;
      process.env.HTTPS_PROXY = `http://127.0.0.1:${proxyPort}`;
    });

    it("Should call download with the right params", async function () {
      const compilersDir = this.tmpDir;
      const downloadPath = path.join(compilersDir, "downloadedCompilerProxy");
      const expectedUrl = `http://solc-bin.ethereum.org/wasm/list.json`;

      // download the file
      await download(expectedUrl, downloadPath);
      // Assert that the file exists
      assert.isTrue(await fsExtra.pathExists(downloadPath));
    });

    after(function () {
      // restoring everything back to the environment
      process.env = env;
    });
  });

  describe("Compilers list download with HTTP_PROXY", function () {
    before(function () {
      // Save the Environment Settings and Set
      env = process.env;
      process.env.HTTP_PROXY = `http://127.0.0.1:${proxyPort}`;
    });

    it("Should call download with the right params", async function () {
      const compilersDir = this.tmpDir;
      const downloadPath = path.join(compilersDir, "downloadedCompilerProxy");
      const expectedUrl = `http://solc-bin.ethereum.org/wasm/list.json`;

      // download the file
      await download(expectedUrl, downloadPath);
      // Assert that the file exists
      assert.isTrue(await fsExtra.pathExists(downloadPath));
    });

    after(function () {
      // restoring everything back to the environment
      process.env = env;
    });
  });

  after(function (done) {
    // Shutdown Proxy Server
    proxy.once("close", function () {
      done();
    });
    proxy.close();
  });
});
