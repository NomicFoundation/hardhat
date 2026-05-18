import type { NewTaskActionFunction } from "../../../../types/tasks.js";

/**
 * Compile task action is an alias of the build task action, it invokes
 * the build task to ensure any build overrides are properly executed when
 * compile is run.
 */
const compileAction: NewTaskActionFunction = async (args, hre) => {
  return await hre.tasks.getTask("build").run(args);
};

export default compileAction;
