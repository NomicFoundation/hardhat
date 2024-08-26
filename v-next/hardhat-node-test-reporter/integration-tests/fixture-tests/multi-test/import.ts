import { describe, it } from "node:test";

import fail from "./fail.js";
import pass from "./pass.js";

describe("imported tests", () => {
  it("should pass", () => {
    pass();
  });

  it("should fail", () => {
    fail();
  });
});
