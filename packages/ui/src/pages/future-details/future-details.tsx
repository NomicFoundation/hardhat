import { StoredDeployment } from "@ignored/ignition-core";
import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { Page } from "../../components/shared";
import { getFutureById } from "../../queries/futures";
import { FutureSummary } from "./components/future-summary";

export const FutureDetails: React.FC<{ deployment: StoredDeployment }> = ({
  deployment,
}) => {
  const { futureId } = useParams();

  const future = useMemo(
    () => getFutureById(deployment, futureId),
    [deployment, futureId]
  );

  if (future === undefined) {
    return (
      <Page>
        <h1>Future not found</h1>
      </Page>
    );
  }

  return (
    <Page>
      <FutureSummary deployment={deployment} future={future} />
    </Page>
  );
};
