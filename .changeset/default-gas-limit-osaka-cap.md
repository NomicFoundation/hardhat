---
"hardhat": patch
---

Fixed `eth_call` and `eth_estimateGas` requests without a `gas` field failing under the Osaka transaction gas cap. Hardhat no longer passes a default transaction gas limit to EDR. EDR derives it from the hardfork and gas limit of the block that runs the request.
