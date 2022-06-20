const assert = require("assert");

async function main() {
  // check that ethers exists
  assert(ethers !== undefined);

  // check that the expected tasks are there
  const taskNames = Object.keys(tasks);
  assert(taskNames.includes("verify"));
  assert(taskNames.includes("coverage"));
  assert(taskNames.includes("typechain"));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
