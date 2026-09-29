---
"hardhat": patch
---

Fixed prompts only receiving the first line when input is piped (e.g. `printf 'password\npassword\nvalue\n' | npx hardhat keystore set KEY`); later prompts now read the following lines instead of the process exiting with an unsettled top-level await.
