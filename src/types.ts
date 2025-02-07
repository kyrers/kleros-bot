export enum PongStatus {
  PENDING = "pending",
  FAILED = "failed",
}

export interface PongState {
  status: PongStatus;
  retryAttempts: number;
  txHash?: string;
  submittedBlock?: number;
  stuckNonce?: number;
}

export interface BotState {
  startBlock: number;
  lastBlockRead: number;
  pending: {
    [pingTxHash: string]: PongState;
  };
}
