import type { RawInterruptions } from "../types.js";

export async function setUpPassword(
  interruptions: RawInterruptions,
): Promise<void> {
  const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[\W_]).{8,}$/;

  const setupMsg =
    "This is the first time you are using the keystore, please set a password.";
  const passwordRulesMsg =
    "The password must have at least 8 characters, one uppercase letter, one lowercase letter, and one special character.";

  await interruptions.info(setupMsg);
  await interruptions.info(passwordRulesMsg);
  await interruptions.info("");

  let password: string | undefined;
  while (password === undefined) {
    password = await interruptions.requestSecretInput(`Enter your password: `);

    if (!PASSWORD_REGEX.test(password)) {
      password = undefined;
      await interruptions.error("Invalid password!");
    }
  }

  let confirmPassword: string | undefined;
  while (confirmPassword === undefined) {
    confirmPassword = await interruptions.requestSecretInput(
      "Please confirm your password: ",
    );

    if (password !== confirmPassword) {
      await interruptions.error("Passwords do not match!");
      confirmPassword = undefined;
    }
  }
}

export async function isAuthorized(): Promise<boolean> {
  return true;
}
