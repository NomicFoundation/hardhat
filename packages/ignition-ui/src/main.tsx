import "@fontsource/roboto";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/700.css";
import React from "react";

import {
  IgnitionModule,
  IgnitionModuleDeserializer,
  IgnitionModuleResult,
} from "@nomicfoundation/ignition-core/ui-helpers";
import ReactDOM from "react-dom/client";
import { RouterProvider, createHashRouter } from "react-router-dom";
import { VisualizationOverview } from "./pages/visualization-overview/visualization-overview";

import "./main.css";

const loadDeploymentFromEmbeddedDiv = (): {
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>;
  batches: string[][];
} | null => {
  const scriptTag = document.getElementById("deployment");

  if (scriptTag === null || scriptTag.textContent === null) {
    return null;
  }

  const data = JSON.parse(scriptTag.textContent);

  if (data.unloaded) {
    return null;
  }

  return {
    ignitionModule: IgnitionModuleDeserializer.deserialize(data.module),
    batches: data.batches,
  };
};

const loadDeploymentFromDevFile = async (): Promise<{
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>;
  batches: string[][];
}> => {
  const response = await fetch("./deployment.json");
  const data = await response.json();

  return {
    ignitionModule: IgnitionModuleDeserializer.deserialize(data.module),
    batches: data.batches,
  };
};

const loadDeploymentData = () => {
  return loadDeploymentFromEmbeddedDiv() ?? loadDeploymentFromDevFile();
};

const main = async () => {
  try {
    const { ignitionModule, batches } = await loadDeploymentData();

    document.title = `${ignitionModule.id} Deployment Visualization - Hardhat Ignition`;

    const router = createHashRouter([
      {
        path: "/",
        element: (
          <VisualizationOverview
            ignitionModule={ignitionModule}
            batches={batches}
          />
        ),
      },
    ]);

    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
      <React.StrictMode>
        <RouterProvider router={router} />
      </React.StrictMode>,
    );
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "unknown error";

    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
      <div>
        <h2>
          Error during deployment loading: <em>{message}</em>
        </h2>
      </div>,
    );
  }
};

main();
