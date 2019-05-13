import { loadPluginFile } from "../plugins";

export default function() {
  loadPluginFile(__dirname + "/../../../builtin-tasks/clean");
  loadPluginFile(__dirname + "/../../../builtin-tasks/compile");
  loadPluginFile(__dirname + "/../../../builtin-tasks/console");
  loadPluginFile(__dirname + "/../../../builtin-tasks/flatten");
  loadPluginFile(__dirname + "/../../../builtin-tasks/help");
  loadPluginFile(__dirname + "/../../../builtin-tasks/run");
  loadPluginFile(__dirname + "/../../../builtin-tasks/test");
}
