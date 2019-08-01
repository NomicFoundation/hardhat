import path from "path";

import { loadPluginFile } from "../plugins";

export default function() {
  loadPluginFile(
    path.join(__dirname, "..", "..", "..", "builtin-tasks", "clean")
  );

  loadPluginFile(
    path.join(__dirname, "..", "..", "..", "builtin-tasks", "compile")
  );

  loadPluginFile(
    path.join(__dirname, "..", "..", "..", "builtin-tasks", "console")
  );

  loadPluginFile(
    path.join(__dirname, "..", "..", "..", "builtin-tasks", "flatten")
  );

  loadPluginFile(
    path.join(__dirname, "..", "..", "..", "builtin-tasks", "help")
  );

  loadPluginFile(
    path.join(__dirname, "..", "..", "..", "builtin-tasks", "run")
  );

  loadPluginFile(
    path.join(__dirname, "..", "..", "..", "builtin-tasks", "test")
  );
}
