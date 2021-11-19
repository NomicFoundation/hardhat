import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";

import { UiData, UiExecutor, UiModule } from "../ui-data";

export const IgnitionUi = ({ uiData }: { uiData: UiData }) => {
  const currentModule = uiData.getCurrentModule();

  const successfulModules = uiData.getSuccessfulModules();

  return (
    <Box flexDirection="column">
      <Header uiData={uiData} />

      <Box flexDirection="column" marginLeft={2} marginTop={1}>
        <SuccessfulModules modules={successfulModules} />

        <CurrentModule module={currentModule} />
      </Box>
    </Box>
  );
};

const Header = ({ uiData }: { uiData: UiData }) => {
  return (
    <Box>
      <Text bold={true}>
        {uiData.getDeployedModulesCount()} of {uiData.getModulesCount()} modules
        deployed
      </Text>
    </Box>
  );
};

const CurrentModule = ({ module }: { module?: UiModule }) => {
  if (module === undefined) {
    return null;
  }

  const executors = [...module.executors.values()];

  return (
    <Box flexDirection="column">
      <Box>
        <Text>
          <Spinner type="dots" /> Deploying {module.id}
        </Text>
      </Box>
      <Box flexDirection="column" marginLeft={4}>
        {executors.sort(compareExecutors).map((e) => (
          <Executor key={e.id} executor={e} />
        ))}
      </Box>
    </Box>
  );
};

function compareExecutors(a: UiExecutor, b: UiExecutor): number {
  const value = (s: UiExecutor["status"]) => {
    if (s === "success" || s === "failure" || s === "hold") {
      return 0;
    }
    if (s === "executing") {
      return 1;
    }
    if (s === "ready") {
      return 2;
    }
    const _exhaustiveCheck: never = s;
    return s;
  };

  const aValue = value(a.status);
  const bValue = value(b.status);
  return aValue - bValue;
}

const Executor = ({ executor }: { executor: UiExecutor }) => {
  return (
    <Box>
      {executor.status === "executing" ? (
        <Text>{executor.id}: Executing</Text>
      ) : executor.status === "success" ? (
        <Text color="green">{executor.id}: Executed</Text>
      ) : executor.status === "ready" ? (
        <Text color="gray">{executor.id}: Waiting</Text>
      ) : null}
    </Box>
  );
};

const SuccessfulModules = ({ modules }: { modules: UiModule[] }) => {
  if (modules.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column">
      {modules.map((m) => (
        <Box key={m.id}>
          <Text color="green">Deployed {m.id}</Text>
        </Box>
      ))}
    </Box>
  );
};
