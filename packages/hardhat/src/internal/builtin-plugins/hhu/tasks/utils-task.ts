import type {
  LazyActionObject,
  NewTaskDefinitionBuilder,
  TaskArguments,
} from "../../../../types/tasks.js";
import type {
  NewUtilsTaskActionFunction,
  NewUtilsTaskDefinition,
} from "../types.js";

/**
 * Builds a utils task from a configured task builder and a lazily-loaded action.
 *
 * The standard builder's `setAction`/`build` are hardcoded to
 * `NewTaskActionFunction`, so it can't produce a `NewUtilsTaskDefinition` on its
 * own. This helper requires the action to be a `NewUtilsTaskActionFunction`
 * (rejecting wider actions at the call site), which is what makes re-narrowing
 * the built definition sound.
 */
export function buildUtilsTask<TaskArgumentsT extends TaskArguments>(
  builder: NewTaskDefinitionBuilder<TaskArgumentsT>,
  action: LazyActionObject<NewUtilsTaskActionFunction<TaskArgumentsT>>,
): NewUtilsTaskDefinition {
  // The narrower action is assignable to the builder's `NewTaskActionFunction`,
  // and since `action` is statically a `NewUtilsTaskActionFunction`, re-narrowing
  // the result is safe.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- see above
  return builder.setAction(action).build() as NewUtilsTaskDefinition;
}
