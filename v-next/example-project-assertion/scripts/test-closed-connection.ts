import { network } from "hardhat";

const connection = await network.connect({});

const beforeCloseBlock = await connection.ethers.provider.getBlock(0);

if (beforeCloseBlock !== null) {
  console.log("Before close - Block found: ", beforeCloseBlock.number);
} else {
  throw new Error("Before close -Block returned is null");
}

await connection.close();

const afterCloseBlock = await connection.ethers.provider.getBlock(0);

if (afterCloseBlock !== null) {
  console.log("After close - Block found: ", afterCloseBlock.number);
} else {
  throw new Error("After close - Block returned is null");
}
