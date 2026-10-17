import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { TestFileSelection } from "../../../../src/internal/builtin-plugins/watch/test-file-selection.js";

describe("watch/TestFileSelection", () => {
  it("runs only the test file that changed", () => {
    const selection = new TestFileSelection(true);

    assert.deepEqual(selection.next(["/p/test/A.t.sol"]), ["/p/test/A.t.sol"]);
  });

  it("runs the previous test file again when only other files changed", () => {
    const selection = new TestFileSelection(true);
    selection.next(["/p/test/A.t.sol"]);

    assert.deepEqual(selection.next([]), ["/p/test/A.t.sol"]);
  });

  it("runs everything when several test files changed at once", () => {
    const selection = new TestFileSelection(true);
    selection.next(["/p/test/A.t.sol"]);

    assert.deepEqual(
      selection.next(["/p/test/A.t.sol", "/p/test/B.t.sol"]),
      [],
    );
    assert.deepEqual(selection.next([]), []);
  });

  it("runs everything before any test file changed", () => {
    const selection = new TestFileSelection(true);

    assert.deepEqual(selection.next([]), []);
  });

  it("drops a removed file from the previous selection", () => {
    const selection = new TestFileSelection(true);
    selection.next(["/p/test/A.t.sol"]);

    assert.deepEqual(selection.next([], ["/p/test/A.t.sol"]), []);
  });

  it("forgets the previous selection on reset", () => {
    const selection = new TestFileSelection(true);
    selection.next(["/p/test/A.t.sol"]);
    selection.reset();

    assert.deepEqual(selection.next([]), []);
  });

  it("never selects files when disabled", () => {
    const selection = new TestFileSelection(false);

    assert.deepEqual(selection.next(["/p/test/A.t.sol"]), []);
    assert.deepEqual(selection.next([]), []);
  });
});
