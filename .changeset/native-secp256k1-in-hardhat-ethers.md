---
"@nomicfoundation/hardhat-ethers": minor
"hardhat": minor
---

Made ethers derive secp256k1 public keys with EDR's native implementation instead of its pure-JS one, speeding up `new Wallet(secretKey)`, `Wallet.createRandom()`, HD wallet derivation and `computeAddress`.
