---
"@nomicfoundation/ignition-core": patch
---

Fixed Ignition hanging until it ran out of memory when a module passed one of its own futures into a submodule and then depended on that submodule's results.
