---
"hardhat": patch
---

Update templates `.gitignore` so template projects ignore local `.env` files but still allow committing `.env.example` files. This is a small, non- breaking fix to improve template hygiene for users who keep local env files in their workspace.
