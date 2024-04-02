const assert = require("assert")

async function main() {
  const blockNumber = await hre.network.provider.send("eth_blockNumber")
  assert.equal(blockNumber, "0x0")
}

main()
 .catch(console.error)
