---
"hardhat": patch
---

fix: We generate stack traces for failing Solidity tests by re-executing them for performance reasons. This fix ensures that we don't generate stack traces if EVM execution is indeterministic. Indeterminism can be caused by forking from the latest block number or by using impure cheatcodes. 
