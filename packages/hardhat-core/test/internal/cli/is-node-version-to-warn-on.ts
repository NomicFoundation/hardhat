import { assert } from "chai";
import { isNodeVersionToWarnOn } from "../../../src/internal/cli/is-node-version-to-warn-on";

describe("isNodeVersionToWarnOn", function () {
  it("Should not warn on supported versions", function () {
    assert.isFalse(isNodeVersionToWarnOn("v18.0.0"));
    assert.isFalse(isNodeVersionToWarnOn("v18.20.3"));

    assert.isFalse(isNodeVersionToWarnOn("v20.0.0"));
    assert.isFalse(isNodeVersionToWarnOn("v20.14.0"));

    assert.isFalse(isNodeVersionToWarnOn("v22.0.0"));
    assert.isFalse(isNodeVersionToWarnOn("v22.3.0"));

    assert.isFalse(isNodeVersionToWarnOn("v24.0.0"));
    assert.isFalse(isNodeVersionToWarnOn("v24.3.0"));
  });

  it("Should not warn on even newer versions even if they are unsupported", function () {
    assert.isFalse(isNodeVersionToWarnOn("v26.0.0"));
    assert.isFalse(isNodeVersionToWarnOn("v26.3.0"));
  });

  it("Should warn on unsupported older node versions", function () {
    assert(isNodeVersionToWarnOn("v10.0.0"));
    assert(isNodeVersionToWarnOn("v10.24.1"));

    assert(isNodeVersionToWarnOn("v11.0.0"));

    assert(isNodeVersionToWarnOn("v12.0.0"));
    assert(isNodeVersionToWarnOn("v12.22.12"));

    assert(isNodeVersionToWarnOn("v13.0.0"));

    assert(isNodeVersionToWarnOn("v14.0.0"));
    assert(isNodeVersionToWarnOn("v14.21.3"));

    assert(isNodeVersionToWarnOn("v15.0.0"));

    assert(isNodeVersionToWarnOn("v16.0.0"));
    assert(isNodeVersionToWarnOn("v16.20.20"));
  });

  it("Should warn on odd number releases", function () {
    assert(isNodeVersionToWarnOn("v15.14.0"));
    assert(isNodeVersionToWarnOn("v17.9.1"));
    assert(isNodeVersionToWarnOn("v19.9.0"));
    assert(isNodeVersionToWarnOn("v21.7.3"));
    assert(isNodeVersionToWarnOn("v23.0.0"));
    assert(isNodeVersionToWarnOn("v25.0.0"));
  });
});
