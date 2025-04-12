import { describe, it } from "node:test";

describe("Top-lvel describe 1", () => {
  it("test 1", () => {});

  describe("Empty describe inside a top-lvel one", () => {});

  describe("Non-empty describe inside a top-lvel one", () => {
    it("test 2", () => {});

    describe("Empty describe inside a non-empty top-lvel one", () => {});
  });
});

describe("Top-lvel describe 2", () => {
  describe.skip("Skipped describe inside a top-lvel one", () => {
    it("test", () => {});
  });

  it.skip("test", () => {});
});

describe.skip("Skipped top-lvel describe", () => {});

describe("Empty top-lvel describe", () => {});

describe("Empty top-lvel describe 2, right next to the other", () => {});

describe("Non-empty-non-skipped-describe", () => {
  it("test", () => {});

  describe("Inside Non-empty-non-skipped-describe", () => {
    it("test", () => {});
  });
});
