import { io } from "./io.js";

// TODO: singleton for password? TBD

export async function setUpPassword(): Promise<void> {
  const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[\W_]).{8,}$/;

  const setupMsg =
    "This is the first time you are using the keystore, please set a password.";
  const passwordRulesMsg =
    "The password must have at least 8 characters, one uppercase letter, one lowercase letter, and one special character.";

  io.info(setupMsg);
  io.info(passwordRulesMsg);
  io.info("");

  let password: string | undefined;
  while (password === undefined) {
    password = await io.requestSecretInput(`Enter your password: `);

    if (!PASSWORD_REGEX.test(password)) {
      password = undefined;
      io.error("Invalid password!");
    }
  }

  let confirmPassword: string | undefined;
  while (confirmPassword === undefined) {
    confirmPassword = await io.requestSecretInput(
      "Please confirm your password: ",
    );

    if (password !== confirmPassword) {
      io.error("Passwords do not match!");
      confirmPassword = undefined;
    }
  }
}

export async function isAuthorized(): Promise<boolean> {
  return true;
}
