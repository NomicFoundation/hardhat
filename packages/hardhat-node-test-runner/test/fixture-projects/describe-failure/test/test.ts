import { describe, it } from "node:test";

describe("describe that fails after an await", async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));

  throw new Error("describe setup error");
});

describe("describe that passes", () => {
  it("passes", () => {});
});
