import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shellQuote } from "./shell.ts";

describe("shellQuote", () => {
  it("leaves plain words unquoted", () => {
    assert.equal(shellQuote("/tmp/file-1.txt"), "/tmp/file-1.txt");
  });

  it("quotes values with spaces and shell operators", () => {
    assert.equal(shellQuote("a b && c"), "'a b && c'");
  });

  it("escapes embedded single quotes", () => {
    assert.equal(shellQuote("it's"), `'it'\\''s'`);
  });
});
