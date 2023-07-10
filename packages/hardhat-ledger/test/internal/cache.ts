import { assert } from "chai";
import envPaths from "env-paths";
import fs from "fs-extra";
import sinon from "sinon";
import path from "path";

import * as cache from "../../src/internal/cache";

describe("cache", () => {
  let fsStub: sinon.SinonStubbedInstance<typeof fs>;
  let cacheDir: string;

  beforeEach(() => {
    const { cache: cachePath } = envPaths("hardhat");

    cacheDir = path.join(cachePath, "ledger", cache.CACHE_FILE_NAME);
    fsStub = sinon.stub(fs);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("write", () => {
    it("should write the supplied json to the ledger cache file", async () => {
      const json = { some: "json" };
      await cache.write(json);

      // We need to do this by hand cause sinon does not play nice with overloads
      const args = fsStub.writeJSON.getCall(0).args;

      assert.equal(args.length, 2);
      assert.equal(args[0], cacheDir);
      assert.deepEqual(args[1], json);
    });
  });

  describe("read", () => {
    it("should read the ledger cache file", async () => {
      const json = { another: "json" };

      // We need to do this cast cause sinon does not play nice with overloads
      fsStub.readJSON.returns(Promise.resolve(json) as any);

      const result = await cache.read();

      assert.deepEqual(result, json);
    });
  });
});
