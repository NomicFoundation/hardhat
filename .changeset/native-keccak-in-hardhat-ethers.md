---
"@nomicfoundation/hardhat-ethers": minor
"hardhat": minor
---

Made ethers use EDR's native Keccak-256 instead of its pure-JS one, falling back to ethers' own implementation when the native one isn't available.
