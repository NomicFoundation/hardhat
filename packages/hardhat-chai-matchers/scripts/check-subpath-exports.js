const assert = require("assert");

// This script checks that the subpath exports works as expected.
// This only works if the project was previously built, so this is not
// run as part of the "test" script to avoid having to build the project
// every time the tests are run.

const { PANIC_CODES } = require("@nomicfoundation/hardhat-chai-matchers/panic");

assert(PANIC_CODES !== undefined);

const {
  anyUint,
  anyValue,
} = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
assert(anyUint !== undefined);
assert(anyValue !== undefined);
