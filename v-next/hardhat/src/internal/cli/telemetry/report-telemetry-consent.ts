// // import path from "node:path";
// // import { fileURLToPath } from "node:url";

// // import { writeJsonFile } from "@ignored/hardhat-vnext-utils/fs";

// // const jsonFile = path.join(
// //   path.dirname(fileURLToPath(import.meta.url)),
// //   "report-telemetry-consent2222.json",
// // );

// // writeJsonFile(jsonFile, {
// //   test: 123,
// // }).catch(() => "done");

// import { Analytics } from "../cli/analytics";

// async function main() {
//   // This default value shouldn't be necessary, but we add one to make it
//   // easier to recognize if the telemetry consent value is not passed.
//   const [telemetryConsent = "<undefined-telemetry-consent>"] =
//     process.argv.slice(2);

//   // we pass undefined as the telemetryConsent value because
//   // this hit is done before the consent is saved
//   const analytics = await Analytics.getInstance(undefined);

//   const [_, consentHitPromise] = await analytics.sendTelemetryConsentHit(
//     telemetryConsent as "yes" | "no",
//   );
//   await consentHitPromise;
// }

// main().catch(() => {});
