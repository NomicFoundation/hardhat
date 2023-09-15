import type {
  DeploymentParameters,
  ModuleParameters,
} from "@nomicfoundation/ignition-core";

import { Newline, Text } from "ink";

export const DeployParameters = ({
  deployParams,
}: {
  deployParams?: DeploymentParameters;
}) => {
  if (deployParams === undefined) {
    return null;
  }

  const entries = Object.entries(deployParams);

  if (entries.length === 0) {
    return null;
  }

  const params = entries.map(([moduleId, moduleParams]) => {
    return (
      <Text>
        <Text underline={true}>
          Module: {moduleId}
          <Newline />
          <ModuleParams moduleParams={moduleParams} />
        </Text>
        <Newline />
      </Text>
    );
  });

  return (
    <Text>
      <Text bold={true}>Deployment parameters:</Text>
      <Newline />
      {...params}
    </Text>
  );
};

const ModuleParams = ({ moduleParams }: { moduleParams: ModuleParameters }) => {
  const entries = Object.entries(moduleParams);

  const params = entries.map(([paramId, paramValue]) => {
    return (
      <Text>
        <Text>
          {paramId}: {JSON.stringify(paramValue)}
        </Text>
        <Newline />
      </Text>
    );
  });

  return <Text>{...params}</Text>;
};
