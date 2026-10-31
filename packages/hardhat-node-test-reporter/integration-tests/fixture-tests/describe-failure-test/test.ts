import { describe, it } from "node:test";

describe("describe that throws", () => {
  throw new Error("Synchronous describe failure");
});

describe("async describe that rejects", async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));

  throw new Error("Asynchronous describe failure");
});

describe("describe that passes", () => {
  it("passes", () => {});
});
