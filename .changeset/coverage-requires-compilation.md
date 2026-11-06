---
"hardhat": patch
"@nomicfoundation/hardhat-errors": patch
---

Made `--coverage` with `--no-compile` fail with an error instead of reporting 0% coverage with no files: the coverage data is collected while compiling ([#8796](https://github.com/NomicFoundation/hardhat/issues/8796)).
