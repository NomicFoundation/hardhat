---
"@nomicfoundation/hardhat-keystore": patch
---

Restricted newly written keystore and development password files to the current user. Files written by earlier versions keep their existing permissions until they are written again. If you share a keystore with other OS users (for example a CI service account or a container running as a different user), they lose read access once the file is rewritten.
