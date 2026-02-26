---
"hardhat": patch
---

Bumped EDR version to [`0.12.0-next.25`](https://github.com/NomicFoundation/edr/releases/tag/%40nomicfoundation%2Fedr%400.12.0-next.25).

BREAKING CHANGE: Memory capture used to be enabled by default on geth, but has since been flipped https://github.com/ethereum/go-ethereum/pull/23558 and is now disabled by default. We have followed suit and disabled it by default as well. If you were relying on memory capture, you will need to explicitly enable it by setting the enableMemory option to true in your tracer configuration.
