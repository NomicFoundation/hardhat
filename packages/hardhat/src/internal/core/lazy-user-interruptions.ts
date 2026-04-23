import type { UserInterruptionManagerImplementation as UserInterruptionManagerImplementationT } from "./user-interruptions.js";
import type { HookManager } from "../../types/hooks.js";
import type { UserInterruptionManager } from "../../types/user-interruptions.js";

let UserInterruptionManagerImplementation:
  | typeof UserInterruptionManagerImplementationT
  | undefined;

export class LazyUserInterruptionManager implements UserInterruptionManager {
  readonly #hooks: HookManager;

  #userInterruptionManager: UserInterruptionManagerImplementationT | undefined;

  constructor(hooks: HookManager) {
    this.#hooks = hooks;
  }

  public async displayMessage(
    interruptor: string,
    message: string,
  ): Promise<void> {
    const userInterruptionManager = await this.#getUserInterruptionManager();
    return await userInterruptionManager.displayMessage(interruptor, message);
  }

  public async requestInput(
    interruptor: string,
    inputDescription: string,
  ): Promise<string> {
    const userInterruptionManager = await this.#getUserInterruptionManager();
    return await userInterruptionManager.requestInput(
      interruptor,
      inputDescription,
    );
  }

  public async requestSecretInput(
    interruptor: string,
    inputDescription: string,
  ): Promise<string> {
    const userInterruptionManager = await this.#getUserInterruptionManager();
    return await userInterruptionManager.requestSecretInput(
      interruptor,
      inputDescription,
    );
  }

  public async uninterrupted<ReturnT>(
    f: () => ReturnT,
  ): Promise<Awaited<ReturnT>> {
    const userInterruptionManager = await this.#getUserInterruptionManager();
    return await userInterruptionManager.uninterrupted(f);
  }

  async #getUserInterruptionManager(): Promise<UserInterruptionManagerImplementationT> {
    // Note: `await import` must run BEFORE the instance cache check so that
    // concurrent callers share a single microtask-dedupe point — otherwise
    // each suspended caller re-enters the branch and constructs its own
    // impl, so callers end up holding different impl instances and state,
    // which can cause concurrency issues.
    if (UserInterruptionManagerImplementation === undefined) {
      ({ UserInterruptionManagerImplementation } = await import(
        "./user-interruptions.js"
      ));
    }

    if (this.#userInterruptionManager === undefined) {
      this.#userInterruptionManager = new UserInterruptionManagerImplementation(
        this.#hooks,
      );
    }

    return this.#userInterruptionManager;
  }
}
