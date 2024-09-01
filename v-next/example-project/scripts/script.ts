import { network } from "@ignored/hardhat-vnext";

const conn = await network.connect("localhost", "optimism");

console.log(conn);

console.log(
  "eth_chainId",
  await conn.provider.request({ method: "eth_chainId" }),
);

console.log(
  "eth_accounts",
  await conn.provider.request({ method: "eth_accounts" }),
);
