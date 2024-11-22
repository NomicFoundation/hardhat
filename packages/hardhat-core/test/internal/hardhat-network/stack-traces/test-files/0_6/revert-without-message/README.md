## Tests before and after 0.6.3

Starting from solc 0.6.3, `revert`s and `require`s without an error message don't have an associated sourcemap. See [this issue](https://github.com/ethereum/solidity/issues/9006).

The tests in `solc-before-0.6.3` produce the same result as the equivalent tests in the main directory, even if the error message is missing, since in those versions the source maps work fine.

The tests in `solc-after-0.6.3` produce a less complete stack trace that also warns the users to upgrade the compiler and use error messages.
