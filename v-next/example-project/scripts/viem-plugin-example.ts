import hre from "hardhat";
import { parseEther } from "viem";

async function testL2Extensions() {
  // This network connection has access to an optimism-specific viem api
  const optimism = await hre.network.connect({
    network: "localhost",
    chainType: "optimism",
  });
  const opPublicClient = await optimism.viem.getPublicClient();
  const l1BaseFee = await opPublicClient.getL1BaseFee();
  console.log("L1 base fee:", l1BaseFee);

  // This one doesn't
  const mainnet = await hre.network.connect({
    network: "localhost",
    chainType: "l1",
  });
  const l1PublicClient = await mainnet.viem.getPublicClient();
  try {
    // @ts-expect-error
    await l1PublicClient.getL1BaseFee();
  } catch (e) {
    console.error(e);
  }
}

async function testClients() {
  const networkConnection = await hre.network.connect();

  const publicClient = await networkConnection.viem.getPublicClient();
  const [fromWalletClient, toWalletClient] =
    await networkConnection.viem.getWalletClients();
  const fromAddress = fromWalletClient.account.address;
  const toAddress = toWalletClient.account.address;

  const fromBalanceBefore = await publicClient.getBalance({
    address: fromAddress,
  });
  const toBalanceBefore = await publicClient.getBalance({
    address: toAddress,
  });

  console.log("Sending 0.0001 ETH from", fromAddress, "to", toAddress);
  console.log("From balance before:", fromBalanceBefore);
  console.log("To balance before:", toBalanceBefore);

  const etherAmount = parseEther("0.0001");
  const hash = await fromWalletClient.sendTransaction({
    to: toAddress,
    value: etherAmount,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const transactionFee = receipt.gasUsed * receipt.effectiveGasPrice;

  const fromBalanceAfter = await publicClient.getBalance({
    address: fromAddress,
  });
  const toBalanceAfter = await publicClient.getBalance({
    address: toAddress,
  });

  console.log(
    "Transaction with hash",
    hash,
    "mined in block",
    receipt.blockNumber,
  );
  console.log("Transaction fee:", transactionFee);
  console.log("From balance after:", fromBalanceAfter);
  console.log("To balance after:", toBalanceAfter);
}

async function testContracts() {
  const networkConnection = await hre.network.connect();
  const counter = await networkConnection.viem.deployContract("Counter");

  console.log("Deployed contract at address", counter.address);
  const x = await counter.read.x();
  console.log("Counter x:", x);
  await counter.write.inc();
  const newX = await counter.read.x();
  console.log("Counter x after inc:", newX);

  // this does not work, as dec is not part of the abi
  try {
    // @ts-ignore
    await counter.write.dec();
  } catch (e) {
    console.error(e);
  }

  // this does not work, as rocket expects a string instead
  // of a number as the first constructor argument
  // @ts-ignore
  const rocket1 = await networkConnection.viem.deployContract("Rocket", [1n]);
  console.log("Rocket launched at", rocket1.address);
  const rocket1name = await rocket1.read.name();
  console.log("Rocket name:", rocket1name);

  const rocket = await networkConnection.viem.deployContract("Rocket", [
    "Apollo",
  ]);
  console.log("Rocket launched at", rocket.address);
  const name = await rocket.read.name();
  console.log("Rocket name:", name);
}

// Uncomment when the edr network is ready and supports the optimism mode
// await testL2Extensions();
await testClients();
await testContracts();
