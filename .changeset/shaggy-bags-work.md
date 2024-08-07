---
"hardhat": patch
---

Do not send `http_setLedgerOutputEnabled` messages beyond the HTTP Provider to prevent unwanted warnings in the logs of the local hardhat node
