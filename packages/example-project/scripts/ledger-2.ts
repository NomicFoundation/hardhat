// cspell:ignore BAYC bayc Stax
/**
 * Ledger manual QA, part 2.
 *
 * `ledger.ts` covers the four RPC methods and the three transaction types. This
 * file covers what the Device Management Kit (DMK) migration adds or changes,
 * one scenario per item of the design doc, so that each one can be tried
 * against a real Ledger by uncommenting it in the SCENARIOS block below.
 *
 * Setup
 *   1. Put your Ledger address in `hardhat.config.ts`, under
 *      `networks.edrOp.ledgerAccounts`.
 *   2. Plug the device in and unlock it. Do NOT open the Ethereum app: the
 *      plugin opens it, and several scenarios check exactly that.
 *   3. Uncomment one or more scenarios, then run:
 *
 *        npx hardhat run scripts/ledger-2.ts
 *
 * Every scenario opens its own network connection and closes it in `finally`,
 * so each one also checks that the process exits afterwards (a watchdog at the
 * end of the SCENARIOS block complains if it does not). Running several in a
 * row also exercises the DMK being rebuilt for every new connection. Lines
 * printed as `[hardhat-ledger] ...` come from the plugin; lines starting with
 * `>>>`, `EXPECTED RESULT:` and `BUT GOT WRONG RESULT:` come from this script.
 * An error a scenario expects is first printed as `npx hardhat run` would
 * print it, uncaught. A failed scenario does not stop the ones after it, and
 * the exit code is 1.
 *
 * Covered outside this file:
 *   - Hardhat Ignition closes its connection (design doc, "Process exit", 3):
 *
 *       npx hardhat ignition deploy ignition/modules/Apollo.ts --network edrOp --default-sender <your ledger address>
 *
 *     Expect two approvals on the device, then the process exits by itself.
 *   - The CommonJS import seam ("The DMK does not load as ESM in plain Node"):
 *     `npx hardhat run` loads the script through tsx. To load it through plain
 *     Node, with any scenario uncommented, run:
 *
 *       pnpm build && node dist/scripts/ledger-2.js
 *
 *   - The origin token and switching the network module off: the plugin has no
 *     setting for either (both are open questions in the doc), so there is
 *     nothing to run.
 */
import type { TypedDataDomain, TypedDataField } from "ethers";
import type { NetworkConnectionParams } from "hardhat/types/network";

import assert from "node:assert/strict";
import diagnosticsChannel from "node:diagnostics_channel";
import { setTimeout as sleep } from "node:timers/promises";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import hre from "hardhat";
import { recoverTypedDataAddress } from "viem";

// Not exported by `hardhat`: reached through the workspace so that errors are
// printed exactly as `npx hardhat run` prints them.
import { printErrorMessages } from "../../hardhat/dist/src/internal/cli/error-handling/error-handler.js";

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/**
 * Prints every request the DMK makes to Ledger's servers, in every scenario.
 * `requestsToLedgerServers()` turns this on for itself.
 */
const LOG_REQUESTS_TO_LEDGER_SERVERS = false;

/** Any Ethereum mainnet RPC works; two scenarios fork it. */
const MAINNET_RPC_URL = "https://ethereum-rpc.publicnode.com";

const configuredLedgerAccounts = hre.config.networks.edrOp.ledgerAccounts;

assert.ok(
  configuredLedgerAccounts.length > 0,
  "Set your Ledger address in hardhat.config.ts, under networks.edrOp.ledgerAccounts",
);

const LEDGER_ADDRESS: string = configuredLedgerAccounts[0];

console.log(`Ledger account: ${LEDGER_ADDRESS}`);

// ---------------------------------------------------------------------------
// Constants (declared before the scenarios run, which is why they sit here)
// ---------------------------------------------------------------------------

const ONE_ETH = 10n ** 18n;
const GWEI = 10n ** 9n;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * hardhat-ethers fills neither gas nor fees for a Ledger account, and the
 * plugin refuses to sign a transaction without them. High enough for a mainnet
 * fork too.
 */
const TX_OVERRIDES = {
  gasLimit: 300_000n,
  maxFeePerGas: 50n * GWEI,
  maxPriorityFeePerGas: 1n * GWEI,
};

/** Native USDC on OP mainnet, known to Ledger's token service. */
const USDC_ON_OPTIMISM = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85";
const USDC_UNIT = 10n ** 6n;
/** `balanceAndBlacklistStates` in FiatTokenV2_2, checked against balanceOf. */
const USDC_BALANCE_SLOT = 9n;
/** Bored Ape Yacht Club, known to Ledger's NFT service. */
const BAYC_ON_MAINNET = "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D";
/** nick.eth. Ledger's name service resolves it on chain 1, not on chain 10. */
const NICK_ETH = "0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

const ERC721_ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function transferFrom(address from, address to, uint256 tokenId)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
];

const EIP712_DOMAIN_TYPE: TypedDataField[] = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
];

const MAIL_TYPES = {
  Mail: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "contents", type: "string" },
    { name: "amount", type: "uint256" },
  ],
};

/** Set by `forgetToClose()`, the one scenario that must hang. */
let expectedToHang = false;
/** Set by each scenario, printed by `run()` once it is over. */
let expectedResult: string | undefined;
let loggingRequests = false;

if (LOG_REQUESTS_TO_LEDGER_SERVERS) {
  logRequestsToLedgerServers();
}

// ---------------------------------------------------------------------------
// SCENARIOS: uncomment the test you want to run, then
// `npx hardhat run scripts/ledger-2.ts`. Several uncommented tests run one
// after the other. Tests are numbered by priority: the lower the number, the
// more important it is to run it.
// ---------------------------------------------------------------------------

// ===========================================================================
// PRIORITY 1: run these. The migration's core paths on real hardware, which no
// unit test can cover.
// ===========================================================================

// TEST NR 1: the baseline. Connect, sign a message, close the connection: no
// reminder about closing the connection is printed any more, and the process
// exits on its own once the script ends.
// await run(closeReleasesTheProcess);

// TEST NR 2 (delete the cache file first, then run twice): the derivation-path
// search finds your address with no prompt on the device and writes the cache;
// the second run uses the cached path and prints no derivation lines.
// await run(derivationPathCache);

// TEST NR 3: typed data through the ethers signer, the reason for the
// migration: the device shows the fields, signs, and the signature verifies.
// await run(typedDataWithEthersSigner);

// TEST NR 4: a plain ETH transfer, eth_sendTransaction end to end: the network
// name on the device (every model but the Nano S) and the Transaction Check
// prompt on touchscreen devices.
// await run(plainTransfer);

// TEST NR 5 (start with the device on its home screen, or in another app): the
// plugin opens the Ethereum app itself instead of failing until you open it.
// await run(appOpensItself);

// TEST NR 6 (start with the device locked): the plugin waits for you to unlock,
// or retries after 30 s, and the message no longer says to open the Ethereum app.
// await run(lockedDevice);

// TEST NR 7 (reject on the device): the rejection reaches the script as an
// error, with no retry loop, and the process still exits.
// await run(rejectOnDevice);

// TEST NR 8: a script that never closes the connection hangs after it ends,
// until Ctrl+C. This is the one scenario that is supposed to hang.
// await run(forgetToClose);

// TEST NR 9 (approve on the device): a field named only with digits, which the
// DMK encodes in the wrong order: after your approval the plugin refuses the
// signature with ETH_SIGN_TYPED_DATA_V4_SIGNATURE_MISMATCH, because it does not
// recover to your address.
// await run(typedDataDigitsFieldName);

// TEST NR 10: nine malformed inputs (an integer above 2^53 as a JSON number, a
// fraction, a lone surrogate, a blank chain id, not typed data at all, a
// duplicate field name, a bool as a string, a short bytes32, an undeclared
// struct) are refused with ETH_SIGN_TYPED_DATA_V4_INVALID_DATA_PARAM without
// any prompt on the device.
// await run(typedDataRefusedBeforeDevice);

// TEST NR 11 (start with the device unplugged, plug it in when asked): the
// "Device not connected" retry message, then a successful retry.
// await run(deviceNotPluggedIn);

// ===========================================================================
// PRIORITY 2: run if time allows. Claims of the design doc that depend on the
// device or on Ledger's servers.
// ===========================================================================

// TEST NR 12 (unplug and replug during the countdown): the plugin reconnects,
// waiting up to 10 s for the device to come back, and the second signature
// works.
// await run(unplugAndReplugBetweenRequests);

// TEST NR 13 (do not approve on the device): closing the connection while a
// request waits on the device fails it with CONNECTION_CLOSED, and the process
// exits.
// await run(closeWhileWaitingForApproval);

// TEST NR 14: an ERC-20 transfer (USDC on the OP fork) is clear-signed: token
// and amount instead of raw calldata.
// await run(erc20TransferIsClearSigned);

// TEST NR 15: every request the DMK makes to Ledger's servers is printed: none
// for personal_sign, metadata plus telemetry for a transaction and for typed
// data, all without an origin token.
// await run(requestsToLedgerServers);

// TEST NR 16: a contract call with no descriptor (a local Counter) is shown
// raw, with the blind-signing warning, exactly as today.
// await run(contractCallWithoutDescriptor);

// TEST NR 17: a custom EIP712Domain (an extra salt field, then reordered
// fields) is signed as declared instead of being rejected.
// await run(typedDataCustomDomain);

// TEST NR 18: a non-ASCII field name: signs through the blind-signing fallback
// if Blind signing is enabled on the device, fails otherwise.
// await run(typedDataNonAsciiFieldName);

// TEST NR 19: typed data through a viem wallet client signs and verifies.
// await run(typedDataWithViem);

// TEST NR 20: two connections to the same Ledger: closing one does not break
// the other, and the process exits once both are closed.
// await run(twoConnectionsAtOnce);

// TEST NR 21: two concurrent requests share one device session: a single
// "Connecting to Ledger..." line, two approvals, two valid signatures.
// await run(concurrentRequestsShareOneSession);

// TEST NR 22 (forks mainnet for the second half): a recipient with an ENS name
// is shown as the raw address on chain 10 and as "nick.eth" on chain 1.
// await run(ensRecipientShowsItsName);

// TEST NR 23 (forks mainnet): an NFT transfer (BAYC) shows the collection name
// and the token id.
// await run(nftTransferIsClearSigned);

// ===========================================================================
// PRIORITY 3: variants and edge cases, covered by unit tests or already
// smoke-tested without a device.
// ===========================================================================

// TEST NR 24: a request after close() fails with CONNECTION_CLOSED instead of
// reopening a device session, and the process exits.
// await run(requestAfterClose);

// TEST NR 25 (start unplugged, stay unplugged): closing the connection during
// the 30-second "device not connected" wait fails the request at once, and the
// process exits.
// await run(closeWhileWaitingForDevice);

// TEST NR 26: domain.chainId given as a hexadecimal, then as a decimal, string.
// await run(typedDataChainIdAsString);

// TEST NR 27: a uint256 above 2^53 passed as a string signs correctly.
// await run(typedDataBigIntegerAsString);

// TEST NR 28: typed data passed as an object instead of a JSON string.
// await run(typedDataAsObject);

// TEST NR 29 (approve on the device): a field named __proto__, whose value the
// DMK loses: after your approval the plugin refuses the signature with
// ETH_SIGN_TYPED_DATA_V4_SIGNATURE_MISMATCH.
// await run(typedDataProtoFieldName);

// TEST NR 30: an ERC-20 approve is clear-signed like the transfer.
// await run(erc20ApproveIsClearSigned);

// TEST NR 31: a custom derivationFunction with m/-prefixed paths is used to
// search 21 paths for an unknown address, then
// CANNOT_FIND_VALID_DERIVATION_PATH quotes them.
// await run(derivationFunctionOverride);

// TEST NR 32 (approve on the device): an EIP-7702 transaction. A fresh account
// delegates to a local Counter, the Ledger account sends the type-4 transaction
// that carries the authorization, and the authority's code becomes
// 0xef0100 + the Counter's address.
// await run(eip7702DelegationIsSigned);

// TEST NR 33: a request from an address that is not a Ledger account is passed
// through to the simulated network without touching the device.
// await run(unownedAddressIsPassedThrough);

armExitWatchdog();

// ---------------------------------------------------------------------------
// Product & user impact: the device, the app and the messages
// ---------------------------------------------------------------------------

/** The baseline: connect, sign, close, exit. */
async function closeReleasesTheProcess(): Promise<void> {
  expected(
    "'[hardhat-ledger] Connecting to Ledger...', 'Connection successful', " +
      "and no reminder about closing the connection: the plugin no longer " +
      "prints one. The connection is closed in `finally`, so the process " +
      "exits within a second of the last line.",
  );

  await withConnection(async (ctx) => {
    await personalSign(ctx, "close releases the process");
  });
}

async function appOpensItself(): Promise<void> {
  expected(
    "no 'open the Ethereum app' error and no 30-second retry. The DMK opened " +
      "the Ethereum app as the first step of the request (closing the other " +
      "app first, if one was open), at most after '[hardhat-ledger] Confirm " +
      "opening the Ethereum app on your Ledger device' and a confirmation on " +
      "the device.",
  );

  step(
    "Before running: leave the device on its home screen, or inside another app such as Bitcoin.",
  );

  await withConnection(async (ctx) => {
    await personalSign(ctx, "the Ethereum app opens itself");
  });
}

async function lockedDevice(): Promise<void> {
  expected(
    "either '[hardhat-ledger] Unlock your Ledger device to continue' with " +
      "the request waiting for you, or 'Device is locked. Please unlock your " +
      "Ledger. Retrying in 30 seconds...' followed by a retry. Neither " +
      "message tells you to open the Ethereum app any more. The signature " +
      "verifies once you unlock.",
  );

  step("Before running: lock the device. Unlock it when the device asks.");

  await withConnection(async (ctx) => {
    await personalSign(ctx, "the device was locked");
  });
}

async function deviceNotPluggedIn(): Promise<void> {
  expected(
    "'[hardhat-ledger] Device not connected or PIN not entered. Please plug " +
      "in your Ledger and enter the PIN. Retrying in 30 seconds...' (without " +
      "'and open the Ethereum app'), then a valid signature on the next " +
      "attempt, then the process exits.",
  );

  step(
    "Before running: unplug the Ledger. Plug it back in and unlock it when you see the retry message.",
  );

  await withConnection(async (ctx) => {
    await personalSign(ctx, "the device was not plugged in");
  });
}

async function rejectOnDevice(): Promise<void> {
  expected(
    "'[hardhat-ledger] Confirmation failure', then the DMK error reaches " +
      "the script as is: a tagged error, not a HardhatError, which Hardhat " +
      "prints as 'An unexpected error occurred:' with its stack. There was " +
      "no retry and no reconnection, and the process exits after the close.",
  );

  step("Reject the message on the device when it asks.");

  await withConnection(async (ctx) => {
    const outcome = await settle(personalSign(ctx, "reject me"));

    assert.ok(outcome !== undefined, "The rejection should fail the request");

    await printAsHardhatWould(outcome);
  });
}

async function unplugAndReplugBetweenRequests(): Promise<void> {
  expected(
    "'[hardhat-ledger] Reconnecting to Ledger...' then 'Connecting to " +
      "Ledger...' before the second request: the DMK reported the lost " +
      "device as an error, the plugin dropped the session and connected " +
      "again (at most twice), waiting up to 10 seconds for the device to " +
      "show up again. If it was not back in time: 'Device did not " +
      "reconnect. Please check that your Ledger is plugged in and " +
      "unlocked. Retrying in 30 seconds...' and another attempt. The " +
      "second signature verifies. If the DMK reconnected the session by " +
      "itself, no such line appears and the request just works.",
  );

  await withConnection(async (ctx) => {
    await personalSign(ctx, "before the unplug");

    step(
      "Now unplug the Ledger, plug it back in and unlock it. The next request starts in 25 seconds.",
    );
    await countdown(25);

    await personalSign(ctx, "after the replug");
  });
}

async function concurrentRequestsShareOneSession(): Promise<void> {
  expected(
    "'[hardhat-ledger] Connecting to Ledger...' printed once, not twice: " +
      "the two requests share one device session. Two approvals on the " +
      "device, one after the other; the second one may wait, or print " +
      "'Device not ready ... Retrying in 30 seconds...', while the first is " +
      "on the screen. Both signatures verify.",
  );

  await withConnection(async (ctx) => {
    await Promise.all([
      personalSign(ctx, "first of two concurrent requests"),
      personalSign(ctx, "second of two concurrent requests"),
    ]);
  });
}

async function derivationPathCache(): Promise<void> {
  expected(
    "first run: '[hardhat-ledger] Derivation started', one 'Derivation " +
      "progress. Path: m/44'/60'/N'/0/0, account index: N' line per account " +
      "tried without any prompt on the device, then 'Derivation success', " +
      "and the file is written back with `m/`-prefixed paths. Second run: " +
      "none of those lines, the path comes from the file.",
  );

  step(
    `The derivation-path cache is ${cacheFileHint()}. Delete it, run this scenario, then run it again.`,
  );

  await withConnection(async (ctx) => {
    await personalSign(ctx, "derivation path cache");
  });
}

// ---------------------------------------------------------------------------
// Process exit
// ---------------------------------------------------------------------------

async function forgetToClose(): Promise<void> {
  expected(
    "the script is done but the process does not exit: the DMK keeps the USB " +
      "session open and Node cannot exit while it is. Stop it with Ctrl+C.",
  );

  expectedToHang = true;

  const ctx = await connect();

  await personalSign(ctx, "the script forgot to close the connection");

  // Deliberately no `ctx.connection.close()`.
}

async function closeWhileWaitingForApproval(): Promise<void> {
  expected(
    "the pending request failed with CONNECTION_CLOSED ('The network " +
      "connection was closed. Create a new connection to keep using the " +
      "Ledger.') as soon as close() ran (the plugin cancelled the device " +
      "action, so the device left the review screen), and the process exits.",
  );

  step(
    "Do NOT approve on the device: the connection closes on its own after 15 seconds.",
  );

  const ctx = await connect();

  const pending = settle(personalSign(ctx, "close while waiting for approval"));

  await sleep(15_000);

  await ctx.connection.close();

  const outcome = await pending;

  assert.ok(outcome !== undefined, "The pending request should have failed");

  await printAsHardhatWould(outcome);

  assert.ok(
    isLedgerError(outcome, "CONNECTION_CLOSED"),
    `Expected CONNECTION_CLOSED, got: ${describeError(outcome)}`,
  );
}

async function closeWhileWaitingForDevice(): Promise<void> {
  expected(
    "'Device not connected or PIN not entered ... Retrying in 30 seconds...', " +
      "then close() ended that wait at once: '[hardhat-ledger] Connection " +
      "error' and CONNECTION_ERROR (reporting the original 'No Ledger device " +
      "was found') well before 30 seconds, and the process exits even though " +
      "no device session was ever opened: the DMK's USB listeners were " +
      "released anyway.",
  );

  step("Before running: unplug the Ledger and leave it unplugged.");

  const ctx = await connect();

  const started = Date.now();

  const pending = settle(personalSign(ctx, "close while waiting for device"));

  // The device search gives up after 3 seconds, then the 30-second wait starts.
  await sleep(8_000);

  await ctx.connection.close();

  const outcome = await pending;
  const elapsedSeconds = (Date.now() - started) / 1000;

  assert.ok(outcome !== undefined, "The pending request should have failed");

  await printAsHardhatWould(outcome);

  assert.ok(
    isLedgerError(outcome, "CONNECTION_ERROR"),
    `Expected CONNECTION_ERROR, got: ${describeError(outcome)}`,
  );
  assert.ok(
    elapsedSeconds < 30,
    `The request took ${elapsedSeconds}s: close() did not cut the 30-second wait short`,
  );

  console.log(`    The request failed after ${elapsedSeconds}s`);
}

async function requestAfterClose(): Promise<void> {
  expected(
    "CONNECTION_CLOSED ('The network connection was closed. Create a new " +
      "connection to keep using the Ledger.'): the plugin refuses to open a " +
      "new device session for a closed connection, so nothing is left open " +
      "and the process exits.",
  );

  const ctx = await connect();

  await personalSign(ctx, "before the close");

  await ctx.connection.close();

  await expectLedgerError(
    personalSign(ctx, "after the close"),
    "CONNECTION_CLOSED",
  );
}

async function twoConnectionsAtOnce(): Promise<void> {
  expected(
    "closing A never breaks B: B either signed while A was open (two " +
      "sessions on one device) or, if the device refused a second session, " +
      "signed once A was closed. The shared USB transport is only destroyed " +
      "when no connection is using it, so the process exits once both are " +
      "closed and not before.",
  );

  const a = await connect();
  const b = await connect();
  let aClosed = false;

  try {
    await personalSign(a, "connection A");

    const bWhileAOpen = await settle(personalSign(b, "connection B"));

    if (bWhileAOpen !== undefined) {
      await printAsHardhatWould(bWhileAOpen);
      console.log("    B could not use the device while A held it.");
    }

    await a.connection.close();
    aClosed = true;

    step("A is closed. Signing on B...");

    await personalSign(b, "connection B after A was closed");
  } finally {
    if (!aClosed) {
      await a.connection.close();
    }

    await b.connection.close();
  }
}

// ---------------------------------------------------------------------------
// Behaviors to be aware of: what the device shows, what goes to Ledger
// ---------------------------------------------------------------------------

async function requestsToLedgerServers(): Promise<void> {
  expected(
    "connecting, opening the app, deriving the path and personal_sign made " +
      "no request. The transaction fetched display metadata (Ledger's " +
      "crypto-assets service, nft.api.live.ledger.com, " +
      "metadata.api.live.ledger.com...) and ended with a POST to " +
      "blind-signing.api.ledger.com/ingest, the telemetry. Typed data did " +
      "the same for the domain's chain id and verifying contract. Every " +
      "line says 'no origin token': the plugin sends none.",
  );

  logRequestsToLedgerServers();

  await withConnection(async (ctx) => {
    step("personal_sign: expect NO [ledger-http] line");
    await personalSign(ctx, "no network request for this");

    step(
      "eth_sendTransaction (plain ETH transfer): expect [ledger-http] lines",
    );
    await sendEth(ctx, ctx.hardhatAddress, 1n);

    step("eth_signTypedData_v4: expect [ledger-http] lines");
    const typedData = mail(ctx);
    const signature = await signTypedData(ctx, JSON.stringify(typedData));
    assertSameAddress(
      recoverMail(ctx, typedData, signature),
      ctx.ledgerAddress,
    );
  });
}

async function plainTransfer(): Promise<void> {
  expected(
    "on every device except the Nano S the review shows the network name, " +
      "'Optimism', with its icon on Stax, Flex and Nano Gen5. On a " +
      "touchscreen device the first transaction may first ask whether to " +
      "enable Transaction Check, printed as '[hardhat-ledger] Answer the " +
      "Web3 Checks prompt on your Ledger device'; accepting changes nothing " +
      "here, because Ledger refuses the check without an origin token, so " +
      "no verdict is shown. Everything else looks as it does today.",
  );

  await withConnection(async (ctx) => {
    await sendEth(ctx, ctx.hardhatAddress, 10n ** 15n);
  });
}

async function erc20TransferIsClearSigned(): Promise<void> {
  expected(
    "the device showed 'Send 100 USDC' (or similar: token and amount) and " +
      "the recipient, not raw calldata. The token descriptor came from " +
      "Ledger's crypto-assets service, which needs no origin token.",
  );

  await withConnection(async (ctx) => {
    await fundWithUsdc(ctx, 1_000n * USDC_UNIT);

    const usdc = new ctx.ethers.Contract(
      USDC_ON_OPTIMISM,
      ERC20_ABI,
      ctx.ledgerSigner,
    );

    const balanceBefore: bigint = await usdc.balanceOf(ctx.hardhatAddress);

    const tx = await usdc.transfer(
      ctx.hardhatAddress,
      100n * USDC_UNIT,
      TX_OVERRIDES,
    );
    await tx.wait();

    const balanceAfter: bigint = await usdc.balanceOf(ctx.hardhatAddress);

    assert.equal(balanceAfter - balanceBefore, 100n * USDC_UNIT);
  });
}

async function erc20ApproveIsClearSigned(): Promise<void> {
  expected(
    "the device showed an approval of 50 USDC for the spender, not raw " +
      "calldata: the ERC-20 approve is clear-signed like the transfer.",
  );

  await withConnection(async (ctx) => {
    const usdc = new ctx.ethers.Contract(
      USDC_ON_OPTIMISM,
      ERC20_ABI,
      ctx.ledgerSigner,
    );

    const tx = await usdc.approve(
      ctx.hardhatAddress,
      50n * USDC_UNIT,
      TX_OVERRIDES,
    );
    await tx.wait();
  });
}

async function nftTransferIsClearSigned(): Promise<void> {
  expected(
    "the device showed the collection, 'BoredApeYachtClub', and the token " +
      "id instead of raw calldata. The NFT descriptor came from Ledger's " +
      "NFT metadata service, which needs no origin token. The hand-over " +
      "transaction before it came from an impersonated account and never " +
      "touched the Ledger.",
  );

  await withConnection(async (ctx) => {
    const tokenId = 1n;

    const bayc = new ctx.ethers.Contract(
      BAYC_ON_MAINNET,
      ERC721_ABI,
      ctx.ethers.provider,
    );
    const owner: string = await bayc.ownerOf(tokenId);

    step(`Handing BAYC #${tokenId} from ${owner} to the Ledger on the fork...`);

    await ctx.connection.networkHelpers.impersonateAccount(owner);
    await ctx.connection.networkHelpers.setBalance(owner, ONE_ETH);

    const baycAsOwner = new ctx.ethers.Contract(
      BAYC_ON_MAINNET,
      ERC721_ABI,
      await ctx.ethers.getSigner(owner),
    );
    const handOver = await baycAsOwner.transferFrom(
      owner,
      ctx.ledgerAddress,
      tokenId,
      TX_OVERRIDES,
    );
    await handOver.wait();

    step("Sending it on with the Ledger...");

    const baycAsLedger = new ctx.ethers.Contract(
      BAYC_ON_MAINNET,
      ERC721_ABI,
      ctx.ledgerSigner,
    );
    const tx = await baycAsLedger.safeTransferFrom(
      ctx.ledgerAddress,
      ctx.hardhatAddress,
      tokenId,
      TX_OVERRIDES,
    );
    await tx.wait();

    assertSameAddress(await bayc.ownerOf(tokenId), ctx.hardhatAddress);
  }, mainnetFork());
}

async function ensRecipientShowsItsName(): Promise<void> {
  expected(
    "on the Optimism fork the recipient is shown as the raw address " +
      "0xb8c2...67d5, because Ledger's name service does not serve chain 10. " +
      "On the mainnet fork it is shown as 'nick.eth'. ENS lookups need no " +
      "origin token.",
  );

  step("First on the Optimism fork (chain 10)...");

  await withConnection(async (ctx) => {
    await sendEth(ctx, NICK_ETH, 1000n);
  });

  step("Then on a mainnet fork (chain 1)...");

  await withConnection(async (ctx) => {
    await sendEth(ctx, NICK_ETH, 1000n);
  }, mainnetFork());
}

async function contractCallWithoutDescriptor(): Promise<void> {
  expected(
    "exactly what the current release shows: there is no descriptor for " +
      "this contract, so the device shows the raw call (a blind-signing or " +
      "unverified-contract warning). If Blind signing is disabled in the " +
      "Ethereum app's settings the device refuses and the error reaches the " +
      "script. Without an origin token Ledger answers the clear-signing " +
      "descriptor request for contract calls with 403, so this is what " +
      "every contract call looks like.",
  );

  await withConnection(async (ctx) => {
    const counter = await ctx.ethers.deployContract(
      "Counter",
      ctx.hardhatSigner,
    );

    const counterAsLedger = new ctx.ethers.Contract(
      await counter.getAddress(),
      ["function inc()", "function x() view returns (uint256)"],
      ctx.ledgerSigner,
    );

    const tx = await counterAsLedger.inc(TX_OVERRIDES);
    await tx.wait();

    assert.equal(await counterAsLedger.x(), 1n);
  });
}

// ---------------------------------------------------------------------------
// Typed data: standard tooling keeps working
// ---------------------------------------------------------------------------

async function typedDataWithEthersSigner(): Promise<void> {
  expected(
    "'[hardhat-ledger] Review and approve the typed data on your Ledger " +
      "device', the fields on the device, and a signature that recovers to " +
      "the Ledger address. Typed data built by ethers never trips the new " +
      "checks.",
  );

  await withConnection(async (ctx) => {
    const { domain, message } = mail(ctx);

    const signature = await ctx.ledgerSigner.signTypedData(
      domain,
      MAIL_TYPES,
      message,
    );

    assertSameAddress(
      recoverMail(ctx, { domain, types: MAIL_TYPES, message }, signature),
      ctx.ledgerAddress,
    );
  });
}

async function typedDataWithViem(): Promise<void> {
  expected("the same as with ethers: viem's typed data signs and verifies.");

  await withConnection(async (ctx) => {
    const walletClients = await ctx.connection.viem.getWalletClients();
    // Ledger accounts come last
    const ledgerClient = walletClients[walletClients.length - 1];

    assertSameAddress(ledgerClient.account.address, ctx.ledgerAddress);

    const typedData = {
      domain: {
        name: "MyDApp",
        version: "1",
        chainId: ctx.chainId,
        verifyingContract: ZERO_ADDRESS,
      },
      types: {
        Mail: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "contents", type: "string" },
          { name: "amount", type: "uint256" },
        ],
      },
      primaryType: "Mail",
      message: {
        from: asHex(ctx.ledgerAddress),
        to: asHex(ctx.hardhatAddress),
        contents: "Hello from viem",
        amount: 1n,
      },
    } as const;

    const signature = await ledgerClient.signTypedData(typedData);

    const recovered = await recoverTypedDataAddress({
      ...typedData,
      signature,
    });

    assertSameAddress(recovered, ctx.ledgerAddress);
  });
}

async function typedDataAsObject(): Promise<void> {
  expected("a valid signature: the data parameter may be an object.");

  await withConnection(async (ctx) => {
    const typedData = mail(ctx);

    // The object itself, not a JSON string
    const signature = await signTypedData(ctx, typedData);

    assertSameAddress(
      recoverMail(ctx, typedData, signature),
      ctx.ledgerAddress,
    );
  });
}

async function typedDataChainIdAsString(): Promise<void> {
  expected(
    "two valid signatures: a hexadecimal or decimal string chain id is " +
      "converted to the number the device expects. A blank string is " +
      "refused instead of becoming chain 0 (see " +
      "typedDataRefusedBeforeDevice).",
  );

  await withConnection(async (ctx) => {
    for (const chainId of [
      `0x${ctx.chainId.toString(16)}`,
      String(ctx.chainId),
    ]) {
      step(`domain.chainId = ${JSON.stringify(chainId)}`);

      const typedData = mail(ctx, { domain: { chainId } });

      const signature = await signTypedData(ctx, JSON.stringify(typedData));

      // Recovered against the numeric chain id, which is what a contract uses.
      assertSameAddress(
        recoverMail(
          ctx,
          {
            ...typedData,
            domain: { ...typedData.domain, chainId: ctx.chainId },
          },
          signature,
        ),
        ctx.ledgerAddress,
      );
    }
  });
}

async function typedDataCustomDomain(): Promise<void> {
  expected(
    "two signatures: a domain field the plugin does not know about is kept, " +
      "not dropped, and a reordered declaration is hashed as declared. Both " +
      "are legitimate typed data that the previous whitelist rejected.",
  );

  await withConnection(async (ctx) => {
    step("An extra `salt` field in EIP712Domain");

    const withSalt = mail(ctx, {
      types: {
        EIP712Domain: [
          ...EIP712_DOMAIN_TYPE,
          { name: "salt", type: "bytes32" },
        ],
      },
      domain: { salt: `0x${"ab".repeat(32)}` },
    });

    const saltSignature = await signTypedData(ctx, JSON.stringify(withSalt));

    assertSameAddress(
      recoverMail(ctx, withSalt, saltSignature),
      ctx.ledgerAddress,
    );

    step("EIP712Domain fields declared in a non-standard order");

    const reordered = mail(ctx, {
      types: {
        EIP712Domain: [
          { name: "version", type: "string" },
          { name: "name", type: "string" },
          { name: "verifyingContract", type: "address" },
          { name: "chainId", type: "uint256" },
        ],
      },
    });

    // ethers hashes the domain in the standard order, so the plugin's own
    // check (which follows the declaration, as the device does) is the oracle
    // here: a returned signature means the device signed what was declared.
    await signTypedData(ctx, JSON.stringify(reordered));
  });
}

async function typedDataBigIntegerAsString(): Promise<void> {
  expected(
    "a valid signature over a uint256 above 2^53: passed as a string, the " +
      "value survives JSON parsing. The same number as a JSON number is " +
      "refused (see typedDataRefusedBeforeDevice).",
  );

  await withConnection(async (ctx) => {
    const typedData = mail(ctx, {
      message: { amount: "123456789012345678901234567890" },
    });

    const signature = await signTypedData(ctx, JSON.stringify(typedData));

    assertSameAddress(
      recoverMail(ctx, typedData, signature),
      ctx.ledgerAddress,
    );
  });
}

// ---------------------------------------------------------------------------
// Typed data: refused before the device is asked
// ---------------------------------------------------------------------------

async function typedDataRefusedBeforeDevice(): Promise<void> {
  expected(
    "every case refused with ETH_SIGN_TYPED_DATA_V4_INVALID_DATA_PARAM " +
      "without a 'Review and approve the typed data' line: the device was " +
      "connected but never asked to sign. The first five do not survive " +
      "parsing. The last four are data the plugin's own hasher cannot " +
      "hash: the device used to be asked for an approval that was then " +
      "discarded, now it is not asked at all.",
  );

  await withConnection(async (ctx) => {
    const cases: Array<[string, string | object]> = [
      [
        "an integer above 2^53 as a JSON number (JSON.parse has already rounded it)",
        withRawJsonValue(
          mail(ctx, { message: { amount: "RAW" } }),
          "RAW",
          "9007199254740993",
        ),
      ],
      [
        "a number with a fraction",
        withRawJsonValue(
          mail(ctx, { message: { amount: "RAW" } }),
          "RAW",
          "1.5",
        ),
      ],
      [
        "a string with a lone surrogate, which is not valid text",
        mail(ctx, { message: { contents: "broken \ud800 text" } }),
      ],
      [
        "a blank chain id, which would otherwise sign for chain 0",
        mail(ctx, { domain: { chainId: "" } }),
      ],
      ["something that is not typed data at all", { not: "typed data" }],
      [
        "two fields with the same name, of which the DMK would keep only one",
        mail(ctx, {
          types: {
            Mail: [...MAIL_TYPES.Mail, { name: "contents", type: "string" }],
          },
        }),
      ],
      [
        "a bool given as the string 'false', which the DMK's fallback path would turn into true",
        mail(ctx, {
          types: {
            Mail: [...MAIL_TYPES.Mail, { name: "flag", type: "bool" }],
          },
          message: { flag: "false" },
        }),
      ],
      [
        "a bytes32 of 31 bytes, which the device would pad",
        mail(ctx, {
          types: {
            Mail: [...MAIL_TYPES.Mail, { name: "hash", type: "bytes32" }],
          },
          message: { hash: `0x${"cd".repeat(31)}` },
        }),
      ],
      [
        "a field whose struct type is not declared",
        mail(ctx, {
          types: {
            Mail: [...MAIL_TYPES.Mail, { name: "person", type: "Person" }],
          },
          message: { person: { name: "nobody" } },
        }),
      ],
    ];

    for (const [label, data] of cases) {
      step(label);

      await expectLedgerError(
        signTypedData(ctx, data),
        "ETH_SIGN_TYPED_DATA_V4_INVALID_DATA_PARAM",
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Typed data: refused after you approve on the device
// ---------------------------------------------------------------------------

async function typedDataDigitsFieldName(): Promise<void> {
  await refusedAfterApproval(
    "A field named `123`",
    (ctx) =>
      mail(ctx, {
        types: {
          Mail: [
            { name: "from", type: "address" },
            { name: "123", type: "string" },
            { name: "to", type: "address" },
          ],
        },
        message: {
          "123": "moved to the front by the DMK",
          amount: undefined,
          contents: undefined,
        },
      }),
    "JavaScript orders digit-only keys first, so the DMK encodes the fields " +
      "in a different order than declared, the device signs that, and the " +
      "recovered address is not yours.",
  );
}

async function typedDataProtoFieldName(): Promise<void> {
  await refusedAfterApproval(
    "A field named `__proto__`",
    (ctx) =>
      JSON.stringify(
        mail(ctx, {
          types: {
            Mail: [...MAIL_TYPES.Mail, { name: "PROTO", type: "string" }],
          },
          message: { PROTO: "not an own property once parsed by the DMK" },
        }),
      ).replaceAll('"PROTO"', '"__proto__"'),
    "the DMK loses the value on the way to the device (a `__proto__` key sets " +
      "a prototype instead of a property), so the device signs something else.",
  );
}

async function typedDataNonAsciiFieldName(): Promise<void> {
  expected(
    "the device rejects the field name, the DMK falls back to hashing the " +
      "data with ethers and asks the device to sign the hash. With Blind " +
      "signing enabled the device signs it, the hash is right, and the " +
      "signature verifies. Without it the device refuses and the failure " +
      "above is the device's. Once the Ethereum app drops the hashed " +
      "command (announced for September 2026) it fails in both cases.",
  );

  step(
    "A field named `montant€`. Whether it signs depends on the Blind signing setting of the Ethereum app.",
  );

  await withConnection(async (ctx) => {
    const typedData = mail(ctx, {
      types: {
        Mail: [...MAIL_TYPES.Mail, { name: "montant€", type: "string" }],
      },
      message: { "montant€": "non-ASCII field name" },
    });

    const outcome = await settle(
      signTypedData(ctx, JSON.stringify(typedData)).then((signature) => {
        assertSameAddress(
          recoverMail(ctx, typedData, signature),
          ctx.ledgerAddress,
        );
      }),
    );

    if (outcome === undefined) {
      console.log("    Signed, and the signature verifies.");
    } else {
      await printAsHardhatWould(outcome);
    }
  });
}

// ---------------------------------------------------------------------------
// Other
// ---------------------------------------------------------------------------

async function eip7702DelegationIsSigned(): Promise<void> {
  expected(
    "the device asks to approve a transaction that carries an authorization " +
      "list (an Ethereum app too old for EIP-7702 refuses it instead). After " +
      "approval the transaction is mined and the authority's code is " +
      "0xef0100 followed by the Counter's address.",
  );

  await withConnection(async (ctx) => {
    const counter = await ctx.ethers.deployContract(
      "Counter",
      ctx.hardhatSigner,
    );
    const counterAddress = await counter.getAddress();

    // A fresh, unfunded account is the authority: the Ledger account sends the
    // type-4 transaction and pays for it. Only the outer transaction is signed
    // on the device; the plugin has no method to sign the authorization itself.
    const authority = ctx.ethers.Wallet.createRandom();
    const authorization = await authority.authorize({
      address: counterAddress,
      nonce: 0,
      chainId: ctx.chainId,
    });

    const tx = await ctx.ledgerSigner.sendTransaction({
      type: 4,
      to: ctx.hardhatAddress,
      authorizationList: [authorization],
      ...TX_OVERRIDES,
    });
    await tx.wait();

    const code = await ctx.provider.request({
      method: "eth_getCode",
      params: [authority.address, "latest"],
    });

    assert.equal(code, `0xef0100${counterAddress.slice(2).toLowerCase()}`);
  });
}

async function unownedAddressIsPassedThrough(): Promise<void> {
  expected(
    "no '[hardhat-ledger] Connecting to Ledger...' line at all: the address " +
      "is not a Ledger account, so the plugin passed the request through " +
      "and the simulated network signed it with its own key.",
  );

  await withConnection(async (ctx) => {
    const message = "signed by the simulated network, not the Ledger";

    const signature = await ctx.provider.request({
      method: "personal_sign",
      params: [
        ctx.ethers.hexlify(ctx.ethers.toUtf8Bytes(message)),
        ctx.hardhatAddress,
      ],
    });

    assert.equal(typeof signature, "string");
    assertSameAddress(
      ctx.ethers.verifyMessage(message, signature as string),
      ctx.hardhatAddress,
    );
  });
}

async function derivationFunctionOverride(): Promise<void> {
  expected(
    "21 'Derivation progress. Path: m/44'/60'/0'/N' lines with no prompt " +
      "on the device (the DMK accepted every `m/`-prefixed path your " +
      "function returned), then CANNOT_FIND_VALID_DERIVATION_PATH quoting " +
      "the searched paths with their `m/` prefix.",
  );

  const unknownAddress = "0x1111111111111111111111111111111111111111";

  await withConnection(
    async (ctx) => {
      assertSameAddress(ctx.ledgerAddress, unknownAddress);

      const error = await expectLedgerError(
        personalSign(ctx, "legacy derivation path"),
        "CANNOT_FIND_VALID_DERIVATION_PATH",
      );

      assert.match(error.message, /m\/44'\/60'\/0'\/0 to m\/44'\/60'\/0'\/20/u);
    },
    {
      network: "edrOp",
      override: {
        ledgerAccounts: [unknownAddress],
        ledgerOptions: {
          // The "legacy" layout, as in the README
          derivationFunction: (index: number) => `m/44'/60'/0'/${index}`,
        },
      },
    },
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Ctx = Awaited<ReturnType<typeof connect>>;

async function connect(params: NetworkConnectionParams = { network: "edrOp" }) {
  const connection = await hre.network.create(params);
  const { provider, ethers } = connection;

  const chainIdHex = await provider.request({ method: "eth_chainId" });
  assert.equal(typeof chainIdHex, "string");
  const chainId = Number(BigInt(chainIdHex as string));

  const signers = await ethers.getSigners();

  const hardhatSigner = signers[0];
  // Ledger accounts are returned at the end
  const ledgerSigner = signers[signers.length - 1];

  assert.notEqual(
    ledgerSigner.address.toLowerCase(),
    hardhatSigner.address.toLowerCase(),
    "This connection has no Ledger account",
  );

  // Be sure that the ledger account has some ETH. This goes through the plugin
  // too, but the sender is not a Ledger account, so it is passed through.
  await hardhatSigner.sendTransaction({
    to: ledgerSigner.address,
    value: ONE_ETH,
  });

  return {
    connection,
    provider,
    ethers,
    chainId,
    hardhatSigner,
    hardhatAddress: hardhatSigner.address,
    ledgerSigner,
    ledgerAddress: ledgerSigner.address,
  };
}

/** Runs a scenario on its own connection, closing it whatever happens. */
async function withConnection(
  scenario: (ctx: Ctx) => Promise<void>,
  params?: NetworkConnectionParams,
): Promise<void> {
  const ctx = await connect(params);

  try {
    await scenario(ctx);
  } finally {
    await ctx.connection.close();
  }
}

/** A mainnet fork with the same Ledger account, for the chain-1-only services. */
function mainnetFork(): NetworkConnectionParams {
  return {
    network: "default",
    override: {
      chainId: 1,
      forking: { url: MAINNET_RPC_URL },
      ledgerAccounts: [LEDGER_ADDRESS],
    },
  };
}

async function personalSign(ctx: Ctx, message: string): Promise<string> {
  const signature = await ctx.provider.request({
    method: "personal_sign",
    params: [
      ctx.ethers.hexlify(ctx.ethers.toUtf8Bytes(message)),
      ctx.ledgerAddress,
    ],
  });

  assert.equal(typeof signature, "string");
  assertSameAddress(
    ctx.ethers.verifyMessage(message, signature as string),
    ctx.ledgerAddress,
  );

  return signature as string;
}

async function sendEth(ctx: Ctx, to: string, value: bigint): Promise<void> {
  const tx = await ctx.ledgerSigner.sendTransaction({
    to,
    value,
    ...TX_OVERRIDES,
  });

  await tx.wait();
}

async function signTypedData(ctx: Ctx, data: string | object): Promise<string> {
  const signature = await ctx.provider.request({
    method: "eth_signTypedData_v4",
    params: [ctx.ledgerAddress, data],
  });

  assert.equal(typeof signature, "string");

  return signature as string;
}

interface TypedDataJson {
  domain: TypedDataDomain;
  types: Record<string, TypedDataField[]>;
  primaryType: string;
  message: Record<string, unknown>;
}

/** The `Mail` typed data of `ledger.ts`, with optional changes merged in. */
function mail(
  ctx: Ctx,
  changes: {
    domain?: Record<string, unknown>;
    types?: Record<string, TypedDataField[]>;
    message?: Record<string, unknown>;
  } = {},
): TypedDataJson {
  const domain: TypedDataDomain = {
    name: "MyDApp",
    version: "1",
    chainId: ctx.chainId,
    verifyingContract: ZERO_ADDRESS,
  };

  Object.assign(domain, changes.domain);

  const message: Record<string, unknown> = {
    from: ctx.ledgerAddress,
    to: ctx.hardhatAddress,
    contents: "Hello typed data",
    amount: "1",
    ...changes.message,
  };

  // `undefined` in `changes.message` removes a field
  for (const [key, value] of Object.entries(message)) {
    if (value === undefined) {
      delete message[key];
    }
  }

  return {
    domain,
    types: {
      EIP712Domain: EIP712_DOMAIN_TYPE,
      ...MAIL_TYPES,
      ...changes.types,
    },
    primaryType: "Mail",
    message,
  };
}

/**
 * Serializes typed data with one string value replaced by a raw JSON token, to
 * send a number JavaScript cannot represent (JSON.parse rounds it on the way
 * in, which is the point).
 */
function withRawJsonValue(
  typedData: TypedDataJson,
  placeholder: string,
  rawJson: string,
): string {
  return JSON.stringify(typedData).replace(
    JSON.stringify(placeholder),
    rawJson,
  );
}

/** Recovers the signer from the caller's own data, as the plugin does. */
function recoverMail(
  ctx: Ctx,
  typedData: Pick<TypedDataJson, "domain" | "types" | "message">,
  signature: string,
): string {
  const { EIP712Domain: _domainType, ...types } = typedData.types;

  return ctx.ethers.recoverAddress(
    ctx.ethers.TypedDataEncoder.hash(
      typedData.domain,
      types,
      typedData.message,
    ),
    signature,
  );
}

/**
 * Signs typed data the DMK is known to mis-encode and checks that the plugin
 * refuses the signature after the device produced it.
 */
async function refusedAfterApproval(
  label: string,
  build: (ctx: Ctx) => string | object,
  why: string,
): Promise<void> {
  expected(
    "'[hardhat-ledger] Review and approve the typed data on your Ledger " +
      "device', your approval, '[hardhat-ledger] Confirmation success', " +
      "and only then ETH_SIGN_TYPED_DATA_V4_SIGNATURE_MISMATCH ('The " +
      "Ledger device signed different typed data than requested'): the " +
      "signature was checked against the data you sent and did not " +
      "recover to your address. Why: " +
      why,
  );

  step(`${label}. Approve it on the device when asked.`);

  await withConnection(async (ctx) => {
    await expectLedgerError(
      signTypedData(ctx, build(ctx)),
      "ETH_SIGN_TYPED_DATA_V4_SIGNATURE_MISMATCH",
    );
  });
}

async function fundWithUsdc(ctx: Ctx, amount: bigint): Promise<void> {
  const slot = ctx.ethers.keccak256(
    ctx.ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256"],
      [ctx.ledgerAddress, USDC_BALANCE_SLOT],
    ),
  );

  await ctx.connection.networkHelpers.setStorageAt(
    USDC_ON_OPTIMISM,
    BigInt(slot),
    amount,
  );

  const usdc = new ctx.ethers.Contract(
    USDC_ON_OPTIMISM,
    ERC20_ABI,
    ctx.ethers.provider,
  );

  assert.equal(
    await usdc.balanceOf(ctx.ledgerAddress),
    amount,
    "USDC's balance slot moved; update USDC_BALANCE_SLOT",
  );
}

type LedgerErrorName = keyof typeof HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL;

function isLedgerError(
  error: unknown,
  name: LedgerErrorName,
): error is HardhatError {
  return HardhatError.isHardhatError(
    error,
    HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL[name],
  );
}

/** Resolves with the rejection, or `undefined` if the promise fulfilled. */
async function settle(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => undefined,
    (error: unknown) => error ?? new Error("rejected with undefined"),
  );
}

async function expectLedgerError(
  promise: Promise<unknown>,
  name: LedgerErrorName,
): Promise<HardhatError> {
  const outcome = await settle(promise);

  assert.ok(
    outcome !== undefined,
    `Expected the request to fail with ${name}, but it succeeded`,
  );

  await printAsHardhatWould(outcome);

  assert.ok(
    isLedgerError(outcome, name),
    `Expected ${name}, got: ${describeError(outcome)}`,
  );

  console.log(`    OK: refused with ${name}`);

  return outcome;
}

/** Prints an error exactly as `npx hardhat run` prints an uncaught one. */
async function printAsHardhatWould(error: unknown): Promise<void> {
  await printErrorMessages(
    error instanceof Error ? error : new Error(String(error)),
  );
}

function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const tag = "tag" in error ? ` [tag: ${String(error.tag)}]` : "";
  const cause =
    error.cause instanceof Error ? ` (cause: ${error.cause.message})` : "";

  return `${error.constructor.name}: ${error.message.split("\n")[0]}${tag}${cause}`;
}

function assertSameAddress(actual: string, expectedAddress: string): void {
  assert.equal(actual.toLowerCase(), expectedAddress.toLowerCase());
}

function asHex(address: string): `0x${string}` {
  assert.ok(address.startsWith("0x"));

  return address as `0x${string}`;
}

function step(text: string): void {
  console.log(`\n>>> ${text}`);
}

/** Records the expected result, which `run()` prints once the scenario is over. */
function expected(text: string): void {
  expectedResult = text;
}

/** Runs a scenario, then prints its expected result and, if it failed, why. */
async function run(scenario: () => Promise<void>): Promise<void> {
  expectedResult = undefined;

  const failure = await settle(scenario());

  console.log("\nEXPECTED RESULT:");
  console.log(expectedResult ?? "(this scenario declares none)");

  if (failure !== undefined) {
    process.exitCode = 1;

    console.log("\nBUT GOT WRONG RESULT:");
    console.log(failure);
  }
}

async function countdown(seconds: number): Promise<void> {
  for (let left = seconds; left > 0; left -= 5) {
    console.log(`    ${left}s...`);
    await sleep(Math.min(5, left) * 1000);
  }
}

function cacheFileHint(): string {
  switch (process.platform) {
    case "darwin":
      return "~/Library/Preferences/hardhat-nodejs/ledger/accounts.json";
    case "win32":
      return "%APPDATA%\\hardhat-nodejs\\Config\\ledger\\accounts.json";
    default:
      return "~/.config/hardhat-nodejs/ledger/accounts.json";
  }
}

/**
 * Prints every request to Ledger's servers. The DMK uses Node's global `fetch`,
 * which reports through this diagnostics channel, so nothing is patched.
 */
function logRequestsToLedgerServers(): void {
  if (loggingRequests) {
    return;
  }

  loggingRequests = true;

  diagnosticsChannel.subscribe("undici:request:create", (event) => {
    const { request } = event as {
      request: {
        method: string;
        origin: string;
        path: string;
        headers: unknown;
      };
    };

    if (!request.origin.includes("ledger.com")) {
      return;
    }

    // Raw headers: either a flat [name, value, ...] array or one string
    const headers = Array.isArray(request.headers)
      ? request.headers.map(String)
      : String(request.headers).split(/\r?\n/u);

    const hasOriginToken = headers.some((header) =>
      header.toLowerCase().startsWith("x-ledger-client-origin"),
    );

    console.log(
      `    [ledger-http] ${request.method} ${request.origin}${request.path} ` +
        `(${hasOriginToken ? "origin token sent" : "no origin token"})`,
    );
  });
}

/**
 * Complains if the process is still alive a few seconds after the scenarios
 * ended. `unref` keeps the timer itself from holding the process open.
 */
function armExitWatchdog(seconds: number = 5): void {
  setTimeout(() => {
    console.error(
      expectedToHang
        ? `\nStill alive ${seconds}s after the script ended, as this scenario expects. Press Ctrl+C.`
        : `\n!!! Still alive ${seconds}s after the script ended: something is holding the process open.`,
    );
  }, seconds * 1000).unref();
}
