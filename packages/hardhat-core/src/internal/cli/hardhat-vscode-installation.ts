import { execSync } from "child_process";

export enum InstallationState {
  VSCODE_FAILED_OR_NOT_INSTALLED,
  EXTENSION_INSTALLED,
  EXTENSION_NOT_INSTALLED,
}

const HARDHAT_VSCODE_ID = "NomicFoundation.hardhat-solidity";

export function isHardhatVSCodeInstalled(): InstallationState {
  try {
    const stdout = execSync("code --list-extensions", { encoding: "utf8" });
    return stdout.includes(HARDHAT_VSCODE_ID)
      ? InstallationState.EXTENSION_INSTALLED
      : InstallationState.EXTENSION_NOT_INSTALLED;
  } catch (e) {
    return InstallationState.VSCODE_FAILED_OR_NOT_INSTALLED;
  }
}

export function installHardhatVSCode() {
  execSync(`code --install-extension ${HARDHAT_VSCODE_ID}`);
}
