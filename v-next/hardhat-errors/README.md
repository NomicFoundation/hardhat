# Hardhat errors

This packages has the definition of the error classes used by Hardhat, and the list of possible errors.

This module exports:

1. The error class `HardhatError`, which has a static field `ERRORS`, with the different `ErrorDescriptors` that it accepts.
2. The error class `HardhatPluginError`, which is the recommended way to handle errors in Hardhat plugins. For convenience, it is re-exported from `@nomicfoundation/hardhat/plugins`. Plugin developers should import it from this path.
3. The interface `ErrorDescriptor`.
4. The assertion helper `assertHardhatInvariant`.
