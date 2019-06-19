import path from "path";
import fetch from "node-fetch";
import Docker from "dockerode";
const exec = require("child_process").exec;

// Things we should check:
//
// [x] Detecting if Docker Desktop is installed
//      - Current way is not windows-compatible
// [x] Detecting if Docker Desktop is running
// [ ] Detecting if the users hasn't logged in to Docker
//      - It's a bit unclear how to do this
// [x] Detecting if an image has already been pulled
// [x] Detecting if an image doesn't exist in docker hub
//      - Maybe there's a better way of doing this
// [x] Pulling images
// [ ] Detecting if a port is busy
//      - Solutions for this seem somewhat extreme:
//          https://stackoverflow.com/questions/19129570/how-can-i-check-if-port-is-busy-in-nodejs
// [ ] Running images
//     [ ] Piping to stdin
//          - Ask Pato (Not needed for vyper plugin)
//     [x] Mounting folders
//     [x] Forwarding ports
//     [ ] Starting and stopping long running processes
//          - I'm not sure how to go about this, I suppose a use case for this would be
//            handling ganache instances. Perhaps we can just return the dockerode container instance in `runImage`

interface Image {
  tag: string;
  repository: string;
}

const docker = new Docker();

export async function isDockerInstalled(): Promise<boolean> {
  const error = await new Promise(resolve =>
    exec("which docker", (error?: any) => resolve(error))
  );

  return error === null;
}

export async function isDockerRunning(): Promise<boolean> {
  const result = await docker.ping();

  return result === "OK";
}

export async function pullImage({ repository, tag }: Image) {
  docker.pull(formatImage({ repository, tag }), {}).then((data: any) => {
    data.pipe(process.stdout);
  });
}

export async function hasImage({ repository, tag }: Image) {
  const images = await docker.listImages();

  return images.some(image =>
    image.RepoTags.some(
      (repoAndTag: string) => repoAndTag === `${repository}:${tag}`
    )
  );
}

export async function imageExists({
  repository,
  tag
}: Image): Promise<boolean> {
  const res = await fetch(
    `https://hub.docker.com/v2/repositories/${repository}/${tag}/tags/`
  );
  return res.ok;
}

type Config = {
  volumes?: string[];
  portBindings?: string[];
};

export async function runImage({
  repository,
  tag,
  command,
  config
}: {
  repository: string;
  tag: string;
  command: string;
  config: Config;
}) {
  const docker = new Docker();

  const dockerodeOptions = {
    HostConfig: {
      Binds: config.volumes,
      PortBindings:
        config.portBindings && formatPortBindings(config.portBindings)
    }
  };

  return docker.run(
    formatImage({ tag, repository }),
    formatCommandForDockerode(command),
    process.stdout,
    dockerodeOptions
  );
}

function formatImage({ tag, repository }: Image): string {
  return `${repository}/${tag}`;
}

// Dockerode expects an array of strings, instead of a space-separated command
// Ex: If the command is "ls -al", we're expected to pass ["ls", "-al"]
function formatCommandForDockerode(command: string): string[] {
  return command.split(" ");
}

type PortBindings = {
  [key: string]: { HostPort: string }[];
};

// Formats a port bindings array of the form ["8545:8545", "1234:2323"] to the format
// expected by dockerode:
//
//  { "8545/tcp": [{HostPort: "8545"}], "2323/tcp": [{HostPort: "1234"}] }
//
// As one can see, the format used by dockerode is quite unpleasant to work with.
function formatPortBindings(portBindings: string[]): PortBindings {
  return portBindings.reduce((acc: PortBindings, binding) => {
    const [hostPort, containerPort] = binding.split(":");

    acc[`${containerPort}/tcp`] = [{ HostPort: hostPort }];
    return acc;
  }, {});
}

// Example usage
//
// runImage({
//   repository: "trufflesuite",
//   tag: "ganache-cli",
//   command: "",
//   config: { portBindings: ["8545:8545"] }
// });
//
// runImage({
//   repository: "ethereum",
//   tag: "vyper:0.1.0b9",
//   command: "-f combined_json a.vy",
//   config: { volumes: [`${path.join(__dirname, "../")}:/code`] }
// });
