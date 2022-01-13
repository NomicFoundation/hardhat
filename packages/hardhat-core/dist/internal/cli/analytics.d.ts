declare type AbortAnalytics = () => void;
export declare class Analytics {
    static getInstance(telemetryConsent: boolean | undefined): Promise<Analytics>;
    private readonly _clientId;
    private readonly _enabled;
    private readonly _userType;
    private readonly _trackingId;
    private constructor();
    /**
     * Attempt to send a hit to Google Analytics using the Measurement Protocol.
     * This function returns immediately after starting the request, returning a function for aborting it.
     * The idea is that we don't want Hardhat tasks to be slowed down by a slow network request, so
     * Hardhat can abort the request if it takes too much time.
     *
     * Trying to abort a successfully completed request is a no-op, so it's always safe to call it.
     *
     * @param taskName The name of the task to be logged
     *
     * @returns The abort function
     */
    sendTaskHit(taskName: string): Promise<[AbortAnalytics, Promise<void>]>;
    private _isABuiltinTaskName;
    private _taskHit;
    private _sendHit;
}
export {};
//# sourceMappingURL=analytics.d.ts.map