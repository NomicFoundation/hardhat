/* eslint-disable no-restricted-syntax -- This is the entry point of a
subprocess, so we need to allow of top-level await here */
import { writeJsonFile } from "@ignored/hardhat-vnext-utils/fs";
import { postJsonRequest } from "@ignored/hardhat-vnext-utils/request";

// These keys are expected to be public
// TODO: replace with prod values
const ANALYTICS_URL = "https://www.google-analytics.com/mp/collect";
const API_SECRET = "iXzTRik5RhahYpgiatSv1w";
const MEASUREMENT_ID = "G-ZFZWHGZ64H";

const payload = JSON.parse(process.argv[2]);

if (process.env.HARDHAT_TEST_SUBPROCESS_RESULT_PATH === undefined) {
  await postJsonRequest(ANALYTICS_URL, payload, {
    queryParams: {
      api_secret: API_SECRET,
      measurement_id: MEASUREMENT_ID,
    },
  });
} else {
  // ATTENTION: only for testing
  await writeJsonFile(process.env.HARDHAT_TEST_SUBPROCESS_RESULT_PATH, payload);
}
