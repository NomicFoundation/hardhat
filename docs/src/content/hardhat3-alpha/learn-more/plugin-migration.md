# Plugin Migration

Hardhat 3 introduces many new features available to plugin developers, as well as API requirements for them to work. This guide explains the necessary and optional steps to migrate Hardhat 2 plugins to Hardhat 3.

## ES Modules

Hardhat 3 supports ESM. To make use of this, update your `package.json` to declare that your package is a module:

```json
// package.json
{
    "type": "module",
    ...
}
```

If you're using TypeScript, make sure that your `tsconfig` is set to support ESM:

```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "node16",
    ...
  },
  ...
}
```

## Dependencies

Update your dependencies to the new version of Hardhat. Make sure that Hardhat is a peer dependency:

```json
// package.json
{
    "peerDependencies": {
        "hardhat": "3.0.0-next.3",
        ...
    },
    "devDependencies": {
        "hardhat": "3.0.0-next.3",
        ...
    },
    ...
}
```

## `HardhatPlugin` export

Plugins for Hardhat 2 were largely configured through import side effects. In Hardhat 3, this process is declarative. Your plugin will now need to export a `HardhatPlugin` object for users to register in their Hardhat coniguration files.

```typescript
// index.ts
import type { HardhatPlugin } from 'hardhat/types/plugins';

const plugin: HardhatPlugin = {
    id: 'plugin-name',
    ...
};

export default plugin;
```

## Tasks

Tasks have changed significantly in Hardhat 3. While still central to Hardhat, in some situations they are no longer appropriate.

### Start with subtasks

Hardhat 3 no longer includes subtasks. Existing subtasks should be converted to regular functions.

### Build your tasks

Tasks still exist, but are now defined using a builder pattern rather than declared as a side effect of the `task` function. Take note of the API changes to some of the builder functions, and finalize your task with `.build()`. If it's not declared in the same file as your `HardhatPlugin`, export it.

```typescript
// tasks/new-task.ts
import { task } from "hardhat/config";
import { NewTaskDefinition } from "hardhat/types/tasks";

const newTask: NewTaskDefinition = task("task-name")
  .setDescription("A Hardhat 3 task")
  .setAction(async () => {
    // task logic
  })
  .addFlag({ name: "taskOption", description: "a boolean CLI flag" })
  .build();

export default newTask;
```

Register your task with your `HardhatPlugin` object:

```typescript
// index.ts
import type { HardhatPlugin } from 'hardhat/types/plugins';
import newTask from './tasks/new-task.js';

const plugin: HardhatPlugin = {
    id: 'plugin-name',
    tasks: [newTask],
    ...
};

export default plugin;
```

### Task Actions

Inline task action declaration is supported only for development purposes. For production, move your action to a separate file:

```typescript
// actions/new-task.ts
export interface TaskActionArguments {
  taskOption: boolean;
}

const action = (NewTaskActionFunction<TaskActionArguments> = async (
  args,
  hre,
) => {
  // task logic
});

export default action;
```

Reference it in your task builder:

```typescript
// tasks/new-task.ts
import { task } from "hardhat/config";
import { NewTaskDefinition } from "hardhat/types/tasks";

const newTask: NewTaskDefinition = task("task-name")
  .setDescription("A Hardhat 3 task")
  .setAction(import.meta.resolve("./actions/new-task.js"))
  .addFlag({ name: "taskOption", description: "a boolean CLI flag" })
  .build();

export default newTask;
```

## Hooks

Some processes that were previously handled exclusively by tasks might be better served by hooks. Generally task overrides will still work, but here's an example of a post-compilation action which uses a hook instead:

```typescript
// hook-handlers/solidity.ts
import type { SolidityHooks } from "hardhat/types/hooks";

export default async (): Promise<Partial<SolidityHooks>> => ({
  onCleanUpArtifacts: async (context, artifactPaths, next) => {
    // post-compilation script

    return next(context, artifactPaths);
  },
});
```

### Config Hooks

The `extendConfig` function no longer exists in Hardhat 3. Instead, use one of the `ConfigHooks`:

```typescript
// hook-handlers/config.ts
import type { ConfigHooks } from "hardhat/types/hooks";

export default async (): Promise<Partial<ConfigHooks>> => ({
  resolveUserConfig: async (userConfig, resolveConfigurationariable, next) => {
    const resolvedConfig = await next(userConfig, resolveConfigurationVariable);

    const myUserConfig = {
      ...defaultConfig,
      ...userConfig.myUserConfig,
    };

    return {
      ...resolvedConfig,
      myUserConfig,
    };
  },
});
```

## See Also

### Global Options

```typescript
// index.ts
import { globalOption } from 'hardhat/config';
import { ArgumentType } from 'hardhat/types/arguments';
import type { HardhatPlugin } from 'hardhat/types/plugins';

const plugin: HardhatPlugin = {
    globalOptions: [
        globalOption({
            name: 'globalOption',
            description: "A global option available for all tasks on the CLI",
            defaultValue: false,
            type: ArgumentType.BOOLEAN,
        }),
    ],
    ...
};

export default plugin;
```
