import type { UserInterruptionManagerImplementation } from "./user-interruptions.js";
import type { HookManager } from "../../types/hooks.js";
import type { UserInterruptionManager } from "../../types/user-interruptions.js";

export class LazyUserInterruptionManager implements UserInterruptionManager {
  readonly #hooks: HookManager;

  #userInterruptionManager: UserInterruptionManagerImplementation | undefined;

  constructor(hooks: HookManager) {
    this.#hooks = hooks;
  }

  public async displayMessage(
    interruptor: string,
    message: string,
  ): Promise<void> {
    const userInterruptionManager = await this.#getUserInterruptionManager();
    return userInterruptionManager.displayMessage(interruptor, message);
  }

  public async requestInput(
    interruptor: string,
    inputDescription: string,
  ): Promise<string> {
    const userInterruptionManager = await this.#getUserInterruptionManager();
    return userInterruptionManager.requestInput(interruptor, inputDescription);
  }

  public async requestSecretInput(
    interruptor: string,
    inputDescription: string,
  ): Promise<string> {
    const userInterruptionManager = await this.#getUserInterruptionManager();
    return userInterruptionManager.requestSecretInput(
      interruptor,
      inputDescription,
    );
  }

  public async uninterrupted<ReturnT>(
    f: () => ReturnT,
  ): Promise<Awaited<ReturnT>> {
    const userInterruptionManager = await this.#getUserInterruptionManager();
    return userInterruptionManager.uninterrupted(f);
  }

  async #getUserInterruptionManager(): Promise<UserInterruptionManagerImplementation> {
    if (this.#userInterruptionManager === undefined) {
      const { UserInterruptionManagerImplementation } = await import(
        "./user-interruptions.js"
      );

      this.#userInterruptionManager = new UserInterruptionManagerImplementation(
        this.#hooks,
      );
    }

    return this.#userInterruptionManager;
  }
}
