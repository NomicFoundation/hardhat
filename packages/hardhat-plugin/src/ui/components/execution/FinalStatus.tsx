import {
  DeploymentResultType,
  IgnitionModuleResult,
  SuccessfulDeploymentResult,
  ValidationErrorDeploymentResult,
} from "@ignored/ignition-core";
import { Box, Text } from "ink";

import { UiState } from "../../types";

import { AddressResults } from "./AddressResults";
import { Divider } from "./Divider";

export const FinalStatus = ({ state }: { state: UiState }) => {
  if (state.result?.type === DeploymentResultType.SUCCESSFUL_DEPLOYMENT) {
    return (
      <SuccessfulResult
        chainId={state.chainId!}
        moduleName={state.moduleName!}
        result={state.result}
      />
    );
  }

  if (state.result?.type === DeploymentResultType.VALIDATION_ERROR) {
    return (
      <ValidationErrorResult
        chainId={state.chainId!}
        moduleName={state.moduleName!}
        result={state.result}
      />
    );
  }

  if (state.result?.type === DeploymentResultType.RECONCILIATION_ERROR) {
    // TODO: fill in reconciliation errors
    return <Text>Reconciliation error</Text>;
  }

  if (state.result?.type === DeploymentResultType.EXECUTION_ERROR) {
    // TODO: fill in execution errors
    return <Text>Reconciliation error</Text>;
  }

  // const pendingFutures = allFutures.filter(
  //   (f) => f.status.type === UiFutureStatusType.PENDING
  // );

  // if (pendingFutures.length > 0) {
  //   return (
  //     <Box flexDirection="column">
  //       <Divider />

  //       <Box>
  //         <Text>
  //           🟡 <Text italic={true}>{"moduleName"}</Text> deployment{" "}
  //           <Text bold color="yellow">
  //             on hold
  //           </Text>
  //         </Text>
  //       </Box>

  //       <Box flexDirection="column">
  //         {pendingFutures.map((f) => (
  //           <Box key={`hold-${f.futureId}`} flexDirection="column" margin={1}>
  //             <Text bold={true}>{f.futureId}</Text>
  //           </Box>
  //         ))}
  //       </Box>
  //     </Box>
  //   );
  // }

  // const erroredFutures = allFutures.filter(
  //   (f) => f.status.type === UiFutureStatusType.ERRORED
  // );

  // if (state.result?.type === DeploymentResultType.EXECUTION_ERROR) {
  //   const errors = getErrors(erroredFutures);

  //   return (
  //     <Box flexDirection="column">
  //       <Divider />

  //       <Box>
  //         <Text>
  //           ⛔ <Text italic={true}>{"moduleName"}</Text> deployment{" "}
  //           <Text bold color="red">
  //             failed
  //           </Text>
  //         </Text>
  //       </Box>

  //       <Box flexDirection="column">
  //         {errors.map((e) => (
  //           <Box key={`error-${e.futureId}`} flexDirection="column" margin={1}>
  //             <Text bold={true} underline={true}>
  //               {e.futureId}
  //             </Text>
  //             <Text>{e.message}</Text>
  //           </Box>
  //         ))}
  //       </Box>
  //     </Box>
  //   );
  // }

  return null;
};

// function getErrors(futures: UiFuture[]) {
//   const output = [];

//   for (const future of futures) {
//     if (future.status.type === UiFutureStatusType.ERRORED) {
//       output.push({
//         futureId: future.futureId,
//         message: future.status.message,
//       });
//     }
//   }

//   return output;
// }

const SuccessfulResult: React.FC<{
  moduleName: string;
  chainId: number;
  result: SuccessfulDeploymentResult<string, IgnitionModuleResult<string>>;
}> = ({ moduleName, chainId, result }) => {
  return (
    <Box margin={0} flexDirection="column">
      <Divider />

      <Text>
        🚀 Deployment Complete for module{" "}
        <Text italic={true}>{moduleName}</Text>
      </Text>

      <Divider />
      <AddressResults chainId={chainId} contracts={result.contracts} />
      <Text> </Text>
    </Box>
  );
};

const ValidationErrorResult: React.FC<{
  moduleName: string;
  chainId: number;
  result: ValidationErrorDeploymentResult;
}> = ({ moduleName, result }) => {
  return (
    <Box margin={0} flexDirection="column">
      <Divider />

      <Text>
        ⛔ Validation failed for module <Text italic={true}>{moduleName}</Text>
      </Text>

      <Divider />

      <Box flexDirection="column" marginTop={1}>
        {Object.entries(result.errors).map(([futureId, errors], i) => (
          <ErrorBox key={`err-${i}`} futureId={futureId} errors={errors} />
        ))}
      </Box>

      <Text> </Text>
    </Box>
  );
};

export const ErrorBox: React.FC<{ futureId: string; errors: string[] }> = ({
  futureId,
  errors,
}) => {
  return (
    <Text>
      Future ID: {futureId} - <Text color="red">error:</Text>
      {"\n"}
      {"  - "}
      {errors.join("\n  - ")}
    </Text>
  );
};
