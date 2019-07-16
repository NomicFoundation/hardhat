import AbortController from "abort-controller";
import ci from "ci-info";
import debug from "debug";
import { keccak256 } from "ethereumjs-util";
import fs from "fs-extra";
import fetch from "node-fetch";
import os from "os";
import path from "path";
import qs from "qs";
import uuid from "uuid/v4";

import { ExecutionMode, getExecutionMode } from "../core/execution-mode";

const log = debug("buidler:analytics");

// VERY IMPORTANT:
// The documentation doesn't say so, but the user-agent parameter is required (ua).
// If you don't send it, you won't get an error or anything, Google will *silently* drop your hit.
//
// https://stackoverflow.com/questions/27357954/google-analytics-measurement-protocol-not-working
interface RawAnalytics {
  v: "1";
  tid: string;
  cid: string;
  dp: string;
  dh: string;
  t: string;
  ua: string;
  cd1: string;
  cd2: string;
}

type AbortAnalytics = () => void;

const googleAnalyticsUrl = "https://www.google-analytics.com/collect";

export class Analytics {
  public static async getInstance(rootPath: string, enabled: boolean) {
    const analytics: Analytics = new Analytics({
      projectId: getProjectId(rootPath),
      clientId: await getClientId(),
      enabled,
      userType: getUserType()
    });

    return analytics;
  }

  private readonly _projectId: string;
  private readonly _clientId: string;
  private readonly _enabled: boolean;
  private readonly _userType: string;
  // Buidler's tracking id. I guess there's no other choice than keeping it here.
  private readonly _trackingId: string = "UA-117668706-3";

  private constructor({
    projectId,
    clientId,
    enabled,
    userType
  }: {
    projectId: string;
    clientId: string;
    enabled: boolean;
    userType: string;
  }) {
    this._projectId = projectId;
    this._clientId = clientId;
    // TODO: Remove the comment before merging.
    this._enabled = enabled; // && !this.isLocalDev();
    this._userType = userType;
  }

  /**
   * Attempt to send a hit to Google Analytics using the Measurement Protocol.
   * This function returns immediately after starting the request, returning a function for aborting it.
   * The idea is that we don't want Buidler tasks to be slowed down by a slow network request, so
   * Buidler can abort the request if it takes too much time.
   *
   * Trying to abort a successfully completed request is a no-op, so it's always safe to call it.
   *
   * @param taskName The name of the task to be logged
   *
   * @returns The abort function
   */
  public sendTaskHit(taskName: string): AbortAnalytics {
    if (!this._enabled) {
      return () => {};
    }

    return this._sendHit(this._taskHit(taskName));
  }

  private _taskHit(taskName: string): RawAnalytics {
    return {
      // Measurement protocol version.
      v: "1",

      // Hit type, we're only using pageviews for now.
      t: "pageview",

      // Buidler's tracking Id.
      tid: this._trackingId,

      // Client Id.
      cid: this._clientId,

      // Document path, must start with a '/'.
      dp: `/task/${taskName}`,

      // Host name.
      dh: "buidler.dev",

      // User agent, must be present.
      // We use it to inform Node version used and OS.
      // Example:
      //   Node/v8.12.0 (Darwin 17.7.0)
      ua: `Node/${process.version} (${os.type()} ${os.release()})`,

      // We're using custom dimensions for tracking different user projects, and user types (Developer/CI).
      //
      // See the following link for docs on these paremeters:
      // https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#pr_cd_
      //
      // See the following link for setting up our custom dimensions in the Google Analytics dashboard
      // https://support.google.com/tagmanager/answer/6164990
      //
      // Custom dimension 1: Project Id
      cd1: this._projectId,
      // Custom dimension 2: User type
      cd2: this._userType
    };
  }

  private _sendHit(hit: RawAnalytics): AbortAnalytics {
    log(`Sending hit for ${hit.dp}`);

    const controller = new AbortController();

    let abort = () => {
      log(`Aborting hit for ${JSON.stringify(hit.dp)}`);

      controller.abort();
    };

    const actualAbort = () => abort();

    const hitPayload = qs.stringify(hit);

    log(`Hit payload: ${JSON.stringify(hit)}`);

    fetch(googleAnalyticsUrl, {
      body: hitPayload,
      method: "POST",
      signal: controller.signal
    })
      .then(() => {
        log(`Hit for ${JSON.stringify(hit.dp)} sent successfully`);

        abort = () => {
          log("Hit abort no-op");
        };
      })
      // We're not really interested in handling failed analytics requests
      .catch(() => {});

    return actualAbort;
  }

  /**
   * Checks whether we're using Buidler in development mode (that is, we're working _on_ Buidler).
   * We don't want the tasks we run at these moments to be tracked, so we disable analytics if so.
   */
  private _isLocalDev(): boolean {
    const executionMode = getExecutionMode();

    return (
      executionMode === ExecutionMode.EXECUTION_MODE_LINKED ||
      executionMode === ExecutionMode.EXECUTION_MODE_TS_NODE_TESTS
    );
  }
}

// TODO: Check Windows support for this approach
const globalBuidlerConfigFile = path.join(
  os.homedir(),
  ".buidler",
  "config.json"
);

async function getClientId() {
  await fs.ensureFile(globalBuidlerConfigFile);

  let clientId;

  log(`Looking up Client Id at ${globalBuidlerConfigFile}`);
  try {
    const data = JSON.parse(await fs.readFile(globalBuidlerConfigFile, "utf8"));

    clientId = data.analytics.clientId;

    log(`Client Id found: ${clientId}`);
  } catch (e) {
    log("Client Id not found, generating a new one");
    clientId = uuid();

    await fs.writeFile(
      globalBuidlerConfigFile,
      JSON.stringify({
        analytics: {
          clientId
        }
      }),
      "utf-8"
    );

    log(`Successfully generated clientId ${clientId}`);
  }

  return clientId;
}

function getProjectId(rootPath: string) {
  log(`Computing Project Id for ${rootPath}`);

  const projectId = keccak256(rootPath).toString("hex");

  log(`Project Id set to ${projectId}`);
  return projectId;
}

function getUserType(): string {
  return ci.isCI ? "CI" : "Developer";
}
