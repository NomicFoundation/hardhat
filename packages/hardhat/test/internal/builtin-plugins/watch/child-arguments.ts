import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hasWatchFlag,
  removeWatchArguments,
} from "../../../../src/internal/builtin-plugins/watch/child-arguments.js";

describe("watch/child-arguments", () => {
  describe("hasWatchFlag", () => {
    it("detects --watch and -w", () => {
      assert.equal(hasWatchFlag(["test", "--watch"]), true);
      assert.equal(hasWatchFlag(["-w", "test"]), true);
    });

    it("returns false without a watch flag", () => {
      assert.equal(hasWatchFlag(["test", "--watch-delay", "10"]), false);
      assert.equal(hasWatchFlag([]), false);
    });
  });

  describe("removeWatchArguments", () => {
    it("removes the watch flags and keeps everything else in order", () => {
      assert.deepEqual(
        removeWatchArguments([
          "--network",
          "localhost",
          "test",
          "--watch",
          "--no-restart",
          "--run-all",
          "--grep",
          "Counter",
          "test/Counter.t.sol",
        ]),
        [
          "--network",
          "localhost",
          "test",
          "--grep",
          "Counter",
          "test/Counter.t.sol",
        ],
      );
    });

    it("removes the -w short name", () => {
      assert.deepEqual(removeWatchArguments(["build", "-w", "--quiet"]), [
        "build",
        "--quiet",
      ]);
    });

    it("removes --watch-delay with its value, in both forms", () => {
      assert.deepEqual(
        removeWatchArguments(["test", "--watch", "--watch-delay", "200"]),
        ["test"],
      );
      assert.deepEqual(
        removeWatchArguments(["test", "--watch-delay=200", "-w", "-vvv"]),
        ["test", "-vvv"],
      );
    });

    it("keeps options whose names only start with a watch option", () => {
      assert.deepEqual(removeWatchArguments(["test", "--watcher=1"]), [
        "test",
        "--watcher=1",
      ]);
    });
  });
});
