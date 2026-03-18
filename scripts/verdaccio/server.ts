// WARNING: You should not be running this script directly, this is a
// programmatic entry point for verdaccio to avoid the deprecated CLI bootstrap.
import { runServer } from "verdaccio";

const [configPath, host, portStr] = process.argv.slice(2);
const port = parseInt(portStr, 10);

const server = await runServer(configPath, {
  listenArg: `${host}:${port}`,
});

server.listen(port, host);
