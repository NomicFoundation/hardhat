import { assert } from "chai";

import { loadUserModules } from "../src/user-modules";

import { useEnvironment } from "./useEnvironment";

describe("User modules", function () {
  useEnvironment("minimal");

  it("should exit with a warning if given a user module directory that does not exist", async () => {
    await assert.isRejected(
      loadUserModules("/fake", []),
      `Directory /fake not found.`
    );
  });
});
