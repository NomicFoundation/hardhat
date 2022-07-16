export interface TaskProfile {
  name: string;
  start: bigint;
  end?: bigint;
  children: TaskProfile[];
  parallel?: boolean;
}

export function createTaskProfile(name: string): TaskProfile {
  return {
    name,
    start: process.hrtime.bigint(),
    children: [],
  };
}

export function completeTaskProfile(taskProfile: TaskProfile) {
  taskProfile.end = process.hrtime.bigint();
}

export function createParentTaskProfile(taskProfile: TaskProfile): TaskProfile {
  return createTaskProfile(`super::${taskProfile.name}`);
}
