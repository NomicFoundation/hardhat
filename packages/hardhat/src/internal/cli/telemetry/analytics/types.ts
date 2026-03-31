export interface AnalyticsFile {
  analytics: {
    clientId: string;
  };
}

/* eslint-disable @typescript-eslint/naming-convention -- these payload is formatted based on what google analytics expects*/
export interface BasePayload {
  client_id: string;
  user_id: string;
  user_properties: {};
  events: Array<{
    name: string;
    params: {
      // From the GA docs: amount of time someone spends with your web
      // page in focus or app screen in the foreground.
      // The parameter has no use for our app, but it's required in order
      // for user activity to display in standard reports like Realtime.
      engagement_time_msec?: string;
      session_id?: string;
    };
  }>;
}

export interface TelemetryConfigPayload extends BasePayload {
  events: Array<{
    name: "TelemetryConfig";
    params: {
      enabled: boolean;
      session_id?: string;
    };
  }>;
}

export type AnalyticsEvent =
  | {
      name: "task";
      params: {
        task: string;
      };
    }
  | {
      name: "init";
      params: {
        hardhatVersion: "hardhat-2" | "hardhat-3";
        template: string;
      };
    };

export interface Payload extends BasePayload {
  user_properties: {
    projectId: {
      value: string;
    };
    hardhatVersion: {
      value: string;
    };
    operatingSystem: {
      value: string;
    };
    nodeVersion: {
      value: string;
    };
  };
  events: Array<{
    name: AnalyticsEvent["name"];
    params: {
      engagement_time_msec: string;
      session_id: string;
    } & AnalyticsEvent["params"];
  }>;
}
