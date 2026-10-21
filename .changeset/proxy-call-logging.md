---
"hardhat": patch
---

Fixed calls through proxy contracts being logged as `<unrecognized-selector>`. A selector that is missing from the called contract is now resolved against the implementation behind the proxy. The call is labeled with the full delegation chain, such as `Proxy>Implementation#setValue`.
