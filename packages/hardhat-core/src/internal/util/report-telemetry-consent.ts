import { Analytics } from "../cli/analytics";

async function main() {
  const [telemetryConsent] = process.argv.slice(2);

  const analytics = await Analytics.getInstance(undefined);

  const [_, consentHitPromise] = await analytics.sendTelemetryConsentHit(
    telemetryConsent as "yes" | "no"
  );
  await consentHitPromise;
}

main().catch(() => {});
