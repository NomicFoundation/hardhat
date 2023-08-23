import type { ModuleParams } from "@ignored/ignition-core";

import { Text, Newline } from "ink";

export const ModuleParameters = ({
  moduleParams,
}: {
  moduleParams?: ModuleParams;
}) => {
  if (moduleParams === undefined) {
    return null;
  }

  const entries = Object.entries(moduleParams);

  if (entries.length === 0) {
    return null;
  }

  const params = entries.map(([key, value]) => (
    <Text>
      <Text>
        {key}: {value}
      </Text>
      <Newline />
    </Text>
  ));

  return (
    <Text>
      <Text bold={true}>Module parameters:</Text>
      <Newline />
      {...params}
    </Text>
  );
};
