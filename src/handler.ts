import { Log } from "viem";
import {
  addPong,
  deletePong,
  hasPong,
  setLastBlockRead,
  updatePong,
} from "./state";
import { publicClient, walletClient } from "./clients";
import { PongStatus } from "./types";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "./constants";

export async function handlePing(logs: Log[]) {
  const pingTxHash = logs[0].transactionHash as `0x${string}`;
  const blockNumber = Number(logs[0].blockNumber);
  console.log("## HANDLING PING:", pingTxHash);

  if (hasPong(pingTxHash)) {
    console.log("## PING ALREADY PROCESSED:", pingTxHash);
    return;
  }

  await addPong(pingTxHash);
  await sendPong(pingTxHash);
  await setLastBlockRead(blockNumber);
}

async function sendPong(pingTxHash: `0x${string}`) {
  try {
    const { request } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "pong",
      args: [pingTxHash],
      account: walletClient.account,
    });

    const pongTxHash = await walletClient.writeContract(request);
    await deletePong(pingTxHash);

    console.log(
      `## CALLED PONG: \n PING: ${pingTxHash} \n PONG: ${pongTxHash}`
    );
  } catch (error) {
    console.error(`## FAILED TO CALL PONG FOR PING: ${pingTxHash}:`, error);
    await updatePong(pingTxHash, PongStatus.FAILED);
    throw error;
  }
}
