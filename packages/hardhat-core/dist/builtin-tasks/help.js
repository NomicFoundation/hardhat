"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const HelpPrinter_1 = require("../internal/cli/HelpPrinter");
const constants_1 = require("../internal/constants");
const config_env_1 = require("../internal/core/config/config-env");
const hardhat_params_1 = require("../internal/core/params/hardhat-params");
const packageInfo_1 = require("../internal/util/packageInfo");
const task_names_1 = require("./task-names");
(0, config_env_1.task)(task_names_1.TASK_HELP, "Prints this message")
    .addOptionalPositionalParam("task", "An optional task to print more info about")
    .setAction(async ({ task: taskName }, { tasks }) => {
    const packageJson = await (0, packageInfo_1.getPackageJson)();
    const helpPrinter = new HelpPrinter_1.HelpPrinter(constants_1.HARDHAT_NAME, constants_1.HARDHAT_EXECUTABLE_NAME, packageJson.version, hardhat_params_1.HARDHAT_PARAM_DEFINITIONS, tasks);
    if (taskName !== undefined) {
        helpPrinter.printTaskHelp(taskName);
        return;
    }
    helpPrinter.printGlobalHelp();
});
//# sourceMappingURL=help.js.map