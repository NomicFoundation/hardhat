---
"hardhat": patch
---

Ensure concurrency safety across when downloading compilers for multiple hardhat projects

This fixes a concurrency issue that arises from the separation of the `isCompilerDownloaded` and `downloadCompiler` calls, where the previous call to `downloadCompiler` was safe, but `isCompilerDownloaded` was not.

This also has the nice side effect of downloading the same compiler once and only once. 
