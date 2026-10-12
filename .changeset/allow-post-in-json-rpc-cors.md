---
"hardhat": patch
---

Allowed `POST` in the CORS preflight response of the JSON-RPC server started by `hardhat node`.

Previously the `Access-Control-Allow-Methods` header only listed `OPTIONS, GET`, so browsers blocked `POST` requests from web pages (e.g. `fetch("http://127.0.0.1:8545", { method: "POST", headers: { "Content-Type": "application/json" } })`) after the CORS preflight. The header now lists `OPTIONS, POST`, matching the methods the JSON-RPC handler actually serves.
