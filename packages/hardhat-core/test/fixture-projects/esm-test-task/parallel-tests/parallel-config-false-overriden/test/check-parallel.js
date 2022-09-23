import assert from "assert";

describe("parallel tests", function () {
  it("pass if run in parallel mode", async function () {
    assert(process.env.MOCHA_WORKER_ID !== undefined);
  });
});
