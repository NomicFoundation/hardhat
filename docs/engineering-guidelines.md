# Hardhat engineering guidelines

# Architectural guidelines

## A1: `hardhat/src/core/` shouldn’t contain any application-level logic

The intention behind the current separation of part of `hardhat` into the `core/` directory is:

1. To only include the minimal infrastructure which Hardhat is built on top of in `core`: config, tasks, hooks, global options, and user interruptions.
2. For the rest of `hardhat` to use `core` to implement any functionality related to Ethereum, Solidity, testing, etc.
3. For plugins to integrate with `hardhat`, and not `core`.

## A2: No imports nor logic in the plugins’ `index.ts` files

The entry-point of the plugins are meant to only export a description of the plugin, and not implement any functionality. Please don’t import anything in those files.

The only accepted imports are: their `type-extension.ts`, hardhat types, and the `"/config"` module from hardhat.

## A3: Always initialize the HRE using the `hre-initialization` module inside of `hardhat`

If you are working on the `hardhat` package, and you need an instance of the HRE, use the `hre-initialization` module instead of using the package’s entry-point modules (e.g. `src/index.ts` and `src/hre.ts`), or the `HardhatRuntimeEnvironmentImplementation` directly.

Doing this ensures that the initialization is run correctly and in a consistent way. For example, by resolving the config correctly and loading the builtin plugins.

The exception to this rule are the tests of `src/core`, which must use the `HardhatRuntimeEnvironmentImplementation.create` factory directly, as they shouldn’t include the built-in plugins.

## A4: Barrel files, imports, and re-exports

A barrel file in JavaScript is a single file that consolidates exports from multiple modules.

We only use barrel files to export things to consumers of each package, but not within the package.

This has two practical implications:

1. Re-exports should only be allowed in the modules that are included in `package.json#exports`
2. We should always import things from the file that defines them, not from files that re-export them.

We should also avoid placing logic or type definitions in the barrel files, but just re-export things.

The objective behind this rules are to be consistent within the codebase, spend less time thinking about how to import things, and avoid some performance issues that barrel files can cause.

## A5: Public APIs and `src/internal/` folders

Each of the packages has their code in a `src/`. Anything that’s in that folder and not inside `src/internal` should be considered a public API. This means that:

- It should probably be included in `package.json#exports`
- It should be carefully reviewed, with a special focus on backwards compatibility (post-initial-release)
- It should not be expanded (i.e. add new exports and/or files) without discussing it with the rest of the team

## A6: Don’t expose the Hook system everywhere

When writing a plugin, you may find yourself in a situation where a domain object needs to execute a hook. The simplest way to do that would be to keep a reference to the `HookManager`. While it may be tempting, it leads to unnecessary coupling of the system and makes it hard to test.

Instead of doing that, you accept a callback in your domain object constructor, and pass a callback that uses the `HookManager` there.

For example, instead of keeping references to the `HookManager` in each `NetworkConnection` to run a chain of `HookHandler`s, we only interact with the `HookManager` in the `NetworkManager`, and pass a callback with this type to the `NetworkConnection`'s constructor:

```tsx
export type JsonRpcRequestWrapperFunction = (
  request: JsonRpcRequest,
  defaultBehavior: (r: JsonRpcRequest) => Promise<JsonRpcResponse>,
) => Promise<JsonRpcResponse>;
```

which we use like this:

```tsx
const wrapper: JsonRpcRequestWrapperFunction = (request, defaultBehavior) =>
  hookManager.runHandlerChain(
    "network",
    "onRequest",
    [networkConnection, request],
    async (_context, _connection, req) => defaultBehavior(req),
  );
```

# General Coding guidelines

## GC1: Do not use `node:fs` directly

If you need to access the file system, please use our `fs` utilities instead, as the `node:fs` module has several shortcomings that make it error-prone and hard to debug when it fails. For example, its errors don’t have stack traces (!).

If you need a file system related piece of functionality that we haven’t implemented, please raise it with the team.

## GC2: Do not use object literals to construct or mock complex types

In TypeScript you can always initialize an object of a certain type with an object literal. We should never do that for our main domain types nor larger ones. Instead, we should provide constructors and/or factories for each complex type, and use that everywhere.

There are many reasons for this, the main ones being that (1) without using constructors/factories there’s no way to ensure that the object’s internal state is correct, and (2) the codebase becomes brittle (e.g. a small change in a type may require changing dozens of files).

This is also valid for tests, where things can easily become super brittle by using object literals.

## GC3: top-level imports vs dynamic imports

Hardhat v3’s plugin system was designed so that plugin hooks and task actions are lazy loaded. This means that within them, we can use top-level imports, and we aren’t restricted to dynamic imports, like we were in v2.

Please apply your own criteria when:

- Importing dependencies known to load slowly.
- The import is in a file that’s always loaded (e.g. it gets loaded if you run `pnpm hardhat --help`).

# Testing guidelines

## T1: Do not use fixture projects unless they are needed

Hardhat v2 was mostly tested using fixture projects, as its initialization was tied to having a config file present in the file system. In Hardhat v3, that’s not needed, and the HRE can be manually initialized using `createHardhatRuntimeEnvironment`.

There are exceptions to this rule, as parts of the functionality of Hardhat do require a certain file-system structure (e.g. compiling a project, or using mocha to run test files), but those should be the exception.

## T2: Test error codes or types, not messages

Building assertions based on error messages is fragile, as error messages are part of the UI of the system, which we may change independently from the actual behavior of the system. Instead of asserting error messages, assert error codes (e.g. using the `HardhatError` assertion helpers), or error types when appropriate.

The exception to this is when we want to ensure that the messages look as expected, but those tests should focus on that, and not on testing the application behavior. For example, we may want to ensure that the HTTP provider error messages are backwards compatible with v2.

## T3: Don’t use the global HRE to test plugins

In Hardhat v2 we used to tests plugins by importing `hardhat` and using the global instance of the Hardhat Runtime Environment that it created. In v3 we should avoid this and create the HRE explicitly, so that we can create multiple instances of it without resorting to hacky reset processes.

This can be done with:

```tsx
import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";

const { default: hardhatConfig } = await import("./my/hardhat.config.js");
const hre = await createHardhatRuntimeEnvironment(hardhatConfig);
```

## T4: Avoid mocking internal behavior via monkey-patching

Most javascript test frameworks have functionality that can be used to mock the internal behavior of a module, for example, by replacing how an `import` behaves or monkey-patching a library.

Instead of doing that, design your code so that it can be mocked without having to resort to those techniques. For example, by using [IoC](https://en.wikipedia.org/wiki/Inversion_of_control).

## T5: Prioritize integration test over excessive mocking

Some parts of Hardhat have deep interconnections with each other, so testing them in isolation can be challenging. For example, initializing a `TaskManager` in isolation can be challenging.

In those cases, use a higher level concept to build your tests in an integration-like fashion, instead of mocking extensive parts of the system. This makes the codebase less brittle, easier to understand, and decreases the possibility of the tests giving false results due to mocking errors.

Make sure to pick the lowest level concept that allows you to build the test though, instead of always using the highest possible concepts (e.g. using the HRE instead of creating an entire on-disk project).

If such a higher level concept doesn’t exist, consider creating it yourself, or discuss it with the rest of the team.

# Dependency Management guidelines

## DM1: Minimize the amount of dependencies

The npm ecosystem is susceptible to [supply chain attacks](https://en.wikipedia.org/wiki/Supply_chain_attack), and the Ethereum ecosystem has been a target of them in the past. Adding dependencies means increasing that attack surface.

If you feel you need to add a dependency, please discuss it first with the team.

## DM2: `dependencies` vs `peerDependencies`

_If you are not familiar with this topic, [please take the time to read this article in detail](https://lexi-lambda.github.io/blog/2016/08/24/understanding-the-npm-dependency-model/)._

Most of our internal dependencies should be `peerDependencies`, as we want to ensure that we share the same installation/copy of each plugin/library/hardhat.

Some exceptions are:

- `hardhat-errors` should be used as a dependency. This is an exception to the rule, and was specially design to work as such.
- `hardhat-utils` should be a dependency, as we can live with multiple versions/copies of it.
- `hardhat-zod-utils` should be a dependency, for the same reason as above.
- `hardhat-test-utils` should be a devDependency, as it’s only used for testing.

## DM3: Handling `peerDependencies` in a pnpm monorepo

`pnpm` and `npm` automatically install `peerDependencies`. This means that when you install a dependency, its `peerDependencies` will be installed as if they were dependencies of your project.

Unfortunately, there’s an exception to this. When you install a `workspace:` dependency in pnpm, it won’t auto-install its `peerDependencies`. To workaround this, whenever you add a `workspace:` peer dependency, you should also add its `peerDependencies` as `devDependencies`.

For example, if we have workspace package `A` with `peerDependencies` `p1` and `p2`, and we want to install `A` as a peer dependency in our workspace package `B`, we need to:

1. Install `"A": "workspace:..."` as a peer dependency.
2. Install `p1` and `p2` as `devDependencies`.

## DM4: Plugin dependencies

Plugins should have `hardhat` as a peer dependency.

If they use another plugin, it should be installed as a peer dependency.

# Naming Guidelines

## N1: Interface and interface implementation

We tend to name the interface as `TheInterface` while the implementation of that interface would be `TheInterfaceImplementation`.

This changed to how we approached naming in v2, where our interfaces would often be prefixed with `I` as in `ITheInterface`.

# Error Guidelines

## E1: Use `HardhatError` in `hardhat` and Nomic plugins

We are intentional when we raise errors across all our packages. New errors should be declared within `hardhat-errors` and used from there. This ensures all errors have an error code and documentation that is displayed on the website.

Exceptions to this rule:

1. Using `hardhat-errors` would create a circular dependency
2. JSON-RPC specific errors, where we throw `ProviderError`.
3. Things that are too low-level, like "-utils". But naturally low level, not just shared, like in this case.
4. The encryption module of the keystore has an exception, because we want it to be self-contained and easy to read/audit.
