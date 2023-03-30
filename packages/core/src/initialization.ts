import type { UpdateUiAction } from "./internal/types/deployment";
import type { ICommandJournal } from "./internal/types/journal";
import type {
  ICommandJournalT,
  Ignition,
  UpdateUiActionT,
} from "./types/ignition";
import type { Providers } from "./types/providers";

import { IgnitionImplementation } from "./internal/Ignition";

/**
 * The setup options for the Ignition.
 *
 * @alpha
 */
export interface IgnitionInitializationArguments {
  /**
   * The adapters that allows Ignition to communicate with external systems
   * like the target blockchain or local filesystem.
   */
  providers: Providers;

  /**
   * An optional UI update function that will be invoked with the current
   * Ignition state on each major state change.
   */
  uiRenderer?: UpdateUiActionT;

  /**
   * An optional journal that will be used to store a record of the current
   * run and to access the history of previous runs.
   */
  journal?: ICommandJournalT;
}

/**
 * Creates a new instances of Ignition
 *
 * @alpha
 */
export function initializeIgnition(
  args: IgnitionInitializationArguments
): Ignition {
  return IgnitionImplementation.create({
    providers: args.providers,
    journal: args.journal as ICommandJournal | undefined,
    uiRenderer: args.uiRenderer as UpdateUiAction | undefined,
  });
}
