import {
  IgnitionModule,
  IgnitionModuleResult,
} from "@nomicfoundation/ignition-core/ui-helpers";
import React, { useMemo } from "react";
import { getAllDeployFuturesFor } from "../../../queries/futures";

export const Summary: React.FC<{
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>;
}> = ({ ignitionModule }) => {
  const deployFutures = useMemo(
    () => getAllDeployFuturesFor(ignitionModule),
    [ignitionModule]
  );

  const deployCountPerContract = deployFutures.reduce((acc, future) => {
    const count = acc[future.contractName] ?? 0;
    return { ...acc, [future.contractName]: count + 1 };
  }, {} as Record<string, number>);

  return (
    <div>
      <p>Contracts to be deployed</p>

      <div>
        {deployFutures.length === 0 ? null : (
          <ul>
            {Object.entries(deployCountPerContract).map(
              ([contractName, count]) => (
                <li key={contractName}>
                  {contractName}
                  {count > 1 ? ` x${count}` : null}
                </li>
              )
            )}
          </ul>
        )}
      </div>
    </div>
  );
};
