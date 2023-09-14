import {
  IgnitionModule,
  IgnitionModuleResult,
} from "@ignored/ignition-core/ui-helpers";
import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { Page } from "../../components/shared";
import { getFutureById } from "../../queries/futures";
import { FutureSummary } from "./components/future-summary";

export const FutureDetails: React.FC<{
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>;
}> = ({ ignitionModule }) => {
  const { futureId } = useParams();

  const future = useMemo(
    () => getFutureById(ignitionModule, futureId),
    [ignitionModule, futureId]
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
      <FutureSummary future={future} />
    </Page>
  );
};
