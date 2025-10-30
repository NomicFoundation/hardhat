# @nomiclabs/hardhat-solhint

## 4.1.2

### Patch Changes

- 8da8c38: Update README installation instructions to point to the Hardhat 2 tag: `hh2` ([#7636](https://github.com/NomicFoundation/hardhat/pull/7636))

## 4.1.1

### Patch Changes

- 9d10226: Links in the code and READMEs updated to point to the Hardhat 2 documentation and resources

## 4.1.0

### Minor Changes

- 14b3042: Updated the minimal supported version of Node to v20 ([#6982](https://github.com/NomicFoundation/hardhat/pull/6982))

## 4.0.2

### Patch Changes

- 173a8a3: Fixed hardhat-solhint by restricting the solhint dependency to ~5.0.0.

## 4.0.1

### Patch Changes

- efa905d: Fix for corrupted Hardhat peer dependency version from pnpm.

## 4.0.0

### Major Changes

- cc79bd7: Ensured the check task exits with exit code 1 when solhint raises any errors; this is a breaking change since the check task would previously always exit with exit code 0
- 9cae5e7: Updated solhint dependency to [v5.0.2](https://github.com/protofire/solhint/releases/tag/v5.0.2)

## 3.1.0

### Minor Changes

- bcb688f: Added support for `.solhintignore` files (thanks @yhuard!)

## 3.0.1

### Patch Changes

- 6b3c59961: Update solhint to v3.4.0 and fix error with ESLint formatter not found.

## 3.0.0

### Major Changes

- 605d8c3f7: Bump solhint dependency to 3.0.0

## 2.0.1

### Patch Changes

- 7403ec1d: Stop publishing tsconfig.json files
