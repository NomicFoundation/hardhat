import { assert } from "chai";
import fsExtra from "fs-extra";
import path from "path";

import { download } from "../../../src/internal/util/download";
import { useTmpDir } from "../../helpers/fs";

describe("Compiler List download", function () {
  useTmpDir("compiler-downloader");

  describe("Compilers list download", function () {
    it("Should call download with the right params", async function () {
      const compilersDir = this.tmpDir;
      const downloadPath = path.join(compilersDir, "downloadedCompiler");
      const expectedUrl = `https://binaries.soliditylang.org/wasm/list.json`;

      // download the file
      await download(expectedUrl, downloadPath);
      // Assert that the file exists
      assert.isTrue(await fsExtra.pathExists(downloadPath));
    });
  });
});
