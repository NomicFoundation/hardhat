// eslint-disable-next-line import/no-extraneous-dependencies
const hre = require("hardhat");

async function main() {
  const code = await hre.run("test");

  if (code > 0) {
    console.error("Failed first test run");
    process.exit(1);
  }

  const secondCode = await hre.run("test");

  if (secondCode > 0) {
    console.error("Failed second test run");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
