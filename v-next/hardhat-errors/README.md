# Hardhat errors

This packages has the definition of the error classes used by Hardhat, and the list of possible errors.

This module exports:

1. The error class `HardhatError`, which has a static field `ERRORS`, with the different `ErrorDescriptors` that it accepts.
2. The interface `ErrorDescriptor`.
3. The assertion helper `assertHardhatInvariant`.
