/**
 * Display a confirmation prompt to the user. The prompt will be canceled if no response is given within a specified time limit.
 * @param name Used as the key for the answer on the returned values (answers) object.
 * @param message The message to display when the prompt is rendered in the terminal.
 * @param timeoutMilliseconds After how much time the prompt will be cancelled if no answer is given.
 * @returns True or false based on the user input, or undefined if the prompt times out.
 */
export async function confirmationPromptWithTimeout(
  name: string,
  message: string,
  timeoutMilliseconds: number = 10_000,
): Promise<boolean | undefined> {
  let timeout;
  try {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- The types in the module "enquirer" are not properly defined
    const { default: enquirer } = (await import("enquirer")) as any;

    const prompt = new enquirer.prompts.Confirm(
      createConfirmationPrompt(name, message),
    );

    // The timeout is a safety measure in case Hardhat is executed in a CI or another non-interactive environment and we do not detect it.
    // Instead of blocking the process indefinitely, we abort the prompt after a while.
    const timeoutPromise = new Promise((resolve) => {
      timeout = setTimeout(resolve, timeoutMilliseconds);
    });

    const result: boolean | undefined = await Promise.race([
      prompt.run(),
      timeoutPromise,
    ]);

    if (result === undefined) {
      await prompt.cancel();
    }

    return result;
  } finally {
    // We can always clear the timeout, even if not set, this API is safe to
    // call with invalid values.
    clearTimeout(timeout);
  }
}

function createConfirmationPrompt(name: string, message: string) {
  return {
    type: "confirm",
    name,
    message,
    initial: "y",
    default: "(Y/n)",
  };
}
