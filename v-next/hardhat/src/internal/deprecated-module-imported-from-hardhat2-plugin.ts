// This is an empty module that is used to exported it with a subpath that's
// commonly used by Hardhat 2 plugins. This is to avoid the plugins breaking
// when the `require` it, so that they have an opportunity to run a function
// that throws a better error message.

// The reason this module can be empty is that Hardhat 2 plugins are CJS modules
// so they can destructure the require and get `undefined` values, instead of
// a load-time error.
