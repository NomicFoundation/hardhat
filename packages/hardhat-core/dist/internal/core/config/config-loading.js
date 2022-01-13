"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeModuleNotFoundError = exports.loadConfigAndTasks = exports.resolveConfigPath = void 0;
const chalk_1 = __importDefault(require("chalk"));
const debug_1 = __importDefault(require("debug"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const semver_1 = __importDefault(require("semver"));
const context_1 = require("../../context");
const solidityTracer_1 = require("../../hardhat-network/stack-traces/solidityTracer");
const packageInfo_1 = require("../../util/packageInfo");
const errors_1 = require("../errors");
const errors_list_1 = require("../errors-list");
const project_structure_1 = require("../project-structure");
const config_resolution_1 = require("./config-resolution");
const config_validation_1 = require("./config-validation");
const default_config_1 = require("./default-config");
const log = (0, debug_1.default)("hardhat:core:config");
function importCsjOrEsModule(filePath) {
    const imported = require(filePath);
    return imported.default !== undefined ? imported.default : imported;
}
function resolveConfigPath(configPath) {
    if (configPath === undefined) {
        configPath = (0, project_structure_1.getUserConfigPath)();
    }
    else {
        if (!path_1.default.isAbsolute(configPath)) {
            configPath = path_1.default.join(process.cwd(), configPath);
            configPath = path_1.default.normalize(configPath);
        }
    }
    return configPath;
}
exports.resolveConfigPath = resolveConfigPath;
function loadConfigAndTasks(hardhatArguments, { showEmptyConfigWarning = false, showSolidityConfigWarnings = false, } = {
    showEmptyConfigWarning: false,
    showSolidityConfigWarnings: false,
}) {
    let configPath = hardhatArguments !== undefined ? hardhatArguments.config : undefined;
    configPath = resolveConfigPath(configPath);
    log(`Loading Hardhat config from ${configPath}`);
    // Before loading the builtin tasks, the default and user's config we expose
    // the config env in the global object.
    const configEnv = require("./config-env");
    const globalAsAny = global;
    Object.entries(configEnv).forEach(([key, value]) => (globalAsAny[key] = value));
    const ctx = context_1.HardhatContext.getHardhatContext();
    ctx.setConfigLoadingAsStarted();
    let userConfig;
    try {
        require("../tasks/builtin-tasks");
        userConfig = importCsjOrEsModule(configPath);
    }
    catch (e) {
        analyzeModuleNotFoundError(e, configPath);
        // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
        throw e;
    }
    finally {
        ctx.setConfigLoadingAsFinished();
    }
    if (showEmptyConfigWarning) {
        checkEmptyConfig(userConfig, { showSolidityConfigWarnings });
    }
    (0, config_validation_1.validateConfig)(userConfig);
    if (showSolidityConfigWarnings) {
        checkMissingSolidityConfig(userConfig);
    }
    // To avoid bad practices we remove the previously exported stuff
    Object.keys(configEnv).forEach((key) => (globalAsAny[key] = undefined));
    const frozenUserConfig = deepFreezeUserConfig(userConfig);
    const resolved = (0, config_resolution_1.resolveConfig)(configPath, userConfig);
    for (const extender of context_1.HardhatContext.getHardhatContext().configExtenders) {
        extender(resolved, frozenUserConfig);
    }
    if (showSolidityConfigWarnings) {
        checkUnsupportedSolidityConfig(resolved);
        checkUnsupportedRemappings(resolved);
    }
    return resolved;
}
exports.loadConfigAndTasks = loadConfigAndTasks;
function deepFreezeUserConfig(config, propertyPath = []) {
    if (typeof config !== "object" || config === null) {
        return config;
    }
    return new Proxy(config, {
        get(target, property, receiver) {
            return deepFreezeUserConfig(Reflect.get(target, property, receiver), [
                ...propertyPath,
                property,
            ]);
        },
        set(target, property, _value, _receiver) {
            throw new errors_1.HardhatError(errors_list_1.ERRORS.GENERAL.USER_CONFIG_MODIFIED, {
                path: [...propertyPath, property]
                    .map((pathPart) => pathPart.toString())
                    .join("."),
            });
        },
    });
}
/**
 * Receives an Error and checks if it's a MODULE_NOT_FOUND and the reason that
 * caused it.
 *
 * If it can infer the reason, it throws an appropiate error. Otherwise it does
 * nothing.
 */
function analyzeModuleNotFoundError(error, configPath) {
    var _a;
    const stackTraceParser = require("stacktrace-parser");
    if (error.code !== "MODULE_NOT_FOUND") {
        return;
    }
    const stackTrace = stackTraceParser.parse(error.stack);
    const throwingFile = stackTrace
        .filter((x) => x.file !== null)
        .map((x) => x.file)
        .find((x) => path_1.default.isAbsolute(x));
    if (throwingFile === null || throwingFile === undefined) {
        return;
    }
    // if the error comes from the config file, we ignore it because we know it's
    // a direct import that's missing
    if (throwingFile === configPath) {
        return;
    }
    const packageJsonPath = (0, packageInfo_1.findClosestPackageJson)(throwingFile);
    if (packageJsonPath === null) {
        return;
    }
    const packageJson = fs_extra_1.default.readJsonSync(packageJsonPath);
    const peerDependencies = (_a = packageJson.peerDependencies) !== null && _a !== void 0 ? _a : {};
    if (peerDependencies["@nomiclabs/buidler"] !== undefined) {
        throw new errors_1.HardhatError(errors_list_1.ERRORS.PLUGINS.BUIDLER_PLUGIN, {
            plugin: packageJson.name,
        });
    }
    // if the problem doesn't come from a hardhat plugin, we ignore it
    if (peerDependencies.hardhat === undefined) {
        return;
    }
    const missingPeerDependencies = {};
    for (const [peerDependency, version] of Object.entries(peerDependencies)) {
        const peerDependencyPackageJson = readPackageJson(peerDependency);
        if (peerDependencyPackageJson === undefined) {
            missingPeerDependencies[peerDependency] = version;
        }
    }
    const missingPeerDependenciesNames = Object.keys(missingPeerDependencies);
    if (missingPeerDependenciesNames.length > 0) {
        throw new errors_1.HardhatError(errors_list_1.ERRORS.PLUGINS.MISSING_DEPENDENCIES, {
            plugin: packageJson.name,
            missingDependencies: missingPeerDependenciesNames.join(", "),
            missingDependenciesVersions: Object.entries(missingPeerDependencies)
                .map(([name, version]) => `"${name}@${version}"`)
                .join(" "),
        });
    }
}
exports.analyzeModuleNotFoundError = analyzeModuleNotFoundError;
function readPackageJson(packageName) {
    try {
        const packageJsonPath = require.resolve(path_1.default.join(packageName, "package.json"));
        return require(packageJsonPath);
    }
    catch (_a) {
        return undefined;
    }
}
function checkEmptyConfig(userConfig, { showSolidityConfigWarnings }) {
    if (userConfig === undefined || Object.keys(userConfig).length === 0) {
        let warning = `Hardhat config is returning an empty config object, check the export from the config file if this is unexpected.\n`;
        // This 'learn more' section is also printed by the solidity config warning,
        // so we need to check to avoid printing it twice
        if (!showSolidityConfigWarnings) {
            warning += `\nLearn more about configuring Hardhat at https://hardhat.org/config\n`;
        }
        console.warn(chalk_1.default.yellow(warning));
    }
}
function checkMissingSolidityConfig(userConfig) {
    if (userConfig.solidity === undefined) {
        console.warn(chalk_1.default.yellow(`Solidity compiler is not configured. Version ${default_config_1.DEFAULT_SOLC_VERSION} will be used by default. Add a 'solidity' entry to your configuration to suppress this warning.

Learn more about compiler configuration at https://hardhat.org/config
`));
    }
}
function checkUnsupportedSolidityConfig(resolvedConfig) {
    const compilerVersions = resolvedConfig.solidity.compilers.map((x) => x.version);
    const overrideVersions = Object.values(resolvedConfig.solidity.overrides).map((x) => x.version);
    const solcVersions = [...compilerVersions, ...overrideVersions];
    const unsupportedVersions = [];
    for (const solcVersion of solcVersions) {
        if (!semver_1.default.satisfies(solcVersion, solidityTracer_1.SUPPORTED_SOLIDITY_VERSION_RANGE)) {
            unsupportedVersions.push(solcVersion);
        }
    }
    if (unsupportedVersions.length > 0) {
        console.warn(chalk_1.default.yellow(`Solidity ${unsupportedVersions.join(", ")} ${unsupportedVersions.length === 1 ? "is" : "are"} not fully supported yet. You can still use Hardhat, but some features, like stack traces, might not work correctly.

Learn more at https://hardhat.org/reference/solidity-support
`));
    }
}
function checkUnsupportedRemappings({ solidity }) {
    const solcConfigs = [
        ...solidity.compilers,
        ...Object.values(solidity.overrides),
    ];
    const remappings = solcConfigs.filter(({ settings }) => settings.remappings !== undefined);
    if (remappings.length > 0) {
        console.warn(chalk_1.default.yellow(`Solidity remappings are not currently supported; you may experience unexpected compilation results. Remove any 'remappings' fields from your configuration to suppress this warning.

Learn more about compiler configuration at https://hardhat.org/config
`));
    }
}
//# sourceMappingURL=config-loading.js.map