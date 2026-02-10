# Snapshots Instability Repro

This repository shows how running the snapshots with Hardhat is more unstable than foundry when modifying a test contract.

In Hardhat, if you modify a test, you can have the snapshots of other tests change. In foundry only the modified test is affected.

## Repro

## Hardhat

Install it:

```sh
pnpm install
```

Build hardhat:

```sh
(cd .. && pnpm build)
```

### Reproduction

```sh
rm .gas-snapshot
git checkout src/Counter.t.sol # Reset the test file
pnpm hardhat test --snapshot
cat .gas-snapshot
```

Modify the test by duplicating line 15 of `src/Counter.t.sol`:

```sh
sed -i '15p' src/Counter.t.sol
```

Check which tests are affected:

```sh
pnpm hardhat test --snapshot-check
```

### Foundry

Install foundry first

### Reproduction

```sh
rm .gas-snapshot
git checkout src/Counter.t.sol # Reset the test file
forge snapshot
cat .gas-snapshot
```

Modify the test by duplicating line 15 of `src/Counter.t.sol`:

```sh
sed -i '15p' src/Counter.t.sol
```

Check which tests are affected:

```sh
forge snapshot --diff
```
