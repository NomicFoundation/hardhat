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
      engagement_time_msec?: string; // TODO: can be removed?
      session_id?: string;
    };
  }>;
}

export interface TelemetryConsentPayload extends BasePayload {
  events: Array<{
    name: "TelemetryConsentResponse";
    params: {
      session_id?: string;
      userConsent: "yes" | "no";
    };
  }>;
}

export type EventNames = "task";

export interface TaskParams {
  task: string;
  scope?: string;
}

export interface Payload extends BasePayload {
  user_properties: {
    projectId: {
      value: string;
    };
    userType: {
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
    name: EventNames;
    params: {
      engagement_time_msec: string;
      session_id: string;
    } & TaskParams;
  }>;
}
