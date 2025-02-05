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

export async function addPong(pingTxHash: `0x${string}`) {
  state.pending[pingTxHash] = {
    status: PongStatus.PENDING,
    attempts: 0,
  };
  await saveState();
}

export async function updatePong(
  pingTxHash: `0x${string}`,
  status: PongStatus
) {
  if (!state.pending[pingTxHash]) {
    throw new Error(`## NO PING FOUND FOR HASH: ${pingTxHash}`);
  }

  state.pending[pingTxHash].status = status;
  state.pending[pingTxHash].attempts++;
  await saveState();
}

export async function deletePong(pingTxHash: `0x${string}`) {
  delete state.pending[pingTxHash];
  await saveState();
}
