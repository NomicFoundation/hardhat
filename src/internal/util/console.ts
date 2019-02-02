export function isNodeCalledWithoutAScript() {
  const script = process.argv[1];
  return script === undefined || script.trim() === "";
}

/**
 * Starting at node 10, proxies are shown in the console by default, instead
 * of actually inspecting them. This makes all our lazy loading efforts wicked,
 * so we disable it ni buidler/register.
 */
export function disableReplWriterShowProxy() {
  const repl = require("repl");

  if (repl.writer.options) {
    Object.defineProperty(repl.writer.options, "showProxy", {
      value: false,
      writable: false,
      configurable: false
    });
  }
}
