import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import os from "node:os";

import { assert } from "chai";
import sinon from "sinon";

import { open } from "../../src/internal/utils/open.js";

describe("open", function () {
  let execSyncStub: sinon.SinonStub;

  beforeEach(function () {
    execSyncStub = sinon.stub(childProcess, "execSync");
    // open.ts uses a named import, so the stub has to be synced into it
    syncBuiltinESMExports();
  });

  afterEach(function () {
    execSyncStub.restore();
    syncBuiltinESMExports();
  });

  const cases: Array<[NodeJS.Platform, string, string]> = [
    [
      "win32",
      "C:\\Users\\John Doe\\project\\cache\\visualization\\index.html",
      'start "" "C:\\Users\\John Doe\\project\\cache\\visualization\\index.html"',
    ],
    [
      "darwin",
      "/Users/john/My Projects/project/cache/visualization/index.html",
      'open "/Users/john/My Projects/project/cache/visualization/index.html"',
    ],
    [
      "linux",
      "/home/john/My Projects/project/cache/visualization/index.html",
      'xdg-open "/home/john/My Projects/project/cache/visualization/index.html"',
    ],
  ];

  for (const [platform, filePath, expectedCommand] of cases) {
    it(`should quote a path with spaces on ${platform}`, function () {
      sinon.stub(os, "platform").returns(platform);

      open(filePath);

      assert.equal(execSyncStub.callCount, 1);
      assert.equal(execSyncStub.firstCall.args[0], expectedCommand);
    });
  }
});
