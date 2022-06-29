import { exec } from "child_process";
import { promisify } from "util";

import { Dependencies } from "../../types/cli";

import { isYarnProject } from "./project-creation";

const execAsync = promisify(exec);

const TELEMETRY_CONSENT_TIMEOUT = 10000;

function createConfirmationPrompt(name: string, message: string) {
  return {
    type: "confirm",
    name,
    message,
    initial: "y",
    default: "(Y/n)",
    isTrue(input: string | boolean) {
      if (typeof input === "string") {
        return input.toLowerCase() === "y";
      }

      return input;
    },
    isFalse(input: string | boolean) {
      if (typeof input === "string") {
        return input.toLowerCase() === "n";
      }

      return input;
    },
    format(): string {
      const that = this as any;
      const value = that.value === true ? "y" : "n";

      if (that.state.submitted === true) {
        return that.styles.submitted(value);
      }

      return value;
    },
  };
}

/**
 * true = install ext
 * false = don't install and don't ask again
 * undefined = don't install but maybe ask next time if something changes (i.e. they install VS Code)
 */
export async function confirmHHVSCodeInstallation(): Promise<
  boolean | undefined
> {
  const enquirer = require("enquirer");

  try {
    const { stdout } = await execAsync("code --list-extensions");
    const extName = new RegExp("NomicFoundation.hardhat-solidity");

    const hasExtension = extName.test(stdout);

    if (!hasExtension) {
      const prompt = new enquirer.prompts.Confirm({
        name: "shouldInstallExtension",
        type: "confirm",
        initial: true,
        message:
          "Would you like to install the Hardhat for Visual Studio Code extension? It adds advanced editing assistance for Solidity to VSCode",
      });

      let timeout;
      const timeoutPromise = new Promise((resolve) => {
        timeout = setTimeout(resolve, TELEMETRY_CONSENT_TIMEOUT);
      });

      const result = await Promise.race([prompt.run(), timeoutPromise]);

      clearTimeout(timeout);
      if (result === undefined) {
        await prompt.cancel();
      }

      return result;
    } else {
      // extension already installed
      return false;
    }
  } catch (e: any) {
    // vscode not installed
    if (/code: not found/.test(e?.stderr)) {
      return undefined;
    }

    if (e === "") {
      return false;
    }

    // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
    throw e;
  }
}

export async function confirmRecommendedDepsInstallation(
  depsToInstall: Dependencies
): Promise<boolean> {
  const { default: enquirer } = await import("enquirer");

  let responses: {
    shouldInstallPlugin: boolean;
  };

  const packageManager = (await isYarnProject()) ? "yarn" : "npm";

  try {
    responses = await enquirer.prompt<typeof responses>([
      createConfirmationPrompt(
        "shouldInstallPlugin",
        `Do you want to install this sample project's dependencies with ${packageManager} (${Object.keys(
          depsToInstall
        ).join(" ")})?`
      ),
    ]);
  } catch (e) {
    if (e === "") {
      return false;
    }

    // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
    throw e;
  }

  return responses.shouldInstallPlugin;
}

export async function confirmTelemetryConsent(): Promise<boolean | undefined> {
  const enquirer = require("enquirer");

  const prompt = new enquirer.prompts.Confirm({
    name: "telemetryConsent",
    type: "confirm",
    initial: true,
    message:
      "Help us improve Hardhat with anonymous crash reports & basic usage data?",
  });

  let timeout;
  const timeoutPromise = new Promise((resolve) => {
    timeout = setTimeout(resolve, TELEMETRY_CONSENT_TIMEOUT);
  });

  const result = await Promise.race([prompt.run(), timeoutPromise]);

  clearTimeout(timeout);
  if (result === undefined) {
    await prompt.cancel();
  }

  return result;
}

export async function confirmProjectCreation(): Promise<{
  projectRoot: string;
  shouldAddGitIgnore: boolean;
}> {
  const enquirer = require("enquirer");
  return enquirer.prompt([
    {
      name: "projectRoot",
      type: "input",
      initial: process.cwd(),
      message: "Hardhat project root:",
    },
    createConfirmationPrompt(
      "shouldAddGitIgnore",
      "Do you want to add a .gitignore?"
    ),
  ]);
}
