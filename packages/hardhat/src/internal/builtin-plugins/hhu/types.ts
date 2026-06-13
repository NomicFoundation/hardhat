import type { HardhatRuntimeEnvironment } from "../../../types/hre.js";
import type { NetworkManager } from "../../../types/network.js";
import type {
  BaseTaskDefinition,
  EmptyTaskDefinition,
  LazyActionObject,
  TaskArguments,
} from "../../../types/tasks.js";

/**
 * The subset of the HRE that utils tasks are allowed to use.
 *
 * It is narrowed to what the hhu binary can provide without always creating
 * a real HRE.
 */
export interface UtilsHardhatRuntimeEnvironment {
  network: Pick<NetworkManager, "create">;
}

/**
 * The fake HRE that the hhu binary builds so it can parse and run utils without
 * creating a real one. It's the surface utils actions use
 * ({@link UtilsHardhatRuntimeEnvironment}) plus the `config` that
 * `TaskManagerImplementation` needs to build the task map.
 */
export interface FakeHhuHardhatRuntimeEnvironment
  extends UtilsHardhatRuntimeEnvironment {
  config: Pick<HardhatRuntimeEnvironment["config"], "tasks" | "plugins">;
}

/**
 * The type of a utils task's action function.
 *
 * It mirrors `NewTaskActionFunction`, but the HRE passed as the second argument
 * is narrowed to `UtilsHardhatRuntimeEnvironment` so that utils tasks only
 * depend on the small surface that both the Hardhat CLI and the hhu binary can
 * provide.
 */
export type NewUtilsTaskActionFunction<
  TaskArgumentsT extends TaskArguments = TaskArguments,
> = (taskArguments: TaskArgumentsT, hre: UtilsHardhatRuntimeEnvironment) => any;

/**
 * The definition of a utils task.
 *
 * It mirrors `NewTaskDefinition`, but narrows that action to a
 * `NewUtilsTaskActionFunction`.
 */
export type NewUtilsTaskDefinition = BaseTaskDefinition & {
  action: LazyActionObject<NewUtilsTaskActionFunction>;
};

/**
 * The subset of `TaskDefinition` that utils tasks produce: either an empty task
 * (a namespace placeholder) or a utils task. Override tasks are not supported.
 */
export type UtilsTaskDefinition = EmptyTaskDefinition | NewUtilsTaskDefinition;
