export enum PongStatus {
  PENDING = "pending",
  FAILED = "failed",
}

interface PongState {
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
