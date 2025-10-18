import hre from "hardhat";
import assert from "node:assert";

const BALANCE_TO_SEND = 1000000000000000000n;

const { provider, ethers } = await hre.network.connect("edrOp");

const signers = await ethers.getSigners();

const hardhatSigner = signers[0];
const hardhatAddress = hardhatSigner.address;
// Ledger accounts are returned at the end
const ledgerSigner = signers[signers.length - 1];
const ledgerAddress = ledgerSigner.address;

// Be sure that the ledger account has some ETH
await hardhatSigner.sendTransaction({
  to: ledgerAddress,
  value: BALANCE_TO_SEND,
});

// Uncomment the RPC method you want to test

await ethSendTransaction();

// await ethSign();

// await personalSign();

// await ethSignTypedDataV4();

async function ethSendTransaction() {
  const txParams = {
    // Shared properties
    to: hardhatAddress,
    value: 10000000n,
    gas: 310000n,

    // Enable the properties that you need for a specific transaction type
    // and comment out the ones that you don't need

    // eip1559
    maxFeePerGas: 1000000000n,
    maxPriorityFeePerGas: 1000000000n,

    // eip2930
    //gasPrice: 999999345n,
    //accessList: [],

    // legacy
    // gasPrice: 999999345n,
  };

  await ledgerSigner.sendTransaction(txParams);
}

async function ethSign() {
  const msg = ethers.toUtf8Bytes("Hello eth_sign");
  const hexMsg = ethers.hexlify(msg);

  const sig = await provider.request({
    method: "eth_sign",
    params: [ledgerAddress, hexMsg],
  });

  const verifiedAddress = ethers.verifyMessage("Hello eth_sign", sig);

  assert.equal(verifiedAddress, ledgerAddress);
}

async function personalSign() {
  const message = "Hello personal_sign";

  const sig = await provider.request({
    method: "personal_sign",
    params: [ethers.hexlify(ethers.toUtf8Bytes(message)), ledgerAddress],
  });

  const recovered = ethers.verifyMessage(message, sig);

  assert.equal(recovered, ledgerAddress);
}

async function ethSignTypedDataV4() {
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  // EIP‑712 domain separator
  const domain = {
    name: "MyDApp",
    version: "1",
    chainId,
    verifyingContract: "0x0000000000000000000000000000000000000000",
  };

  const mailTypes = {
    Mail: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "contents", type: "string" },
    ],
  };

  const types = {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    ...mailTypes,
  };

  const message = {
    from: ledgerAddress,
    to: hardhatAddress,
    contents: "Hello typed data",
  };

  const json = JSON.stringify({
    domain,
    types,
    primaryType: "Mail",
    message,
  });

  const sig = await provider.request({
    method: "eth_signTypedData_v4",
    params: [ledgerAddress, json],
  });

  const digest = ethers.TypedDataEncoder.hash(domain, mailTypes, message);
  const recovered = ethers.recoverAddress(digest, sig);

  assert.equal(recovered, ledgerAddress);
}
