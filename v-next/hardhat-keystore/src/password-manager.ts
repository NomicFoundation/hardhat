import chalk from "chalk";

import { requestSecretInput } from "./io.js";

// TODO: singleton for password? TBD

export async function setUpPassword(): Promise<void> {
  const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[\W_]).{8,}$/;

  const setupMsg =
    "This is the first time you are using the keystore, please set a password.";
  const passwordRulesMsg =
    "The password must have at least 8 characters, one uppercase letter, one lowercase letter, and one special character.";

  console.log(setupMsg);
  console.log(passwordRulesMsg);
  console.log();

  let password: string | undefined;
  while (password === undefined) {
    password = await requestSecretInput(`Enter your password: `);

    if (!PASSWORD_REGEX.test(password)) {
      password = undefined;
      console.log(chalk.red("Invalid password!"));
    }
  }

  const confirmMsg = "Please confirm your password: ";

  let confirmPassword: string | undefined;
  while (confirmPassword === undefined) {
    confirmPassword = await requestSecretInput(confirmMsg);

    if (password !== confirmPassword) {
      console.log(chalk.red("Passwords do not match!"));
      confirmPassword = undefined;
    }
  }
}
