#!/usr/bin/env bash

# Run the benchmark on Amsterdam. The 300M Solidity test gas limit can't fit
# PoolManagerTest's Amsterdam (EIP-8037) code deposit.
node -e "
const fs = require('fs');
const config = fs.readFileSync('hardhat.config.ts', 'utf8');
const pin = 'gasLimit: 300_000_000n,';
if (config.split(pin).length !== 2) {
  console.error('uniswap-v4-core preinstall: expected exactly one ' + pin + ' in hardhat.config.ts');
  process.exit(1);
}
fs.writeFileSync('hardhat.config.ts', config.replace(pin, 'gasLimit: 1_000_000_000n,'));
"
