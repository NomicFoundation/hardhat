rm package-lock.json

# Run the benchmark on Amsterdam. Only the network hardfork changes: `argv.evm`
# is also solc's `evmVersion`, so the `EVM` env var can't be used.
node -e "
const fs = require('fs');
const config = fs.readFileSync('hardhat.config.ts', 'utf8');
const pin = 'hardfork: argv.evm,';
if (!config.includes(pin)) {
  console.error('openzeppelin-contracts preinstall: no network hardfork pin found in hardhat.config.ts');
  process.exit(1);
}
fs.writeFileSync('hardhat.config.ts', config.replace(pin, \"hardfork: 'amsterdam',\"));
"
