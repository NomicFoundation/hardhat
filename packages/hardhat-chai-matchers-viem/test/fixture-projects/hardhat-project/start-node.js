const hre = require("hardhat");

async function main() {
  await hre.run("node", {
    port: +process.env.HARDHAT_NODE_PORT,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
