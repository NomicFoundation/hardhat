---
"hardhat": patch
---

Fixed forking requests to loopback URLs being sent through `HTTP_PROXY` or `HTTPS_PROXY`. Requests to `localhost`, `*.localhost`, `127.0.0.0/8`, `0.0.0.0` and `::1` now bypass the proxy.
