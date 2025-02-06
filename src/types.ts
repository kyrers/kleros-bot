export enum PongStatus {
  PENDING = "pending",
  FAILED = "failed",
}

export interface PongState {
  txHash?: string;
  status: PongStatus;
  attempts: number;
}

export interface BotState {
  startBlock: number;
  lastBlockRead: number;
  pending: {
    [pingTxHash: string]: PongState;
  };
}
