import { describe, it } from "node:test";

describe("Top-level describe 1", () => {
  it("test 1", () => {});

  describe("Empty describe inside a top-level one", () => {});

  describe("Non-empty describe inside a top-level one", () => {
    it("test 2", () => {});

    describe("Empty describe inside a non-empty top-level one", () => {});
  });
});

describe("Top-level describe 2", () => {
  describe.skip("Skipped describe inside a top-level one", () => {
    it("test", () => {});
  });

  it.skip("test", () => {});
});

describe.skip("Skipped top-level describe", () => {});

describe("Empty top-level describe", () => {});

describe("Empty top-level describe 2, right next to the other", () => {});

describe("Non-empty-non-skipped-describe", () => {
  it("test", () => {});

  describe("Inside Non-empty-non-skipped-describe", () => {
    it("test", () => {});
  });
});
