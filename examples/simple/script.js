const hre = require("hardhat");

// const MyRecipe = require("./ignition/MyRecipe")
// const MyOtherRecipe = require("./ignition/MyOtherRecipe")

async function main() {
  const { foo } = await ignition.deploy("MyRecipe");

  console.log(foo.address);
  console.log((await foo.x()).toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
