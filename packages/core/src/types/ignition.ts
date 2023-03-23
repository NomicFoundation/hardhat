import { UpdateUiAction } from "../internal/types/deployment";
import { ICommandJournal } from "../internal/types/journal";
import { Services } from "../internal/types/services";

import { Providers } from "./providers";

/**
 * The setup options for the Ignition.
 *
 * @internal
 */
export interface IgnitionCreationArgs {
  /**
   * The adapters that allows Ignition to communicate with external systems
   * like the target blockchain or local filesystem.
   */
  providers: Providers;

  /**
   * An optional UI update function that will be invoked with the current
   * Ignition state on each major state change.
   */
  uiRenderer?: UpdateUiAction;

  /**
   * An optional journal that will be used to store a record of the current
   * run and to access the history of previous runs.
   */
  journal?: ICommandJournal;
}

/**
 * The setup options for Ignition
 *
 * @internal
 */
export interface IgnitionConstructorArgs {
  /**
   * An adapter that allows Ignition to communicate with external services
   * like the target blockchain or local filesystem.
   */
  services: Services;

  /**
   * A UI update function that will be invoked with the current
   * Ignition state on each major state change.
   */
  uiRenderer: UpdateUiAction;

  /**
   * A journal that will be used to store a record of the current
   * run and to access the history of previous runs.
   */
  journal: ICommandJournal;
}
