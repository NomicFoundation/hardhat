---
"@nomicfoundation/hardhat-ignition": patch
---

Made `ignition deploy` print each batch once when its output isn't a terminal, and then only the lines whose status changed, instead of reprinting the whole batch on every update ([#8798](https://github.com/NomicFoundation/hardhat/issues/8798)).
