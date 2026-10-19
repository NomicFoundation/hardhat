---
"hardhat": minor
---

Fixed interval mining accepting a `mining.interval` range that it could not honour. A range must now satisfy `1 <= min <= max`. An invalid range is rejected when the provider is created and when `evm_setIntervalMining` is called.

BREAKING CHANGE: `[0, 0]` and `[0, N]` ranges are no longer accepted. Use a range with a minimum of at least `1`, such as `[1, N]`. Set `mining.interval` to `0` to disable interval mining.
