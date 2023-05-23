import {
  FutureType,
  StoredDeployment,
} from "@ignored/ignition-core/ui-helpers";
import { PageTitle, Panel } from "../../../components/shared";
import { SummaryHeader } from "../../../components/summary-header";
import { UiFuture } from "../../../types";

export const FutureSummary: React.FC<{
  deployment: StoredDeployment;
  future: UiFuture;
}> = ({ deployment, future }) => {
  const title = resolveTitleFor(future);

  return (
    <div>
      <header>
        <PageTitle>{title}</PageTitle>
      </header>

      <Panel>
        <SummaryHeader
          networkName={deployment.details.networkName}
          chainId={deployment.details.chainId}
        />

        <div>
          <FutureDetailsSection future={future} />
        </div>
      </Panel>
    </div>
  );
};

function resolveTitleFor(future: UiFuture): string {
  switch (future.type) {
    case FutureType.NAMED_CONTRACT_DEPLOYMENT:
      return `Contract deploy - ${future.contractName}`;
    case FutureType.ARTIFACT_CONTRACT_DEPLOYMENT:
      return `Contract deploy from Artifact - ${future.contractName}`;
    case FutureType.NAMED_LIBRARY_DEPLOYMENT:
      return `Library deploy - ${future.contractName}`;
    case FutureType.ARTIFACT_LIBRARY_DEPLOYMENT:
      return `Library deploy from Artifact - ${future.contractName}`;
    case FutureType.NAMED_CONTRACT_CALL:
      return `Call - ${future.contract.contractName}/${future.functionName}`;
    case FutureType.NAMED_STATIC_CALL:
      return `Static call - ${future.contract.contractName}/${future.functionName}`;
    case FutureType.NAMED_CONTRACT_AT:
      return `Existing contract - ${future.contractName} (${
        typeof future.address === "string" ? future.address : future.address.id
      })`;
    case FutureType.ARTIFACT_CONTRACT_AT:
      return `Existing contract from Artifact - ${future.contractName} (${
        typeof future.address === "string" ? future.address : future.address.id
      })`;
  }
}

const FutureDetailsSection: React.FC<{ future: UiFuture }> = ({ future }) => {
  switch (future.type) {
    case FutureType.NAMED_CONTRACT_DEPLOYMENT:
      return (
        <div>
          <p>Contract - {future.contractName}</p>
          <p>Constructor Args</p>
          <ul>
            {Object.entries(future.constructorArgs).map(([key, value]) => (
              <li>
                {key} - {value}
              </li>
            ))}
          </ul>
        </div>
      );
    case FutureType.ARTIFACT_CONTRACT_DEPLOYMENT:
      return (
        <div>
          <p>Contract - {future.contractName}</p>
          <p>Constructor Args</p>
          <ul>
            {Object.entries(future.constructorArgs).map(([key, value]) => (
              <li>
                {key} - {value}
              </li>
            ))}
          </ul>
        </div>
      );
    case FutureType.NAMED_LIBRARY_DEPLOYMENT:
      return (
        <div>
          <p>Library - {future.contractName}</p>
        </div>
      );
    case FutureType.ARTIFACT_LIBRARY_DEPLOYMENT:
      return (
        <div>
          <p>Library - {future.contractName}</p>
        </div>
      );
    case FutureType.NAMED_CONTRACT_CALL:
      return (
        <div>
          <p>Contract - {future.contract.contractName}</p>
          <p>function - {future.functionName}</p>
          <p>Args</p>
          <ul>
            {Object.entries(future.args).map(([, value]) => (
              <li>{value}</li>
            ))}
          </ul>
        </div>
      );
    case FutureType.NAMED_STATIC_CALL:
      return (
        <div>
          <p>Contract - {future.contract.contractName}</p>
          <p>function - {future.functionName}</p>
          <p>Args</p>
          <ul>
            {Object.entries(future.args).map(([, value]) => (
              <li>{value}</li>
            ))}
          </ul>
        </div>
      );
    case FutureType.NAMED_CONTRACT_AT:
      return (
        <div>
          <p>Contract - {future.contractName}</p>
          <p>
            Address -{" "}
            {typeof future.address === "string"
              ? future.address
              : future.address.id}
          </p>
        </div>
      );

    case FutureType.ARTIFACT_CONTRACT_AT:
      return (
        <div>
          <p>Contract - {future.contractName}</p>
          <p>
            Address -{" "}
            {typeof future.address === "string"
              ? future.address
              : future.address.id}
          </p>
        </div>
      );
  }
};
