import { before, beforeEach, describe, it } from "node:test";

describe("Foooo", () => {
  it("test", async () => {});

  it("test with cause", async () => {
    throw new Error("withCause", { cause: new Error("cause") });
  });

  describe("child", () => {
    it("asdasd", () => {
      const error = new Error("Different arrays", {
        cause: new Error("cause"),
      });

      Object.defineProperty(error, "expected", {
        configurable: false,
        enumerable: false,
        get() {
          return [1, 2, 3];
        },
      });

      Object.defineProperty(error, "actual", {
        configurable: false,
        enumerable: false,
        get() {
          return [1, 3, 3];
        },
      });

      throw error;
    });
  });
});

describe("a", () => {
  describe("aa", () => {
    describe("aaa", () => {
      it("aaaa", () => {});
    });
  });
});

it("top level test", async (t) => {
  await t.test("bar", () => {});
});

describe("in describe", () => {
  before(() => {
    throw new Error("before");
  });

  beforeEach(() => {
    throw new Error("before each");
  });

  it("foo", async (t) => {
    await t.test("foo/bar", () => {});

    throw new Error("asd");
  });
});

describe("testing before each", () => {
  describe("nested", () => {
    it("neseted foo", async () => {
      console.log("1");
    });

    it("neseted foo 2", async () => {
      console.log("2");
    });
  });
});

it.todo("todo test", async () => {});

it.skip("skipped test", async () => {});
