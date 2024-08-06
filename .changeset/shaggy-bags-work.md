---
"hardhat": patch
---

Do not send `http_setLedgerOutputEnabled` messages if they reacht the HTTP Provider to prevent unwanted warnings in the local hardhat node logs
