import { describe, it } from "mocha";

// With a name filter (`--grep keep_alpha`), only `keep_alpha` should run.
// `drop_beta` throws if it executes, signalling the filter was ignored.
describe("grep filtering", () => {
  it("keep_alpha", () => {});

  it("drop_beta", () => {
    throw new Error(
      "drop_beta ran, but it should have been filtered out by the name filter",
    );
  });
});
