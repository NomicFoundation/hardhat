import type {
  Envelope,
  Transport,
  TransportMakeRequestResponse,
} from "@sentry/core";

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { createTransport, serializeEnvelope } from "@sentry/core";
import debug from "debug";

const log = debug("hardhat:core:sentry:transport");

/**
 * Creates a detached process transport.
 *
 * This transport spawns a detached process synchronously and sends the envelope
 * from there.
 *
 * This means that the Hardhat process doesn't have to wait for the request
 * to finish before exiting, flushing the transport, not closing the client.
 *
 * This is meant to be use as THE main transport in Hardhat.
 *
 * @param dsn The DSN to use to send the envelope to Sentry.
 * @param release The release/version of Hardhat.
 * @param environment The environment of Hardhat.
 * @param configPath The path to the config file.
 */
export function createDetachedProcessTransport(
  dsn: string,
  release: string,
  environment: string,
  configPath?: string,
): Transport {
  return {
    send: (envelope) => {
      const verbose = log.enabled;

      // **Synchronously** spawn a detached subprocess here

      const out = verbose ? process.stdout : "ignore";
      const err = verbose ? process.stdout : "ignore";

      const subprocessPath = import.meta.url.endsWith(".ts")
        ? fileURLToPath(import.meta.resolve("./subprocess.ts"))
        : fileURLToPath(import.meta.resolve("./subprocess.js"));

      const serializedEnvelope = JSON.stringify(envelope);

      let args = [
        subprocessPath,
        serializedEnvelope,
        configPath ?? "",
        dsn,
        release,
        environment,
      ];

      if (isTsxRequiredForSubprocess(subprocessPath)) {
        args = ["--import", "tsx/esm", ...args];
      }

      log(`Spawning reporter subprocess`);

      const env = { ...process.env };

      const subprocess = spawn(process.execPath, args, {
        detached: true,
        stdio: ["ignore", out, err],
        shell: false,
        env,
      });

      subprocess.unref();

      return Promise.resolve({ statusCode: 200 });
    },
    flush: (_timeout) => {
      return Promise.resolve(true);
    },
  };
}

/**
 * This is a `fetch`-backed transport that sends the envelope to Sentry's
 * backend.
 *
 * This is meant to be the fallback transport that is used in the detached
 * process that backs the other transport.
 *
 * If you use this transport, you should call `close` on the client before
 * exiting the process.
 */
export function createHttpTransport(dsn: string): Transport {
  return createTransport(
    {
      recordDroppedEvent(reason, category, count) {
        log(
          `Dropped event: ${reason} (category: ${category} - count: ${count})`,
        );
      },
    },
    async (request) => {
      try {
        log(`Sending envelope to Sentry backend using the HttpTransport`);

        const response = await sendSerializedEnvelopeToSentryBackend(
          dsn,
          request.body,
        );

        log(
          `Successfully sent envelope to Sentry backend using the HttpTransport`,
        );

        return response;
      } catch (e) {
        log(
          `Failed to send envelope to Sentry backend using the HttpTransport`,
          e,
        );

        throw e;
      }
    },
  );
}

/**
 * Sends an envelope to Sentry's backend.
 *
 * This function is used both in the subprocess (to send envelopes received
 * from the main process) and as the core implementation for the
 * `createHttpTransport` transport.
 */
export async function sendEnvelopeToSentryBackend(
  dsn: string,
  envelope: Envelope,
): Promise<TransportMakeRequestResponse> {
  return sendSerializedEnvelopeToSentryBackend(
    dsn,
    serializeEnvelope(envelope),
  );
}

function isTsxRequiredForSubprocess(subprocessPath: string): boolean {
  const tsNativeRuntimes = ["Deno", "Bun"];

  if (tsNativeRuntimes.some((env) => env in globalThis)) {
    return false;
  }

  return subprocessPath.endsWith(".ts");
}

async function sendSerializedEnvelopeToSentryBackend(
  dsn: string,
  serializedEnvelope: string | Uint8Array,
): Promise<TransportMakeRequestResponse> {
  const {
    hostname,
    username: publicKey,
    password: secret,
    pathname,
  } = new URL(dsn);
  const projectId = pathname.replace(/^\//, "");
  const ingestUrl = `https://${hostname}/api/${projectId}/envelope/`;

  const authHeader = [
    "Sentry sentry_version=7",
    `sentry_client=hardhat/3.0.0`,
    `sentry_key=${publicKey}`,
    secret !== "" && `sentry_secret=${secret}`,
  ]
    .filter(Boolean)
    .join(", ");

  const res = await fetch(ingestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-sentry-envelope",
      "X-Sentry-Auth": authHeader,
    },
    body: serializedEnvelope,
  });

  if (!res.ok) {
    const text = await res.text();

    /* eslint-disable-next-line no-restricted-syntax -- Only run in the
    subprocess, so we don't care about the error type */
    throw new Error(`Failed to send envelope: ${res.status} - ${text}`);
  }

  return {
    statusCode: res.status,
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
      We return the headers as any, because we just want to return whatever
      we received from the server. */
    headers: res.headers as any,
  };
}
