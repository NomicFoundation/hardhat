---
"hardhat": patch
---

Moved the calls to shouldMergeCompilationJobs from the task actions to the build system and made its' result the default fallback to use in absence of the mergeCompilationJobs option.
