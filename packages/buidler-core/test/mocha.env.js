// From: https://github.com/mochajs/mocha/issues/185#issuecomment-321566188

/*
 * Force ts-node to skip compilation, for test environment.
 * This is useful for package-level or even individual-level testing,
 * since this config is already provided in the project root global test runner.
 */
process.env.TS_NODE_TRANSPILE_ONLY = "true";
