---
"hardhat": patch
---

Added support for the `http_proxy` environment variable. When this variable is set, Hardhat will send its requests through the given proxy for things like JSON-RPC requests, mainnet forking and downloading compilers.

We also removed support for the `HTTP_PROXY` and `HTTPS_PROXY` environment variables, since `http_proxy` is the most commonly used environment variable for this kind of thing. Those variables could only be used for downloading compilers.

Finally, we also added support for `no_proxy`, which accepts a comma separated list of hosts or `"*"`. Any host included in this list will not be proxied.

Note that requests to `"localhost"` or `"127.0.0.1"` are never proxied.
