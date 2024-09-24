import { createProject, CreateProjectOptions } from "./project-creation.js";

export interface InitHardhatOptions {
  project?: CreateProjectOptions;
}

export async function initHardhat(options?: InitHardhatOptions): Promise<void> {
  await createProject(options?.project);
}
