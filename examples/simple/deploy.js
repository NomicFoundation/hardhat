async function main() {
  const { foo, bar } = await ignition.deploy(require("./ignition/MyRecipe"));

  console.log("Foo:", foo.address);
  console.log("Bar:", bar.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
