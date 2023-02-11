# Common problems

This section describes common problems with working with Hardhat and how to solve them.

## Out of memory errors when compiling large projects

If your project has lots of smart contracts, compiling them may require more memory than what Node allows by default and crash.

If you are experiencing this problem, you can use Hardhat's `--max-memory` argument:

```
npx hardhat --max-memory 4096 compile
```

If you find yourself using this all the time, you can set it with an environment variable in your `.bashrc` (if using bash) or `.zshrc` (if using zsh): `export HARDHAT_MAX_MEMORY=4096`.

## Using Hardhat with a proxy server

Hardhat supports the `http_proxy` environment variable. When this variable is set, Hardhat will send its requests through the given proxy for things like JSON-RPC requests, mainnet forking and downloading compilers.

There's also support for the `no_proxy` variable, which accepts a comma separated list of hosts or `"*"`. Any host included in this list will not be proxied. Note that requests to `"localhost"` or `"127.0.0.1"` are never proxied.
