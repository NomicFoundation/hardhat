import type { ModuleParams } from "@ignored/ignition-core";
import { Text, Newline } from "ink";

export const ModuleParameters = ({
  moduleParams,
}: {
  moduleParams?: ModuleParams;
}) => {
  if (moduleParams) {
    const params = [];

    for (const [key, value] of Object.entries(moduleParams)) {
      const item = (
        <Text>
          {key}: {value}
        </Text>
      );

      params.push(item, <Newline />);
    }

    params.pop();

    return (
      <Text>
        <Text bold={true}>Module parameters:</Text>
        <Newline />
        {...params}
      </Text>
    );
  } else {
    return null;
  }
};
