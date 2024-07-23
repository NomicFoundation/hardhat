import { postJsonRequest } from "@ignored/hardhat-vnext-utils/request";

// These keys are expected to be public
const ANALYTICS_URL = "https://www.google-analytics.com/mp/collect";
const API_SECRET = "fQ5joCsDRTOp55wX8a2cVw";
const MEASUREMENT_ID = "G-8LQ007N2QJ";

(async () => {
  const payload = JSON.parse(process.argv[2]);

  await postJsonRequest(ANALYTICS_URL, payload, {
    queryParams: {
      api_secret: API_SECRET,
      measurement_id: MEASUREMENT_ID,
    },
  });
})().catch((_err: unknown) => {});
