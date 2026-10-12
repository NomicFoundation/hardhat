# Background

Hardhat ledger was built on LedgerJS (the `@ledgerhq/hw-app-eth` and `@ledgerhq/hw-transport*` packages), which Ledger has deprecated in favor of the [Device Management Kit (DMK)](https://developers.ledger.com/docs/device-interaction/getting-started).

Ledger's developer news states that in **September 2026** the Ethereum app drops support for `signEIP712HashedMessage`, and that all LedgerJS packages are deprecated from that date. `hardhat-ledger` called `signEIP712HashedMessage` as its fallback for `eth_signTypedData_v4`, so once users updated to that Ethereum app version, typed-data signing would have broken for them.

# Product & user impact

No configuration changes. Every method that worked before still works, with the same config, the same error codes and the same derivation-path cache file. Only three retry messages changed: two no longer tell you to open the Ethereum app, because it now opens itself, and a device that drops mid-request and does not come back is reported as not reconnecting, instead of the user being told to plug it in and enter the PIN. The plugin also prints what the device is waiting for: unlocking it, confirming that the Ethereum app opens, reviewing the transaction, message or typed data, or answering the Transaction Check opt-in.

Three things behave differently:

- **The plugin now talks to Ledger's servers** On every transaction and typed-data signature the DMK asks Ledger for display metadata and reports each signing event to Ledger's analytics endpoint; the old plugin only asked Ledger for typed-data display filters, and Ledger refuses that request today anyway. Without an origin token (see next section for more details [LINK_LINK]), which the plugin does not have, the visible effects are: ERC-20 and NFT transfers show the token or collection and the amount instead of raw data, recipients with an ENS name show that name, and every device except the Nano S shows the network name, with its icon on touchscreen devices. Everything else looks as it does today. Behaviors to be aware of lists what is sent and what an origin token would add.
- **The Ethereum app opens itself** Before, if the device was on its home screen or in another app, the request failed and Hardhat retried until the user opened the Ethereum app by hand. Now the DMK opens it as the first step of each request, closing any other app first; at most the device asks the user to confirm. Opening it makes the device reconnect over USB. A locked device still has to be unlocked by the user.
- **Hardhat no longer exits on its own after using the Ledger** Today Hardhat exits as soon as the script ends: the old library holds nothing while idle, so the connection never needs closing. The DMK keeps the USB session to the device open, and Node cannot exit while it is. Scripts must end with `await connection.close()`, as the README explains. Hardhat Ignition's tasks close the connection for you, so update `hardhat-ignition` together with `hardhat-ledger`. [LINK_LINK] Technical Design explains why, and Alternatives considered what else was tried.

# Behaviors to be aware of

- **One thing that used to work now fails on purpose.**

  Some typed-data messages (`eth_signTypedData_v4`) that the old plugin signed are now rejected with `ETH_SIGN_TYPED_DATA_V4_INVALID_DATA_PARAM`. Typed data built with ethers, viem or other standard tooling never triggers it. Hand-written typed data might.

  **Why.** The device never sees the typed-data JSON. The Ledger library on the host encodes the type declarations and the values into packets, and the device rebuilds the digest from them and then shows the review. The library converts without validating: given malformed input that ethers and viem would refuse to build, it quietly normalizes it. Two fields with the same name become one, a field named only with digits is moved to the front, a `bytes32` of 31 bytes is padded with a zero by the device. The device then signs a digest over type declarations the caller did not send. The screen shows only values, never the type declarations, so nothing looks wrong. What it shows depends on the device and its settings: typed data with no Ledger descriptor is refused outright unless the user has enabled Blind signing (or "Raw messages") in the Ethereum app. Ledger's security model treats the host computer as potentially compromised and makes the device's secure screen the trusted display ("what you see is what you sign"). The library runs on that untrusted host, so its parsing is not something Ledger's docs treat as a safety check; Ledger's docs mention the hashed fallback but say nothing about input validation. Our reading: since ethers and viem never produce such input, real wallets never hit it.

  **Is it dangerous?** Not for theft. The device signs what it shows, so "send 10ETH to A" cannot become "send 10ETH to B". The signature simply does not verify against the type declarations the contract uses, and without a check the caller learns that only when the contract rejects it. The exception is the library's fallback path, where the data is hashed on the host with ethers and the device blind-signs hex: there ethers turns the string `"false"` into `true` and nobody sees it.

  **What the plugin does.** After the device signs, it checks that the signature recovers to the Ledger's address from the caller's original data, and throws if not. Two inputs are refused before the device is asked, because that check cannot see them:

  - a number above 2^53, or with a fraction, passed as a JSON number: JSON parsing has already rounded it. Pass it as a string instead.
  - a string containing a lone surrogate, which is not valid text

  Everything else, including encoding bugs we do not know about yet, is caught after the user approves on the device, so the error appears after approval, not before. A field name outside plain ASCII still signs correctly today, if Blind signing is enabled on the device: the device rejects it and the library falls back to hashing the data itself. Without Blind signing the device refuses the hash and the request fails. Technical Design explains how the check works.

- **The plugin talks to Ledger's servers, and most of it needs an origin token we do not have.**

  **The origin token.** A secret Ledger issues to an application after it enrolls in Ledger's partner program (not for everyday developers). The DMK sends it as an HTTP header on every request to Ledger's servers; it identifies the caller, and Ledger's servers refuse some requests without it. Ledger's docs say the default context module needs it, and that without it you get only basic clear signing (ERC-20 transfers), no Transaction Check, and blind signing for other contract calls. Our probes agree, except that ENS names also work without it. The plugin passes none. It is not something a normal user can get: Ledger issues it per application, to wallets and integrators that enroll in its partner program. Ledger also says to keep it out of version control, which a published open-source plugin cannot do: whatever we ship is public. So Hardhat cannot hold one token for all users. The DMK accepts the token as an optional value, so the plugin could take one from config when a team already has one for its own product and send nothing otherwise; that is a config addition. Open question: should we add this option [QUESTION]?

  What the DMK does over the network, per signature. None of it has to succeed for the signature to happen; a failed request is swallowed and the device shows what it can decode alone.

  Does NOT need origin token
  - **ERC-20 token metadata, NFT metadata, network descriptors, signing certificates, gated-signing descriptors (a newer descriptor type), ENS and proxy lookups** This is what shows "Send 100 USDC" for a token transfer.
  - **Telemetry** After every transaction and typed-data signature (not `personal_sign`) the DMK reports chain id, target contract, signing method, device model, app and firmware versions, whether it was blind-signed and why, and a random id to Ledger's analytics endpoint. Sent regardless.

  Need origin token:
  - **Clear-signing descriptors** for contract calls, typed-data display filters and dApp plugins. This is what turns raw calldata into "Swap 1 ETH for 3000 USDC" and a typed-data message into named fields. Anonymous requests get 403; a made-up token gets 401. Without it, contract calls and typed data look exactly as they do today.
  - **Transaction Check** Touchscreen devices only (Stax, Flex and Nano Gen5). The device asks the user to enable it on first use; if they accept, the full raw transaction plus sender address is sent to Ledger's check service, powered by third parties, and the device shows a risk verdict. Without it the prompt still appears, the transaction is still sent, Ledger refuses it, and the device shows no verdict.

  Sent to Ledger for a transaction: chain id, the recipient address, and the full calldata (the proxy lookup sends it whenever no descriptor is found, which without a token is every contract call). For typed data: chain id and the verifying contract. The function selector and the type declarations stay on the machine, except the selector in NFT lookups. With Transaction Check enabled on the device, the whole transaction or typed data plus the sender is sent too, even without a token; Ledger just refuses it.

  **All of it can be disabled.** The DMK lets us replace the module that talks to Ledger with one that answers "nothing known"; connecting, opening the app, deriving addresses, `personal_sign`, `eth_sign` and our typed-data signature check never touch the network. With it disabled the device shows exactly what it shows with the current release. The plugin has no setting for this today. Open question: default to it, offer it as an option, or keep the network on [QUESTION].

- **The DMK does not load as ESM in plain Node.**

  Ledger ships two builds: CommonJS for Node and ESM for browsers. The ESM build is broken for Node: without a workaround the plugin would work under `npx hardhat`, which loads through tsx, but not under plain `node`. Still broken in DMK 1.9.1 and signer 1.18.1; [device-sdk-ts#922](https://github.com/LedgerHQ/device-sdk-ts/issues/922) reports the same broken build (with a different symptom on Node 20), no response. Workaround: the plugin loads the DMK packages through their CommonJS builds, behind a single import seam that the rest of the plugin goes through.

# Goals

- Keep every supported JSON-RPC method working on current and future Ledger Ethereum app versions: `eth_accounts`, `personal_sign`, `eth_sign`, `eth_signTypedData_v4`, `eth_sendTransaction`.
- Replace all `@ledgerhq/hw-*` dependencies with the DMK stack.
- Never return a signature over something other than what the caller asked for.
- Preserve the user-facing config, error messages and retry behaviour, except that a reconnect waits 10 seconds for the device instead of 3.

# Non-goals

- No changes to the plugin's public API or config format.
- No new features (EIP-7702 authorization, Safe address verification, Bluetooth/WebHID transports) even though the DMK offers them.
- No changes to any other published package, except Hardhat Ignition's tasks closing their network connection when they finish (see here [LINK_LINK]). `hardhat-ethers`, `hardhat-viem` and the rest talk to the EIP-1193 provider and never see Ledger code.

# Technical Design

All Ledger-specific code sits behind one seam, before and after the migration: nothing outside the signing handler and its helpers knows which Ledger library is in use. Every old call has a direct DMK equivalent, so the migration is mechanical except for five parts.

**Observables instead of promises.** Every DMK signer call returns a stream of device-action states instead of a promise that resolves or rejects. A small adapter turns each stream back into a promise, so the handler's retry logic is unchanged. The pending states also say what the device is waiting for, which is how we can print "Review and approve the transaction on your Ledger device".

**Errors are tagged objects, not `Error`s.** The DMK reports a failure as an object with a tag string that does not extend `Error`. The plugin wraps it and classifies by tag into three sets: retry the connection, device not ready, device not connected. Two traps: one DMK error is exported under one name and tagged with another, so both spellings are matched. And most failures arrive through the action stream, but a signer whose session the kit already dropped (device unplugged for longer than the kit's 6-second wait, or another connection to the same device closed, which drops every session on the shared USB link) throws the raw object synchronously, before any stream exists; that throw is wrapped too and classified as "retry the connection", so the request reconnects as it did with LedgerJS. "Ethereum app not open" is no longer an error at all, because the DMK opens the app itself.

**Device discovery polls.** The DMK's node-hid transport misses a device that reconnects over USB, which happens whenever the Ethereum app opens: it lists the HID devices as soon as the USB device appears, finds none yet, and never updates its device list. The plugin asks for the list again every 500 ms. The DMK waits 6 seconds for a reconnecting device before dropping its session, and slower USB stacks take longer, so after a session drops mid-request the plugin waits 10 seconds for the device instead of the usual 3.

**Typed data is verified after the device signs it.** The DMK encodes typed data itself, and falls back to an ethers encoder when it cannot, or when the device returns an error. Both encoders silently mis-encode some valid-looking inputs, so the device signs a different message than the caller sent, and the user cannot see the difference. Instead of predicting every such input, the handler recovers the signer from the signature and the caller's own data, using a hashing library the plugin already depends on. If the device signed anything else, the recovered address is not the user's account and the signature is refused. That catches every mis-encoding, known or not, and any future regression in the DMK.

The check works because our hasher either hashes the caller's data faithfully or refuses it. Probed against every input the DMK is known to get wrong:

| Input | Our hasher | Outcome |
| --- | --- | --- |
| duplicate field names, short `bytes32` or `address`, `bool` as a string, `[07]` array count, undeclared struct | throws | refused |
| field name made only of digits, or `__proto__` | hashes what was declared | device digest differs, refused |
| field name outside ASCII | hashes what was declared | the device rejects it and the ledger ethers fallback hashes it correctly, which the device signs only if Blind signing is enabled; without it the device refuses and the request fails. Fails in both cases once the Ethereum app drops the hashed command, announced for September 2026 |
| custom `EIP712Domain` (extra field or reordered) | hashes the declaration, as does the DMK | signed correctly; only the ethers fallback mismatches, and that is refused |
| number above 2^53 or with a fraction; lone surrogate | agrees with the device | checked before the device is asked |

The last row is nearly the only validation left before the device is asked: parse the JSON, check the shape, convert the chain id to a number (refusing values that do not convert exactly), and walk the values for those two cases. Nothing in it knows about the DMK's wire format.

**Process exit.** Node exits when nothing is left listening. LedgerJS listened for USB plug/unplug only while searching for the device and read from it only during a request, so the current release connects once, never closes, and still exits when the script ends. The DMK transport keeps plug/unplug listeners for the kit's lifetime and a read handle on the device for the session's lifetime. Closing the kit closes the device sessions, which releases the read handle, but leaves the plug/unplug listeners; only destroying the transport removes them, and since the DMK does not expose the transport, the plugin captures it as the DMK builds it. Destroying it leaves one thing behind, the `process` exit listener the transport registered when it was built; the plugin removes that too, because the kit is rebuilt on the next connection and Node warns about a leak once ten listeners have piled up. Calling it is easy; knowing when is not: Hardhat never closes connections on its own, there is no task-lifecycle hook, and Node's before-exit event never fires while the session is open. Ledger's docs say to disconnect when done but nothing about the process staying alive; Ledger's own CLI ends with `process.exit`, and the Node.js example in Ledger's DMK agent skill calls it only on errors and Ctrl+C, so a normal run of that example would hang the same way.

Closing is therefore explicit, in three pieces:

1. Closing the network connection releases everything: the plugin cancels any device action still running (the DMK does not stop it when its session closes, and the request that started it then fails with the closed-connection error), closes the device session and, once no other open connection is using it, destroys the transport. A connection attempt that gives up ("no Ledger plugged in") releases the kit too, and neither a pending retry wait nor an in-flight request can keep the process alive past the close, except that a device search already under way runs to its timeout (at most 10 seconds).
2. The README tells scripts to end with `await connection.close()`. The plugin prints no reminder, because it would show on every connection, including in scripts that already close it.
3. Hardhat Ignition's deploy, track-tx and verify tasks close their connection when they finish. Adding the call to the Hardhat templates' scripts is a follow-up. No peer dependency ties `hardhat-ledger` to `hardhat-ignition`, so both changesets say to update them together.

On the device this is exactly the current release: connect once, sign, reconnect only after a device error, such as a session lost while the Ethereum app opens. A script that forgets to close the connection hangs until Ctrl+C.

**Dependencies.** The six LedgerJS packages are replaced by four DMK packages: the kit, the Ethereum signer, the node-hid transport and the context module, the last one only because the signer declares it as a peer dependency. `rxjs` becomes a direct dependency pinned to exactly `7.8.2`, not a range: the kit and the transport declare it as a peer dependency at that exact version, so a range would drift off the peer as soon as a newer `rxjs` is published and leave pnpm warning or installing a second copy. The plugin's own code imports `rxjs` only for its types. `node-gyp` stays, for `node-hid`.

# Alternatives considered

## Typed-data safety

- **Whitelist the inputs the DMK mis-encodes.** The first version of this work: ~700 code lines predicting, rule by rule, what the DMK's parser and its ethers fallback get wrong. It fails before the device prompt, which is nicer for the user, but it mirrors DMK internals byte for byte (the DMK does not export its parser or its ethers fallback, and the parser accepts most of the inputs it then mis-encodes, so reusing it would not have helped), drifts on every DMK release, cannot catch a bug it does not list, and rejected legitimate inputs such as a custom `EIP712Domain` or a type cycle unreachable from the primary type. Replaced by the signature check: the validation went from 705 lines to 158, and the check itself is about 50 lines.

## Process-exit problem

Each one either guesses when the script is done, lives outside this package, or costs more than it saves.

- **Have Hardhat core close connections when a task ends.** Today core never closes connections: `create()` connections are not tracked at all, `getOrCreate()` connections sit in a cache that is never cleared, and the CLI runs the task and returns. The fix would be small: track open connections and close the ones still open once the task ends. Every `hardhat` command would then release the Ledger with nobody closing the connection by hand, and the Ignition change would become unnecessary. It does not cover scripts started with plain `node`, nor scripts that keep working after their top-level code returns, and `hardhat-ledger` would need a peer-dependency bump to that core version. [QUESTION] Open question: is the current behaviour a design choice? Connections are modelled as caller-owned objects, but nothing documents a decision not to close them at exit; it never mattered, because no provider so far kept the process alive.
- **A session per signing request.** Least code, but a full USB reconnect per transaction.
- **Close the session after X idle seconds (e.g. 5) and reconnect silently.** Exits by itself, but every pause longer than X reopens the USB device: a script that sends transactions in sequence and waits for each one to be mined before the next reconnects before every transaction if X is lower than the block time. Reopening is an untested path whose failure would show as a wrong "device not connected" message and a 30-second wait; it is the most code; and X is a guess, since nothing separates "waiting for a block" from "finished".
- **Keep the session, print a message after X idle seconds.** No reconnects, but the process still hangs until Ctrl+C, that non-zero exit breaks `pnpm deploy && ...` chains, and the message fires in the middle of a deploy.
