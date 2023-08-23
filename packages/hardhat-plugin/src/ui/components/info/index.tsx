import type { ModuleInfoData } from "@ignored/ignition-core";

import { Box, render } from "ink";

import { ModuleInfoPanel } from "./ModuleInfoPanel";

export function renderInfo(data: ModuleInfoData[]) {
  render(<InfoView data={data} />);
}

const InfoView = ({ data }: { data: ModuleInfoData[] }) => {
  return (
    <Box flexDirection="column" margin={1}>
      {...data.map((panelData) => (
        <Box flexDirection="row">
          <ModuleInfoPanel data={panelData} />
        </Box>
      ))}
    </Box>
  );
};
