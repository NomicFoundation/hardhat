#!/usr/bin/env bash

# Use node for file transforms to avoid BSD/GNU sed portability issues
# (matches the convention used by the other scenarios' preinstall scripts).
node -e "
const fs = require('fs');

// Since 4.0.0 hardhat-toolbox-mocha-ethers requires hardhat-mocha ^4.0.0,
// which takes mocha ^12.0.0 as a peer dependency. The repo pins mocha ^11
// directly, so updating to the Verdaccio-published toolbox fails to resolve.
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.devDependencies?.mocha !== '^11.0.0') {
  console.error(
    'rocketpool preinstall: expected devDependencies.mocha to be ^11.0.0 — ' +
      'the pinned commit may have changed. Refusing to run against an ' +
      'unexpected mocha pin.',
  );
  process.exit(1);
}
pkg.devDependencies.mocha = '^12.0.0';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# EXPERIMENT (do not merge): log the chain-time gap inside the Beacon State
# verification tests and force a non-zero exit so the bench prints stdout.
node <<'EOF'
const fs = require('fs');
const testFile = 'test/tests/network/network-participation-minipool-tests.ts';
let test = fs.readFileSync(testFile, 'utf8');
for (const [from, to] of [
  [
    'const epoch = await currentEpoch(c) - (historical ? BigInt(PERIOD) : 4n);',
    'const __w0 = Date.now() / 1000; const __t0 = await c.time.latest(); const epoch = await currentEpoch(c) - (historical ? BigInt(PERIOD) : 4n);',
  ],
  [
    'const root = await beaconProofs(c, { validator: validator(c, "pool1"), participationEpoch: epoch });',
    'const root = await beaconProofs(c, { validator: validator(c, "pool1"), participationEpoch: epoch }); const __t1 = await c.time.latest(); __epochGap(historical, __w0, __t0, __t1);',
  ],
]) {
  if (test.split(from).length !== 2) {
    console.error('epoch-gap experiment: no unique match for: ' + from);
    process.exit(1);
  }
  test = test.replace(from, to);
}
// Samples accumulate in a file across the scenario's 6 mocha invocations
// (stdout is only shown when an invocation fails). Every invocation prints
// the whole file on exit; the 6th one forces exit code 1 so it is shown.
test = 'import * as __fs from "node:fs";\n' + test + `
const __EPOCH_GAP_LOG = "epoch-gap.log";
function __epochGap(historical: boolean, wall: number, t0: bigint, t1: bigint) {
    const g = globalThis as any;
    if (!g.__epochGapHooked) {
        g.__epochGapHooked = true;
        process.on("exit", () => {
            const lines = __fs.readFileSync(__EPOCH_GAP_LOG, "utf8").trim().split("\\n");
            __fs.writeSync(1, lines.map(l => "EPOCH_GAP " + l).join("\\n") + "\\n");
            const invocations = new Set(lines.map(l => JSON.parse(l).pid)).size;
            if (invocations >= 6) process.exitCode = 1;
        });
    }
    const sinceGenesis = t0 - 1606824023n;
    __fs.appendFileSync(__EPOCH_GAP_LOG, JSON.stringify({
        pid: process.pid, args: process.argv.slice(2).join(" "), historical, wall: wall.toFixed(3),
        t0: Number(t0), t1: Number(t1), gap: Number(t1 - t0),
        e0: Number(sinceGenesis / 384n), e1: Number((t1 - 1606824023n) / 384n), toBoundary: Number(384n - sinceGenesis % 384n),
    }) + "\\n");
}
`;
fs.writeFileSync(testFile, test);
EOF
