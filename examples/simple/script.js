const hre = require("hardhat");

const MyModule = require("./ignition/MyModule")
const MyOtherModule = require("./ignition/MyOtherModule")

async function main() {
  const [{ foo: foo1, bar }, { foo: foo2, qux }] = await ignition.deployMany([MyModule, MyOtherModule]);

  console.log('foo1', foo1.address);
  console.log('foo2', foo2.address);
  console.log('bar', bar.address);
  console.log('qux', qux.address);
  console.log('bar.foo', await bar.a());
  console.log('qux.foo', await qux.a());
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
