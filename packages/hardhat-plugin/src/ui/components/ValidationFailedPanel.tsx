import { IgnitionValidationError } from "@ignored/ignition-core";
import { DeployState } from "@ignored/ignition-core/soon-to-be-removed";
import { Box, Text } from "ink";
import { relative } from "path";

export const ValidationFailedPanel = ({
  deployState,
}: {
  deployState: DeployState;
}) => {
  return (
    <Box flexDirection="column">
      <Text>
        Ignition validation <Text color="red">failed</Text> for module{" "}
        <Text bold>{deployState.details.moduleName}</Text>
      </Text>

      <Box flexDirection="column" marginTop={1}>
        {deployState.validation.errors.map((err, i) => (
          <ErrorBox key={`err-${i}`} error={err} />
        ))}
      </Box>
    </Box>
  );
};

export const ErrorBox: React.FC<{ error: Error }> = ({ error }) => {
  return (
    <Text>
      <ErrorFileLocation error={error} /> - <Text color="red">error:</Text>{" "}
      {error.message}
    </Text>
  );
};

export const ErrorFileLocation: React.FC<{ error: Error }> = ({ error }) => {
  if (!(error instanceof IgnitionValidationError)) {
    return null;
  }

  const { file, line, column } = parseFileLink(error);

  if (file === "") {
    return null;
  }

  return (
    <Text>
      <Text color={"cyanBright"}>{file}</Text>:
      <Text color={"yellowBright"}>{line}</Text>:
      <Text color={"yellowBright"}>{column}</Text>
    </Text>
  );
};

const parseFileLink = (
  error: Error
): { file: string; line: string; column: string } => {
  try {
    // @ts-ignore
    // eslint-disable-next-line no-console
    const stack = error.stack.split("\n")[1];

    const regexp = /\s*at Object.action \D([^:]+):([^:]+):([^:]+)\)$/gm;
    const matches = stack.matchAll(regexp);

    let file: string = "";
    let line: string = "";
    let column: string = "";

    for (const match of matches) {
      file = match[1];
      line = match[2];
      column = match[3];
    }

    return { file: relative(process.cwd(), file), line, column };
  } catch {
    return { file: "", line: "", column: "" };
  }
};
