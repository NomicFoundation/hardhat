const hre = require("hardhat");

// const MyModule = require("./ignition/MyModule")
// const MyOtherModule = require("./ignition/MyOtherModule")

async function main() {
  const { foo } = await ignition.deploy("MyModule")

  console.log(foo.address);
  console.log((await foo.x()).toString());
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
