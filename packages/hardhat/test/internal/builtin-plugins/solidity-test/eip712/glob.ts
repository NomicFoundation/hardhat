import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isPathSelected } from "../../../../../src/internal/builtin-plugins/solidity-test/eip712/glob.js";

describe("eip712 - glob", () => {
  describe("isPathSelected", () => {
    it("matches nothing when include is empty", () => {
      assert.equal(isPathSelected("a/b.sol", [], []), false);
    });

    it("ignores exclude when include is empty", () => {
      // With no include there's nothing to narrow, so exclude is a no-op.
      assert.equal(isPathSelected("a/b.sol", [], ["a/**"]), false);
      assert.equal(isPathSelected("c/d.sol", [], ["a/**"]), false);
    });

    it("only includes paths matching at least one include glob", () => {
      assert.equal(
        isPathSelected("contracts/Foo.sol", ["contracts/**"], []),
        true,
      );
      assert.equal(
        isPathSelected("tests/Foo.sol", ["contracts/**"], []),
        false,
      );
    });

    it("excludes narrow the included set", () => {
      assert.equal(
        isPathSelected(
          "contracts/Foo.sol",
          ["contracts/**"],
          ["contracts/Foo.sol"],
        ),
        false,
      );
    });

    it("includes paths matching include and not matching exclude", () => {
      assert.equal(
        isPathSelected(
          "contracts/Foo.sol",
          ["contracts/**"],
          ["contracts/Bar.sol"],
        ),
        true,
      );
    });

    it("matches an exact path", () => {
      assert.equal(
        isPathSelected("tests/EIP712Types.sol", ["tests/EIP712Types.sol"], []),
        true,
      );
    });

    it("does not match across directory boundaries with `*`", () => {
      assert.equal(isPathSelected("a/b/c.sol", ["a/*.sol"], []), false);
      assert.equal(isPathSelected("a/b.sol", ["a/*.sol"], []), true);
    });

    it("matches across directory boundaries with `**`", () => {
      assert.equal(isPathSelected("a/b/c.sol", ["a/**.sol"], []), true);
      assert.equal(isPathSelected("a/b/c/d.sol", ["a/**.sol"], []), true);
    });

    it("treats `?` as a single non-slash char", () => {
      assert.equal(isPathSelected("a/b.sol", ["a/?.sol"], []), true);
      assert.equal(isPathSelected("a/bb.sol", ["a/?.sol"], []), false);
      assert.equal(isPathSelected("a//.sol", ["a/?.sol"], []), false);
    });

    it("escapes regex metacharacters in the literal portion", () => {
      // The `.` should not match arbitrary characters.
      assert.equal(isPathSelected("foo1sol", ["foo.sol"], []), false);
    });

    it("matches when any include pattern matches", () => {
      assert.equal(isPathSelected("b.sol", ["a.sol", "b.sol"], []), true);
      assert.equal(isPathSelected("c.sol", ["a.sol", "b.sol"], []), false);
    });

    it("exclude does not match across directory boundaries with `*`", () => {
      assert.equal(isPathSelected("a/b/c.sol", ["**"], ["a/*.sol"]), true);
      assert.equal(isPathSelected("a/b.sol", ["**"], ["a/*.sol"]), false);
    });

    it("exclude matches across directory boundaries with `**`", () => {
      assert.equal(isPathSelected("a/b/c.sol", ["**"], ["a/**.sol"]), false);
      assert.equal(isPathSelected("a/b/c/d.sol", ["**"], ["a/**.sol"]), false);
    });

    it("exclude treats `?` as a single non-slash char", () => {
      assert.equal(isPathSelected("a/b.sol", ["**"], ["a/?.sol"]), false);
      assert.equal(isPathSelected("a/bb.sol", ["**"], ["a/?.sol"]), true);
      assert.equal(isPathSelected("a//.sol", ["**"], ["a/?.sol"]), true);
    });

    it("excludes when any exclude pattern matches", () => {
      assert.equal(isPathSelected("b.sol", ["**"], ["a.sol", "b.sol"]), false);
      assert.equal(isPathSelected("c.sol", ["**"], ["a.sol", "b.sol"]), true);
    });

    it("matches scoped npm package paths", () => {
      assert.equal(
        isPathSelected(
          "@openzeppelin/contracts/token/ERC20/ERC20.sol",
          ["@openzeppelin/**"],
          [],
        ),
        true,
      );
      assert.equal(
        isPathSelected(
          "@openzeppelin/contracts/token/ERC20/ERC20.sol",
          ["@openzeppelin/contracts/token/**/*.sol"],
          [],
        ),
        true,
      );
      assert.equal(
        isPathSelected(
          "@openzeppelin/contracts/token/ERC20/ERC20.sol",
          ["@other/**"],
          [],
        ),
        false,
      );
    });

    it("excludes scoped npm package paths", () => {
      assert.equal(
        isPathSelected(
          "@openzeppelin/contracts/mocks/Mock.sol",
          ["@openzeppelin/**"],
          ["@openzeppelin/contracts/mocks/**"],
        ),
        false,
      );
      assert.equal(
        isPathSelected(
          "@openzeppelin/contracts/token/ERC20.sol",
          ["@openzeppelin/**"],
          ["@openzeppelin/contracts/mocks/**"],
        ),
        true,
      );
    });

    describe("brace expansion `{a,b}`", () => {
      it("matches any of the comma-separated alternatives", () => {
        const include = ["contracts/{tokens,vaults}/**/*.sol"];

        assert.equal(
          isPathSelected("contracts/tokens/Foo.sol", include, []),
          true,
        );
        assert.equal(
          isPathSelected("contracts/vaults/sub/Foo.sol", include, []),
          true,
        );
        assert.equal(
          isPathSelected("contracts/other/Foo.sol", include, []),
          false,
        );
      });

      it("supports three or more alternatives", () => {
        const include = ["src/{a,b,c}.sol"];

        assert.equal(isPathSelected("src/a.sol", include, []), true);
        assert.equal(isPathSelected("src/b.sol", include, []), true);
        assert.equal(isPathSelected("src/c.sol", include, []), true);
        assert.equal(isPathSelected("src/d.sol", include, []), false);
      });

      it("supports empty alternatives", () => {
        const include = ["src/foo{,s}.sol"];

        assert.equal(isPathSelected("src/foo.sol", include, []), true);
        assert.equal(isPathSelected("src/foos.sol", include, []), true);
        assert.equal(isPathSelected("src/food.sol", include, []), false);
      });

      it("supports nested brace groups", () => {
        const include = ["src/{a,{b,c}}.sol"];

        assert.equal(isPathSelected("src/a.sol", include, []), true);
        assert.equal(isPathSelected("src/b.sol", include, []), true);
        assert.equal(isPathSelected("src/c.sol", include, []), true);
        assert.equal(isPathSelected("src/d.sol", include, []), false);
      });

      it("allows inner glob syntax within alternatives", () => {
        const include = ["{contracts/**/*.sol,tests/*.sol}"];

        assert.equal(
          isPathSelected("contracts/a/b/Foo.sol", include, []),
          true,
        );
        assert.equal(isPathSelected("tests/Foo.sol", include, []), true);
        assert.equal(isPathSelected("tests/sub/Foo.sol", include, []), false);
      });

      it("works in exclude patterns", () => {
        assert.equal(
          isPathSelected(
            "contracts/mocks/Foo.sol",
            ["**"],
            ["contracts/{mocks,tests}/**"],
          ),
          false,
        );
        assert.equal(
          isPathSelected(
            "contracts/tests/Foo.sol",
            ["**"],
            ["contracts/{mocks,tests}/**"],
          ),
          false,
        );
        assert.equal(
          isPathSelected(
            "contracts/src/Foo.sol",
            ["**"],
            ["contracts/{mocks,tests}/**"],
          ),
          true,
        );
      });

      it("treats an unterminated `{` as a literal character", () => {
        assert.equal(isPathSelected("a{b.sol", ["a{b.sol"], []), true);
        assert.equal(isPathSelected("ab.sol", ["a{b.sol"], []), false);
      });
    });

    describe("character classes `[abc]`", () => {
      it("matches any single character from the set", () => {
        const exclude = ["contracts/[Mm]ock*.sol"];

        assert.equal(
          isPathSelected("contracts/Mock.sol", ["**"], exclude),
          false,
        );
        assert.equal(
          isPathSelected("contracts/mock.sol", ["**"], exclude),
          false,
        );
        assert.equal(
          isPathSelected("contracts/Mocks.sol", ["**"], exclude),
          false,
        );
        assert.equal(
          isPathSelected("contracts/Tock.sol", ["**"], exclude),
          true,
        );
      });

      it("matches exactly one character", () => {
        const include = ["src/[ab].sol"];

        assert.equal(isPathSelected("src/a.sol", include, []), true);
        assert.equal(isPathSelected("src/ab.sol", include, []), false);
        assert.equal(isPathSelected("src/.sol", include, []), false);
      });

      it("supports ranges", () => {
        const include = ["src/[a-c].sol"];

        assert.equal(isPathSelected("src/a.sol", include, []), true);
        assert.equal(isPathSelected("src/b.sol", include, []), true);
        assert.equal(isPathSelected("src/c.sol", include, []), true);
        assert.equal(isPathSelected("src/d.sol", include, []), false);
      });

      it("supports negation with `!`", () => {
        const include = ["src/[!ab].sol"];

        assert.equal(isPathSelected("src/a.sol", include, []), false);
        assert.equal(isPathSelected("src/b.sol", include, []), false);
        assert.equal(isPathSelected("src/c.sol", include, []), true);
      });

      it("supports negation with `^`", () => {
        const include = ["src/[^ab].sol"];

        assert.equal(isPathSelected("src/a.sol", include, []), false);
        assert.equal(isPathSelected("src/b.sol", include, []), false);
        assert.equal(isPathSelected("src/c.sol", include, []), true);
      });

      it("treats an unterminated `[` as a literal character", () => {
        assert.equal(isPathSelected("a[b.sol", ["a[b.sol"], []), true);
        assert.equal(isPathSelected("ab.sol", ["a[b.sol"], []), false);
      });

      it("works inside brace alternatives", () => {
        const include = ["src/{[Aa],[Bb]}.sol"];

        assert.equal(isPathSelected("src/A.sol", include, []), true);
        assert.equal(isPathSelected("src/a.sol", include, []), true);
        assert.equal(isPathSelected("src/B.sol", include, []), true);
        assert.equal(isPathSelected("src/b.sol", include, []), true);
        assert.equal(isPathSelected("src/c.sol", include, []), false);
      });
    });
  });
});
