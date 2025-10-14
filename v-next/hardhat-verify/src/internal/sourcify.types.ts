type SourcifyVerificationStatus = "exact_match" | "match" | null;

interface SourcifyContract {
  match: SourcifyVerificationStatus;
  creationMatch: SourcifyVerificationStatus;
  runtimeMatch: SourcifyVerificationStatus;
  chainId: string;
  address: string;
  verifiedAt?: string;
  matchId?: string;
}

export interface SourcifyErrorResponse {
  customCode: string;
  message: string;
  errorId: string;
}

// Response type for GET /v2/contract/{chainId}/{address}
export type SourcifyLookupResponse = SourcifyContract;

// Response type for POST /v2/verify/{chainId}/{address}
export interface SourcifyVerifyResponse {
  verificationId: string;
}

// Response type for GET /v2/verify/{verificationId}
export interface SourcifyVerificationStatusResponse {
  isJobCompleted: boolean;
  verificationId: string;
  jobStartTime: string;
  jobFinishTime?: string;
  compilationTime?: number;
  contract: SourcifyContract;
  error?: SourcifyErrorResponse;
}
