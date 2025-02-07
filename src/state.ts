import fs from "fs/promises";
import { BotState, PongStatus } from "./types";

const STATE_FILE = "./botState.json";
let state: BotState = {
  startBlock: 0,
  lastBlockRead: 0,
  pending: {},
};

export const getState = () => ({ ...state });

export async function initializeBlocks(blockNumber: number) {
  if (state.startBlock === 0) {
    state.startBlock = blockNumber;
    state.lastBlockRead = blockNumber;
    await saveState();
  }
}

export async function setLastBlockRead(blockNumber: number) {
  state.lastBlockRead = blockNumber;
  await saveState();
}

export async function loadState() {
  try {
    console.log("## LOADING STATE");
    const data = await fs.readFile(STATE_FILE, "utf8");
    state = JSON.parse(data) as BotState;
  } catch (_) {
    console.log("## CREATING STATE FILE");
    await saveState();
  }
}

export async function saveState() {
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

export function hasPong(pingTxHash: `0x${string}`): boolean {
  return !!state.pending[pingTxHash];
}

export function hasPending(): boolean {
  return Object.keys(state.pending).length > 0;
}

interface AddOrUpdatePongParams {
  pingTxHash: `0x${string}`;
  pongTxHash?: `0x${string}`;
  status?: PongStatus;
  attempts?: number;
  submittedBlock?: number;
  stuckNonce?: number;
}

export async function addOrUpdatePong(pongState: AddOrUpdatePongParams) {
  state.pending[pongState.pingTxHash] = {
    txHash: pongState.pongTxHash,
    status: pongState.status ?? PongStatus.PENDING,
    retryAttempts: pongState.attempts ?? 0,
    submittedBlock: pongState.submittedBlock,
    stuckNonce: pongState.stuckNonce,
  };
  await saveState();
}

export async function deletePong(pingTxHash: `0x${string}`) {
  delete state.pending[pingTxHash];
  await saveState();
}
