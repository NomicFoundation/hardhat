import {
  Future,
  FutureType,
  StoredDeployment,
} from "@ignored/ignition-core/ui-helpers";
import { PageTitle, Panel } from "../../../components/shared";
import { SummaryHeader } from "../../../components/summary-header";

export const FutureSummary: React.FC<{
  deployment: StoredDeployment;
  future: Future;
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

function resolveTitleFor(future: Future): string {
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
    case FutureType.READ_EVENT_ARGUMENT:
      return `Read event argument from future - ${future.id}`;
    case FutureType.SEND_DATA:
      return `Send data - ${future.id}`;
  }
}

const FutureDetailsSection: React.FC<{ future: Future }> = ({ future }) => {
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
    case FutureType.READ_EVENT_ARGUMENT:
      return (
        <div>
          <p>Future - {future.futureToReadFrom.id}</p>
          {future.futureToReadFrom !== future.emitter ? (
            <p>Emitter - {future.emitter.id}</p>
          ) : null}
          <p>Event - {future.eventName}</p>
          <p>Event index - {future.eventIndex}</p>
          <p>Argument - {future.argumentName}</p>
        </div>
      );
    case FutureType.SEND_DATA:
      return (
        <div>
          <p>To - {typeof future.to === "string" ? future.to : future.to.id}</p>
          <p>Data - {future.data}</p>
        </div>
      );
  }
};
