import {
  scope,
  subtask,
  task,
} from "../../src/internal/core/config/config-env";

// type helper
export type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <
  T
>() => T extends Y ? 1 : 2
  ? true
  : false;

type Scope = ReturnType<typeof scope>;

// Assert that the types of `task` and `scope("scope-name").task` are equal.
const _taskEqualsScopeTask: Equals<typeof task, Scope["task"]> = true;
// Same for `subtask`.
const _subtaskEqualsScopeSubtask: Equals<typeof subtask, Scope["subtask"]> =
  true;
