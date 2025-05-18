/**
 * This interface is used to interact with the user in the middle of the
 * execution of an unrelated piece of functionality.
 *
 * Some examples of things that you may use this interface for:
 *  - Asking the user to sign a transaction with his hardware wallet.
 *  - Asking the user for a password to descrypt a store of configuration variables.
 */
export interface UserInterruptionManager {
  /**
   * Displays a message to the user, returning a `Promise` that resolve when the
   * message was displayed and we have a good digree of certainty that the user
   * has read it.
   *
   * For example, if the plugin/task handling the user output doesn't refresh the screen,
   * the returned `Promise` can resolve immediately. If it refreshes the screen, the
   * `Promise` may resolve only after certain user interaction.
   *
   * @param interruptor - A name or description of the module calling this method.
   * @param message - The message to display.
   */
  displayMessage: (interruptor: string, message: string) => Promise<void>;

  /**
   * Request user input, returning a `Promise` that resolves with the user's input.
   *
   * @param interruptor - A name or description of the module calling this method.
   * @param inputDescription - A description of the input that is being requested.
   */
  requestInput: (
    interruptor: string,
    inputDescription: string,
  ) => Promise<string>;

  /**
   * Request a secret input from the user, returning a `Promise` that resolves with
   * the user's input.
   *
   * The main difference between this method and `requestInput` is that with this
   * method the plugin/task handling the user input/output should take extra care
   * to avoid leaking the user's input or displaying it in the user's terminal.
   *
   * @param interruptor - A name or description of the module calling this method.
   * @param inputDescription - A description of the input that is being requested.
   */
  requestSecretInput: (
    interruptor: string,
    inputDescription: string,
  ) => Promise<string>;

  /**
   * Executes `f` without allowing user interruptions during its execution.
   * @param f - The function to execute.
   */
  uninterrupted<ReturnT>(f: () => ReturnT): Promise<Awaited<ReturnT>>;
}
