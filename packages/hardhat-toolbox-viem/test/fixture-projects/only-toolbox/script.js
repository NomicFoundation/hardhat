const assert = require("assert");
const chai = require("chai");

async function main() {
  // check that viem exists
  assert(viem !== undefined);

  // check that the expected tasks are there
  const taskNames = Object.keys(tasks);
  assert(taskNames.includes("verify"));
  assert(taskNames.includes("coverage"));

  // check that the expected scopes are there
  const scopeNames = Object.keys(scopes);
  assert(scopeNames.includes("vars"));

  // assert that chai-as-promised is loaded
  assert(chai.assert.eventually);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
