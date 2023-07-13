---
"hardhat": patch
---
Added logic to use the latest block as the forking block if the difference between the latest block and the max reorganization block is negative.
This decision is based on the assumption that if the max reorganization block is greater than the latest block then there is a high probability that the fork is occurring on a devnet.
