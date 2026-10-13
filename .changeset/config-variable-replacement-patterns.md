---
"hardhat": patch
---

Fixed config values containing "$$", "$&", "$`" or "$'" being altered when resolved, including inline values. An HD account passphrase with one of these will now derive different accounts than before.