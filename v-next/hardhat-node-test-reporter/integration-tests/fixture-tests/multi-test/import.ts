import { describe, it } from "node:test";

import fail from "./fail.js";
import pass from "./pass.js";

describe("imported tests", () => {
  it("should pass", async () => {
    pass();
  });

  it("should fail", async () => {
    fail();
  });
});
