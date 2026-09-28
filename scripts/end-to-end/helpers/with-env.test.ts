import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { withEnv } from "./with-env.ts";

const NAME = "WITH_ENV_TEST_VARIABLE";

describe("withEnv", () => {
  it("applies an override for the call and restores the previous value", () => {
    process.env[NAME] = "before";

    const seen = withEnv({ [NAME]: "during" }, () => process.env[NAME]);

    assert.equal(seen, "during");
    assert.equal(process.env[NAME], "before");
  });

  it("removes a variable for an undefined override and restores it", () => {
    process.env[NAME] = "before";

    const seen = withEnv({ [NAME]: undefined }, () => process.env[NAME]);

    assert.equal(seen, undefined);
    assert.equal(process.env[NAME], "before");
  });

  it("leaves a previously unset variable unset afterwards", () => {
    delete process.env[NAME];

    withEnv({ [NAME]: "during" }, () => undefined);

    assert.equal(NAME in process.env, false);
  });

  it("restores when fn throws", () => {
    process.env[NAME] = "before";

    assert.throws(() =>
      withEnv({ [NAME]: "during" }, () => {
        throw new Error("boom");
      }),
    );
    assert.equal(process.env[NAME], "before");
  });

  it("rejects an asynchronous fn, whose work would outlive the override", () => {
    assert.throws(
      () => withEnv({ [NAME]: "during" }, async () => undefined),
      /must be synchronous/,
    );
  });
});
