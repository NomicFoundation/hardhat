/**
 * The result of a deployment run.
 *
 * @beta
 */
export type DeploymentResult =
  | {
      status: "success";
      contracts: Record<
        string,
        { contractName: string; contractAddress: string }
      >;
    }
  | {
      status: "failed" | "hold";
    };
