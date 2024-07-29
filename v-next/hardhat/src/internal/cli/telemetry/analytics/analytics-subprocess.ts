import { postJsonRequest } from "@ignored/hardhat-vnext-utils/request";

// These keys are expected to be public
const ANALYTICS_URL = "https://www.google-analytics.com/mp/collect";
const API_SECRET = "iXzTRik5RhahYpgiatSv1w";
const MEASUREMENT_ID = "G-ZFZWHGZ64H";

const payload = JSON.parse(process.argv[2]);

await postJsonRequest(ANALYTICS_URL, payload, {
  queryParams: {
    api_secret: API_SECRET,
    measurement_id: MEASUREMENT_ID,
  },
});
