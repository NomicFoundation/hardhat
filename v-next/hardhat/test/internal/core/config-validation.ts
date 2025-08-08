import type { HardhatUserConfig } from "../../../src/config.js";
import type {
  ProjectPathsUserConfig,
  TestPathsUserConfig,
} from "../../../src/types/config.js";
import type { HardhatPlugin } from "../../../src/types/plugins.js";
import type {
  EmptyTaskDefinition,
  NewTaskDefinition,
  TaskOverrideDefinition,
  TaskDefinition,
} from "../../../src/types/tasks.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  validatePositionalArguments,
  validateOptions,
  validateEmptyTask,
  validateNewTask,
  validateTaskOverride,
  validateTasksConfig,
  validatePluginsConfig,
  collectValidationErrorsForUserConfig,
  validatePaths,
} from "../../../src/internal/core/config-validation.js";
import {
  type PositionalArgumentDefinition,
  type OptionDefinition,
  ArgumentType,
} from "../../../src/types/arguments.js";
import { TaskDefinitionType } from "../../../src/types/tasks.js";

describe("config validation", function () {
  describe("validatePositionalArguments", function () {
    it("should return an empty array if the positional arguments are valid", function () {
      const positionalArguments: PositionalArgumentDefinition[] = [
        {
          name: "arg1",
          type: ArgumentType.STRING,
          description: "arg1 description",
          isVariadic: false,
        },
      ];

      assert.deepEqual(
        validatePositionalArguments(positionalArguments, []),
        [],
      );
    });

    it("should return an error if the positional arguments name is not a string", function () {
      const positionalArguments: PositionalArgumentDefinition[] = [
        {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
          name: 1 as any,
          type: ArgumentType.STRING,
          description: "arg1 description",
          isVariadic: false,
        },
      ];

      assert.deepEqual(validatePositionalArguments(positionalArguments, []), [
        {
          message: "positional argument name must be a string",
          path: ["positionalArguments", 0, "name"],
        },
      ]);
    });

    it("should return an error if the positional arguments description is not a string", function () {
      const positionalArguments: PositionalArgumentDefinition[] = [
        {
          name: "arg1",
          type: ArgumentType.STRING,
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
          description: 1 as any,
          isVariadic: false,
        },
      ];

      assert.deepEqual(validatePositionalArguments(positionalArguments, []), [
        {
          message: "positional argument description must be a string",
          path: ["positionalArguments", 0, "description"],
        },
      ]);
    });

    it("should return an error if the positional arguments type is not a valid ArgumentType", function () {
      const positionalArguments: PositionalArgumentDefinition[] = [
        {
          name: "arg1",
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
          type: "invalid" as any,
          description: "arg1 description",
          isVariadic: false,
        },
      ];

      assert.deepEqual(validatePositionalArguments(positionalArguments, []), [
        {
          message: "positional argument type must be a valid ArgumentType",
          path: ["positionalArguments", 0, "type"],
        },
      ]);
    });

    it("should return an error if the positional arguments isVariadic is not a boolean", function () {
      const positionalArguments: PositionalArgumentDefinition[] = [
        {
          name: "arg1",
          type: ArgumentType.STRING,
          description: "arg1 description",
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
          isVariadic: 1 as any,
        },
      ];

      assert.deepEqual(validatePositionalArguments(positionalArguments, []), [
        {
          message: "positional argument isVariadic must be a boolean",
          path: ["positionalArguments", 0, "isVariadic"],
        },
      ]);
    });

    it("should return an error if the positional arguments are variadic and not the last", function () {
      const positionalArguments: PositionalArgumentDefinition[] = [
        {
          name: "arg1",
          type: ArgumentType.STRING,
          description: "arg1 description",
          isVariadic: true,
        },
        {
          name: "arg2",
          type: ArgumentType.STRING,
          description: "arg2 description",
          isVariadic: false,
        },
      ];

      assert.deepEqual(validatePositionalArguments(positionalArguments, []), [
        {
          message: "variadic positional argument must be the last one",
          path: ["positionalArguments", 0, "isVariadic"],
        },
      ]);
    });

    describe("defaultValue", function () {
      describe("when the arg type is STRING", function () {
        it("should return an error if the defaultValue is not a string", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.STRING,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: 1,
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [
              {
                message:
                  "positional argument defaultValue must be a string or an array of strings",
                path: ["positionalArguments", 0, "defaultValue"],
              },
            ],
          );
        });

        it("should return an error if the defaultValue is an array of non-strings", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.STRING,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: [1],
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [
              {
                message:
                  "positional argument defaultValue must be a string or an array of strings",
                path: ["positionalArguments", 0, "defaultValue"],
              },
            ],
          );
        });

        it("should return an empty array if the defaultValue is a string", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.STRING,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: "default",
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [],
          );
        });

        it("should return an empty array if the defaultValue is an array of strings", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.STRING,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: ["default"],
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [],
          );
        });
      });

      describe("when the arg type is FILE", function () {
        it("should return an error if the defaultValue is not a string", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.FILE,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: 1,
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [
              {
                message:
                  "positional argument defaultValue must be a string or an array of strings",
                path: ["positionalArguments", 0, "defaultValue"],
              },
            ],
          );
        });

        it("should return an error if the defaultValue is an array of non-strings", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.FILE,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: [1],
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [
              {
                message:
                  "positional argument defaultValue must be a string or an array of strings",
                path: ["positionalArguments", 0, "defaultValue"],
              },
            ],
          );
        });

        it("should return an empty array if the defaultValue is a string", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.FILE,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: "default",
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [],
          );
        });

        it("should return an empty array if the defaultValue is an array of strings", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.FILE,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: ["default"],
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [],
          );
        });
      });

      describe("when the arg type is BOOLEAN", function () {
        it("should return an error if the defaultValue is not a boolean", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.BOOLEAN,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: 1,
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [
              {
                message:
                  "positional argument defaultValue must be a boolean or an array of booleans",
                path: ["positionalArguments", 0, "defaultValue"],
              },
            ],
          );
        });

        it("should return an error if the defaultValue is an array of non-booleans", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.BOOLEAN,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: [1],
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [
              {
                message:
                  "positional argument defaultValue must be a boolean or an array of booleans",
                path: ["positionalArguments", 0, "defaultValue"],
              },
            ],
          );
        });

        it("should return an empty array if the defaultValue is a boolean", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.BOOLEAN,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: false,
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [],
          );
        });

        it("should return an empty array if the defaultValue is an array of booleans", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.BOOLEAN,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: [false],
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [],
          );
        });
      });

      describe("when the arg type is INT", function () {
        it("should return an error if the defaultValue is not a number", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.INT,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: "value",
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [
              {
                message:
                  "positional argument defaultValue must be a number or an array of numbers",
                path: ["positionalArguments", 0, "defaultValue"],
              },
            ],
          );
        });

        it("should return an error if the defaultValue is an array of non-numbers", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.INT,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: ["value"],
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [
              {
                message:
                  "positional argument defaultValue must be a number or an array of numbers",
                path: ["positionalArguments", 0, "defaultValue"],
              },
            ],
          );
        });

        it("should return an empty array if the defaultValue is a number", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.INT,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: 1,
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [],
          );
        });

        it("should return an empty array if the defaultValue is an array of numbers", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.INT,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: [1],
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [],
          );
        });
      });

      describe("when the arg type is FLOAT", function () {
        it("should return an error if the defaultValue is not a number", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.FLOAT,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: "value",
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [
              {
                message:
                  "positional argument defaultValue must be a number or an array of numbers",
                path: ["positionalArguments", 0, "defaultValue"],
              },
            ],
          );
        });

        it("should return an error if the defaultValue is an array of non-numbers", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.FLOAT,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: ["value"],
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [
              {
                message:
                  "positional argument defaultValue must be a number or an array of numbers",
                path: ["positionalArguments", 0, "defaultValue"],
              },
            ],
          );
        });

        it("should return an empty array if the defaultValue is a number", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.FLOAT,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: 1,
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [],
          );
        });

        it("should return an empty array if the defaultValue is an array of numbers", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.FLOAT,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: [1],
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [],
          );
        });
      });

      describe("when the arg type is BIGINT", function () {
        it("should return an error if the defaultValue is not a bigint", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.BIGINT,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: 1,
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [
              {
                message:
                  "positional argument defaultValue must be a bigint or an array of bigints",
                path: ["positionalArguments", 0, "defaultValue"],
              },
            ],
          );
        });

        it("should return an error if the defaultValue is an array of non-bigints", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.BIGINT,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: [1],
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [
              {
                message:
                  "positional argument defaultValue must be a bigint or an array of bigints",
                path: ["positionalArguments", 0, "defaultValue"],
              },
            ],
          );
        });

        it("should return an empty array if the defaultValue is a bigint", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.BIGINT,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: 1n,
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [],
          );
        });

        it("should return an empty array if the defaultValue is an array of bigints", function () {
          const positionalArguments: PositionalArgumentDefinition[] = [
            {
              name: "arg1",
              type: ArgumentType.BIGINT,
              description: "arg1 description",
              isVariadic: false,
              defaultValue: [1n],
            },
          ];

          assert.deepEqual(
            validatePositionalArguments(positionalArguments, []),
            [],
          );
        });
      });
    });
  });

  describe("validateOptions", function () {
    it("should return an empty array if the options are valid", function () {
      const options: Record<string, OptionDefinition> = {
        opt1: {
          name: "opt1",
          type: ArgumentType.STRING,
          description: "opt1 description",
          defaultValue: "default",
        },
      };

      assert.deepEqual(validateOptions(options, []), []);
    });

    it("should return an error if the options name is not a string", function () {
      const options: Record<string, OptionDefinition> = {
        opt1: {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
          name: 1 as any,
          type: ArgumentType.STRING,
          description: "opt1 description",
          defaultValue: "default",
        },
      };

      assert.deepEqual(validateOptions(options, []), [
        {
          message: "option name must be a string",
          path: ["opt1", "name"],
        },
      ]);
    });

    it("should return an error if the options description is not a string", function () {
      const options: Record<string, OptionDefinition> = {
        opt1: {
          name: "opt1",
          type: ArgumentType.STRING,
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
          description: 1 as any,
          defaultValue: "default",
        },
      };

      assert.deepEqual(validateOptions(options, []), [
        {
          message: "option description must be a string",
          path: ["opt1", "description"],
        },
      ]);
    });

    it("should return an error if the options type is not a valid ArgumentType", function () {
      const options: Record<string, OptionDefinition> = {
        opt1: {
          name: "opt1",
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
          type: "invalid" as any,
          description: "opt1 description",
          defaultValue: "default",
        },
      };

      assert.deepEqual(validateOptions(options, []), [
        {
          message: "option type must be a valid ArgumentType",
          path: ["opt1", "type"],
        },
      ]);
    });

    describe("defaultValue", function () {
      it("should return an error if there is no defaultValue", function () {
        const options: Record<string, OptionDefinition> = {
          // @ts-expect-error -- testing validations for js users who can bypass type checks
          opt1: {
            name: "opt1",
            type: ArgumentType.STRING,
            description: "opt1 description",
          },
        };

        assert.deepEqual(validateOptions(options, []), [
          {
            message: "option defaultValue must be defined",
            path: ["opt1", "defaultValue"],
          },
        ]);
      });

      describe("when the arg type is STRING", function () {
        it("should return an error if the defaultValue is not a string", function () {
          const options: Record<string, OptionDefinition> = {
            opt1: {
              name: "opt1",
              type: ArgumentType.STRING,
              description: "opt1 description",
              defaultValue: 1,
            },
          };

          assert.deepEqual(validateOptions(options, []), [
            {
              message: "option defaultValue must be a string",
              path: ["opt1", "defaultValue"],
            },
          ]);
        });

        it("should return an empty array if the defaultValue is a string", function () {
          const options: Record<string, OptionDefinition> = {
            opt1: {
              name: "opt1",
              type: ArgumentType.STRING,
              description: "opt1 description",
              defaultValue: "default",
            },
          };

          assert.deepEqual(validateOptions(options, []), []);
        });
      });

      describe("when the arg type is FILE", function () {
        it("should return an error if the defaultValue is not a string", function () {
          const options: Record<string, OptionDefinition> = {
            opt1: {
              name: "opt1",
              type: ArgumentType.FILE,
              description: "opt1 description",
              defaultValue: 1,
            },
          };

          assert.deepEqual(validateOptions(options, []), [
            {
              message: "option defaultValue must be a string",
              path: ["opt1", "defaultValue"],
            },
          ]);
        });

        it("should return an empty array if the defaultValue is a string", function () {
          const options: Record<string, OptionDefinition> = {
            opt1: {
              name: "opt1",
              type: ArgumentType.FILE,
              description: "opt1 description",
              defaultValue: "default",
            },
          };

          assert.deepEqual(validateOptions(options, []), []);
        });
      });

      describe("when the arg type is BOOLEAN", function () {
        it("should return an error if the defaultValue is not a boolean", function () {
          const options: Record<string, OptionDefinition> = {
            opt1: {
              name: "opt1",
              type: ArgumentType.BOOLEAN,
              description: "opt1 description",
              defaultValue: 1,
            },
          };

          assert.deepEqual(validateOptions(options, []), [
            {
              message: "option defaultValue must be a boolean",
              path: ["opt1", "defaultValue"],
            },
          ]);
        });

        it("should return an empty array if the defaultValue is a boolean", function () {
          const options: Record<string, OptionDefinition> = {
            opt1: {
              name: "opt1",
              type: ArgumentType.BOOLEAN,
              description: "opt1 description",
              defaultValue: false,
            },
          };

          assert.deepEqual(validateOptions(options, []), []);
        });
      });

      describe("when the arg type is INT", function () {
        it("should return an error if the defaultValue is not a number", function () {
          const options: Record<string, OptionDefinition> = {
            opt1: {
              name: "opt1",
              type: ArgumentType.INT,
              description: "opt1 description",
              defaultValue: false,
            },
          };

          assert.deepEqual(validateOptions(options, []), [
            {
              message: "option defaultValue must be a number",
              path: ["opt1", "defaultValue"],
            },
          ]);
        });

        it("should return an empty array if the defaultValue is a number", function () {
          const options: Record<string, OptionDefinition> = {
            opt1: {
              name: "opt1",
              type: ArgumentType.INT,
              description: "opt1 description",
              defaultValue: 1,
            },
          };

          assert.deepEqual(validateOptions(options, []), []);
        });
      });

      describe("when the arg type is FLOAT", function () {
        it("should return an error if the defaultValue is not a number", function () {
          const options: Record<string, OptionDefinition> = {
            opt1: {
              name: "opt1",
              type: ArgumentType.FLOAT,
              description: "opt1 description",
              defaultValue: false,
            },
          };

          assert.deepEqual(validateOptions(options, []), [
            {
              message: "option defaultValue must be a number",
              path: ["opt1", "defaultValue"],
            },
          ]);
        });

        it("should return an empty array if the defaultValue is a number", function () {
          const options: Record<string, OptionDefinition> = {
            opt1: {
              name: "opt1",
              type: ArgumentType.FLOAT,
              description: "opt1 description",
              defaultValue: 1,
            },
          };

          assert.deepEqual(validateOptions(options, []), []);
        });
      });

      describe("when the arg type is BIGINT", function () {
        it("should return an error if the defaultValue is not a bigint", function () {
          const options: Record<string, OptionDefinition> = {
            opt1: {
              name: "opt1",
              type: ArgumentType.BIGINT,
              description: "opt1 description",
              defaultValue: false,
            },
          };

          assert.deepEqual(validateOptions(options, []), [
            {
              message: "option defaultValue must be a bigint",
              path: ["opt1", "defaultValue"],
            },
          ]);
        });

        it("should return an empty array if the defaultValue is a bigint", function () {
          const options: Record<string, OptionDefinition> = {
            opt1: {
              name: "opt1",
              type: ArgumentType.BIGINT,
              description: "opt1 description",
              defaultValue: 1n,
            },
          };

          assert.deepEqual(validateOptions(options, []), []);
        });
      });

      describe("when the opt type is FLAG", () => {
        it("should return an error if the defaultValue is not a boolean", () => {
          const options = {
            opt1: {
              name: "opt1",
              type: ArgumentType.FLAG,
              description: "opt1 description",
              defaultValue: 1,
            },
          };

          assert.deepEqual(validateOptions(options, []), [
            {
              message: "option defaultValue must be a boolean",
              path: ["opt1", "defaultValue"],
            },
          ]);
        });

        it("should return an empty array if the defaultValue is a boolean", () => {
          const options = {
            opt1: {
              name: "opt1",
              type: ArgumentType.FLAG,
              description: "opt1 description",
              defaultValue: true,
            },
          };

          assert.deepEqual(validateOptions(options, []), []);
        });
      });

      describe("when the opt type is LEVEL", () => {
        it("should return an error if the defaultValue is not a non-negative number", () => {
          const options = {
            opt1: {
              name: "opt1",
              type: ArgumentType.LEVEL,
              description: "opt1 description",
              defaultValue: -1,
            },
          };

          assert.deepEqual(validateOptions(options, []), [
            {
              message: "option defaultValue must be a non-negative number",
              path: ["opt1", "defaultValue"],
            },
          ]);
        });

        it("should return an empty array if the defaultValue is a non-negative number", () => {
          const options = {
            opt1: {
              name: "opt1",
              type: ArgumentType.LEVEL,
              description: "opt1 description",
              defaultValue: 0,
            },
          };

          assert.deepEqual(validateOptions(options, []), []);
        });
      });
    });
  });

  describe("validateEmptyTask", function () {
    it("should return an empty array if the task is valid", function () {
      const task: EmptyTaskDefinition = {
        type: TaskDefinitionType.EMPTY_TASK,
        id: ["task-id"],
        description: "task description",
      };

      assert.deepEqual(validateEmptyTask(task, []), []);
    });

    it("should return an error if the task id is not an array of strings", function () {
      const task: EmptyTaskDefinition = {
        type: TaskDefinitionType.EMPTY_TASK,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
        id: 1 as any,
        description: "task description",
      };

      const task2: EmptyTaskDefinition = {
        type: TaskDefinitionType.EMPTY_TASK,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
        id: [1] as any,
        description: "task description",
      };

      assert.deepEqual(validateEmptyTask(task, []), [
        {
          message: "task id must be an array of strings",
          path: ["id"],
        },
      ]);

      assert.deepEqual(validateEmptyTask(task2, []), [
        {
          message: "task id must be an array of strings",
          path: ["id"],
        },
      ]);
    });

    it("should return an error if the task description is not a string", function () {
      const task: EmptyTaskDefinition = {
        type: TaskDefinitionType.EMPTY_TASK,
        id: ["task-id"],
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
        description: 1 as any,
      };

      assert.deepEqual(validateEmptyTask(task, []), [
        {
          message: "task description must be a string",
          path: ["description"],
        },
      ]);
    });
  });

  describe("validateNewTask", function () {
    it("should return an empty array if the task is valid", function () {
      const task: NewTaskDefinition = {
        type: TaskDefinitionType.NEW_TASK,
        id: ["task-id"],
        description: "task description",
        action: async () => {},
        options: {},
        positionalArguments: [],
      };

      assert.deepEqual(validateNewTask(task, []), []);
    });

    it("should return an error if the task id is not an array of strings", function () {
      const task: NewTaskDefinition = {
        type: TaskDefinitionType.NEW_TASK,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
        id: 1 as any,
        description: "task description",
        action: async () => {},
        options: {},
        positionalArguments: [],
      };

      const task2: NewTaskDefinition = {
        type: TaskDefinitionType.NEW_TASK,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
        id: [1] as any,
        description: "task description",
        action: async () => {},
        options: {},
        positionalArguments: [],
      };

      assert.deepEqual(validateNewTask(task, []), [
        {
          message: "task id must be an array of strings",
          path: ["id"],
        },
      ]);

      assert.deepEqual(validateNewTask(task2, []), [
        {
          message: "task id must be an array of strings",
          path: ["id"],
        },
      ]);
    });

    it("should return an error if the task description is not a string", function () {
      const task: NewTaskDefinition = {
        type: TaskDefinitionType.NEW_TASK,
        id: ["task-id"],
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
        description: 1 as any,
        action: async () => {},
        options: {},
        positionalArguments: [],
      };

      assert.deepEqual(validateNewTask(task, []), [
        {
          message: "task description must be a string",
          path: ["description"],
        },
      ]);
    });

    it("should return an error if the task action is not a function or a lazy function", function () {
      const task: NewTaskDefinition = {
        type: TaskDefinitionType.NEW_TASK,
        id: ["task-id"],
        description: "task description",
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
        action: 1 as any,
        options: {},
        positionalArguments: [],
      };

      assert.deepEqual(validateNewTask(task, []), [
        {
          message: "task action must be a function or a lazy action object",
          path: ["action"],
        },
      ]);
    });

    it("should return an error if the task options is not a non-null object", function () {
      const task: NewTaskDefinition = {
        type: TaskDefinitionType.NEW_TASK,
        id: ["task-id"],
        description: "task description",
        action: async () => {},
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
        options: 1 as any,
        positionalArguments: [],
      };

      assert.deepEqual(validateNewTask(task, []), [
        {
          message: "task options must be an object",
          path: ["options"],
        },
      ]);
    });

    it("should return an error if the task positionalArguments is not an array", function () {
      const task: NewTaskDefinition = {
        type: TaskDefinitionType.NEW_TASK,
        id: ["task-id"],
        description: "task description",
        action: async () => {},
        options: {},
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
        positionalArguments: 1 as any,
      };

      assert.deepEqual(validateNewTask(task, []), [
        {
          message: "task positionalArguments must be an array",
          path: ["positionalArguments"],
        },
      ]);
    });
  });

  describe("validateTaskOverride", function () {
    it("should return an empty array if the task override is valid", function () {
      const task: TaskOverrideDefinition = {
        type: TaskDefinitionType.TASK_OVERRIDE,
        id: ["task-id"],
        description: "task description",
        action: async () => {},
        options: {},
      };

      assert.deepEqual(validateTaskOverride(task, []), []);
    });

    it("should return an error if the task id is not an array of strings", function () {
      const task: TaskOverrideDefinition = {
        type: TaskDefinitionType.TASK_OVERRIDE,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
        id: 1 as any,
        description: "task description",
        action: async () => {},
        options: {},
      };

      const task2: TaskOverrideDefinition = {
        type: TaskDefinitionType.TASK_OVERRIDE,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
        id: [1] as any,
        description: "task description",
        action: async () => {},
        options: {},
      };

      assert.deepEqual(validateTaskOverride(task, []), [
        {
          message: "task id must be an array of strings",
          path: ["id"],
        },
      ]);

      assert.deepEqual(validateTaskOverride(task2, []), [
        {
          message: "task id must be an array of strings",
          path: ["id"],
        },
      ]);
    });

    it("should return an error if the task description is not a string", function () {
      const task: TaskOverrideDefinition = {
        type: TaskDefinitionType.TASK_OVERRIDE,
        id: ["task-id"],
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
        description: 1 as any,
        action: async () => {},
        options: {},
      };

      assert.deepEqual(validateTaskOverride(task, []), [
        {
          message: "task description must be a string",
          path: ["description"],
        },
      ]);
    });

    it("should return an error if the task action is not a function or lazy function", function () {
      const task: TaskOverrideDefinition = {
        type: TaskDefinitionType.TASK_OVERRIDE,
        id: ["task-id"],
        description: "task description",
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
        action: 1 as any,
        options: {},
      };

      assert.deepEqual(validateTaskOverride(task, []), [
        {
          message: "task action must be a function or a lazy action object",
          path: ["action"],
        },
      ]);
    });

    it("should return an error if the task options is not a non-null object", function () {
      const task: TaskOverrideDefinition = {
        type: TaskDefinitionType.TASK_OVERRIDE,
        id: ["task-id"],
        description: "task description",
        action: async () => {},
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
        options: 1 as any,
      };

      assert.deepEqual(validateTaskOverride(task, []), [
        {
          message: "task options must be an object",
          path: ["options"],
        },
      ]);
    });
  });

  describe("validatePaths", function () {
    describe("when the paths are valid", function () {
      it("should work when all the paths are strings", async function () {
        const paths: Required<ProjectPathsUserConfig> = {
          cache: "./cache",
          artifacts: "./artifacts",
          tests: "./tests",
          sources: "./sources",
        };

        const validationErrors = validatePaths(paths);

        assert.equal(validationErrors.length, 0);
      });

      it("should work when the sources property is an array", async function () {
        const paths: ProjectPathsUserConfig = {
          sources: ["./sources", "./sources2"],
        };

        const validationErrors = validatePaths(paths);

        assert.equal(validationErrors.length, 0);
      });

      it("should work when the tests and sources properties are both objects", async function () {
        // Objects are not validated because they are customizable by the user
        const paths: ProjectPathsUserConfig = {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
          tests: { randomProperty: "randomValue" } as TestPathsUserConfig,
          sources: {},
        };

        const validationErrors = validatePaths(paths);

        assert.equal(validationErrors.length, 0);
      });
    });

    describe("when the paths are not valid", function () {
      it("should return an error when the cache path is not a string", async function () {
        const paths: ProjectPathsUserConfig = {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
          cache: 123 as any,
        };

        const validationErrors = validatePaths(paths);

        assert.equal(validationErrors.length, 1);
        assert.deepEqual(validationErrors[0].path, ["paths", "cache"]);
        assert.equal(
          validationErrors[0].message,
          "paths.cache must be a string",
        );
      });

      it("should return an error when the artifacts path is not a string", async function () {
        const paths: ProjectPathsUserConfig = {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
          artifacts: 123 as any,
        };

        const validationErrors = validatePaths(paths);

        assert.equal(validationErrors.length, 1);
        assert.deepEqual(validationErrors[0].path, ["paths", "artifacts"]);
        assert.equal(
          validationErrors[0].message,
          "paths.artifacts must be a string",
        );
      });

      it("should return an error when the tests path is not a string", async function () {
        const paths: ProjectPathsUserConfig = {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
          tests: 123 as any,
        };

        const validationErrors = validatePaths(paths);

        assert.equal(validationErrors.length, 1);
        assert.deepEqual(validationErrors[0].path, ["paths", "tests"]);
        assert.equal(
          validationErrors[0].message,
          "paths.tests must be a string",
        );
      });

      it("should return an error when the sources path is not a string", async function () {
        const paths: ProjectPathsUserConfig = {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
          sources: 123 as any,
        };

        const validationErrors = validatePaths(paths);

        assert.equal(validationErrors.length, 1);
        assert.deepEqual(validationErrors[0].path, ["paths", "sources"]);
        assert.equal(
          validationErrors[0].message,
          "paths.sources must be a string",
        );
      });

      it("should return an error when one of the source paths in the array are not strings", async function () {
        const paths: ProjectPathsUserConfig = {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
          sources: ["./sources", 123 as any],
        };

        const validationErrors = validatePaths(paths);

        assert.equal(validationErrors.length, 1);
        assert.deepEqual(validationErrors[0].path, ["paths", "sources", 1]);
        assert.equal(
          validationErrors[0].message,
          "paths.sources at index 1 must be a string",
        );
      });
    });
  });

  describe("validateTasksConfig", function () {
    it("should return an error if a task is not a valid task definition", function () {
      const tasks: TaskDefinition[] = [
        {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
          type: "invalid" as any,
          id: ["task-id"],
          action: async () => {},
          options: {},
        },
      ];

      assert.deepEqual(validateTasksConfig(tasks, []), [
        {
          message: "tasks must be an array of TaskDefinitions",
          path: ["tasks", 0],
        },
      ]);
    });
  });

  describe("validatePluginsConfig", function () {
    it("should not throw when the npmPackage is a string", function () {
      const plugins: HardhatPlugin[] = [
        {
          id: "plugin-id",
          npmPackage: "npm-package",
        },
      ];

      assert.deepEqual(validatePluginsConfig(plugins, []), []);
    });

    it("should not throw when the npmPackage is null", function () {
      const plugins: HardhatPlugin[] = [
        {
          id: "plugin-id",
          npmPackage: null,
        },
      ];

      assert.deepEqual(validatePluginsConfig(plugins, []), []);
    });

    it("should not throw when the npmPackage is undefined", function () {
      const plugins: HardhatPlugin[] = [
        {
          id: "plugin-id",
          npmPackage: undefined,
        },
      ];

      assert.deepEqual(validatePluginsConfig(plugins, []), []);
    });

    it("should return an error if a plugin is not a non-null object", function () {
      const plugins: HardhatPlugin[] = [
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
        1 as any,
      ];

      assert.deepEqual(validatePluginsConfig(plugins, []), [
        {
          message: "plugins must be an array of PluginDefinitions",
          path: ["plugins", 0],
        },
      ]);
    });

    it("should return an error if the plugin id is not a string", function () {
      const plugins: HardhatPlugin[] = [
        {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
          id: 1 as any,
        },
      ];

      assert.deepEqual(validatePluginsConfig(plugins, []), [
        {
          message: "plugin id must be a string",
          path: ["plugins", 0, "id"],
        },
      ]);
    });

    it("should return an error if the plugin npmPackage is not a string", function () {
      const plugins: HardhatPlugin[] = [
        {
          id: "plugin-id",
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
          npmPackage: 1 as any,
        },
      ];

      assert.deepEqual(validatePluginsConfig(plugins, []), [
        {
          message: "plugin npmPackage must be a string",
          path: ["plugins", 0, "npmPackage"],
        },
      ]);
    });

    it("should return an error if the plugin dependencies is not an function returning an array", function () {
      const plugins: HardhatPlugin[] = [
        {
          id: "plugin-id",
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
          dependencies: 1 as any,
        },
      ];

      assert.deepEqual(validatePluginsConfig(plugins, []), [
        {
          message: "plugin dependencies must be a function returning an array",
          path: ["plugins", 0, "dependencies"],
        },
      ]);
    });

    it("should return an error if the plugin dependencies is not an function returning an array of functions", function () {
      const plugins: HardhatPlugin[] = [
        {
          id: "plugin-id",
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
          dependencies: [1] as any,
        },
      ];

      assert.deepEqual(validatePluginsConfig(plugins, []), [
        {
          message: "plugin dependencies must be a function returning an array",
          path: ["plugins", 0, "dependencies"],
        },
      ]);
    });

    it("should return an error if the plugin hookHandlers is not a non-null object", function () {
      const plugins: HardhatPlugin[] = [
        {
          id: "plugin-id",
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
          hookHandlers: 1 as any,
        },
      ];

      assert.deepEqual(validatePluginsConfig(plugins, []), [
        {
          message: "plugin hookHandlers must be an object",
          path: ["plugins", 0, "hookHandlers"],
        },
      ]);
    });

    it("should return an error if the plugin hookHandlers is not an object of functions", function () {
      const plugins: HardhatPlugin[] = [
        {
          id: "plugin-id",
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
          hookHandlers: { invalid: 1 } as any,
        },
      ];

      assert.deepEqual(validatePluginsConfig(plugins, []), [
        {
          message:
            "plugin hookHandlers must be an object of functions or strings",
          path: ["plugins", 0, "hookHandlers", "invalid"],
        },
      ]);
    });

    it("should return an error if the plugin globalOptions is not an array", function () {
      const plugins: HardhatPlugin[] = [
        {
          id: "plugin-id",
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
          globalOptions: 1 as any,
        },
      ];

      assert.deepEqual(validatePluginsConfig(plugins, []), [
        {
          message: "plugin globalOptions must be an array",
          path: ["plugins", 0, "globalOptions"],
        },
      ]);
    });

    it("should return an error if the plugin tasks is not an array", function () {
      const plugins: HardhatPlugin[] = [
        {
          id: "plugin-id",
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
          tasks: 1 as any,
        },
      ];

      assert.deepEqual(validatePluginsConfig(plugins, []), [
        {
          message: "plugin tasks must be an array",
          path: ["plugins", 0, "tasks"],
        },
      ]);
    });
  });

  describe("collectValidationErrorsForUserConfig", function () {
    it("should return an empty array if the config is valid", function () {
      const config = {
        paths: {},
        tasks: [],
        plugins: [],
      };

      assert.deepEqual(collectValidationErrorsForUserConfig(config), []);
    });

    it("should return an error if the paths are not an object", function () {
      const config: HardhatUserConfig = {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
        paths: 1 as any,
        tasks: [],
        plugins: [],
      };

      assert.deepEqual(collectValidationErrorsForUserConfig(config), [
        {
          message: "paths must be an object",
          path: ["paths"],
        },
      ]);
    });

    it("should return an error if the tasks is not an array", function () {
      const config: HardhatUserConfig = {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
        tasks: 1 as any,
        plugins: [],
      };

      assert.deepEqual(collectValidationErrorsForUserConfig(config), [
        {
          message: "tasks must be an array",
          path: ["tasks"],
        },
      ]);
    });

    it("should return an error if the plugins is not an array", function () {
      const config: HardhatUserConfig = {
        tasks: [],
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing validations for js users who can bypass type checks */
        plugins: 1 as any,
      };

      assert.deepEqual(collectValidationErrorsForUserConfig(config), [
        {
          message: "plugins must be an array",
          path: ["plugins"],
        },
      ]);
    });
  });
});
