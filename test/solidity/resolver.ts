import { assert } from "chai";

import { ResolvedFile } from "../../src/solidity/resolver";

describe("Resolved file", () => {
  it("should be constructed correctly", () => {
    const globalName = "globalName.sol";
    const absolutePath = "/path/to/file/globalName.sol";
    const content = "the file content";
    const lastModificationDate = new Date();
    const libraryName = "lib";
    const libraryVersion = "0.1.0";

    const resolvedFileWhithoutLibrary = new ResolvedFile(
      globalName,
      absolutePath,
      content,
      lastModificationDate
    );

    assert.equal(resolvedFileWhithoutLibrary.globalName, globalName);
    assert.equal(resolvedFileWhithoutLibrary.absolutePath, absolutePath);
    assert.equal(resolvedFileWhithoutLibrary.content, content);
    assert.equal(
      resolvedFileWhithoutLibrary.lastModificationDate,
      lastModificationDate
    );
    assert.isUndefined(resolvedFileWhithoutLibrary.library);
  });
});
