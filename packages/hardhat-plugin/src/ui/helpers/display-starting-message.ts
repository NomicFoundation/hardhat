import { UiState } from "../types";

/**
 * Display the temporary starting message. Note this does not print a newline.
 *
 * @param state - the UI state
 */
export function displayStartingMessage(state: UiState) {
  process.stdout.write(
    `Hardhat Ignition starting for [ ${state.moduleName ?? "unknown"} ]...`
  );
}
