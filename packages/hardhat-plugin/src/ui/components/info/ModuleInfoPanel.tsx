import type {
  ModuleInfoData,
  NetworkInfoData,
  ContractInfoData,
} from "@ignored/ignition-core";

import { Box, Text, Spacer } from "ink";

export const ModuleInfoPanel = ({ data }: { data: ModuleInfoData }) => {
  return (
    <Box flexDirection="column">
      <Box flexDirection="column" marginBottom={1}>
        <Text>{data.moduleName}</Text>
        <Spacer />
        <Text>{divider(data.moduleName, "_", data.moduleName.length + 1)}</Text>
        <Spacer />
      </Box>
      {...data.networks.map((networkData) => (
        <StatusPanel data={networkData} />
      ))}
    </Box>
  );
};

const StatusPanel = ({ data }: { data: NetworkInfoData }) => {
  const nameWidth = getMaxStringLength(
    data.contracts.map(({ contractName }) => contractName)
  );

  const statusWidth = getMaxStringLength(
    data.contracts.map(({ status }) => status)
  );

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="column" marginBottom={1}>
        <Text>
          {data.networkName} ({data.chainId})
        </Text>
        <Spacer />
        <Text>{divider(data.networkName)}</Text>
        <Spacer />
      </Box>
      {...data.contracts.map((contract) => (
        <StatusRow
          nameWidth={nameWidth}
          statusWidth={statusWidth}
          data={contract}
        />
      ))}
    </Box>
  );
};

const StatusRow = ({
  nameWidth,
  statusWidth,
  data,
}: {
  nameWidth: number;
  statusWidth: number;
  data: ContractInfoData;
}) => {
  const name = data.contractName.padEnd(nameWidth);
  const status = data.status.padEnd(statusWidth);

  return (
    <Box flexDirection="row">
      <Text>
        {name}&nbsp;&nbsp;&nbsp;{status}&nbsp;&nbsp;&nbsp;{data.address}
      </Text>
    </Box>
  );
};

function divider(name: string, fill: string = "-", length?: number): string {
  return new Array(length ?? name.length).fill(fill).join("");
}

function getMaxStringLength(strings: string[]): number {
  return Math.max(...strings.map((str) => str.length));
}
