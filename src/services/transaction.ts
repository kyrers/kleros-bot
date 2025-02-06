import { parseEther } from "viem";
import { deletePong, getState, updatePong } from "../state";
import { publicClient, walletClient } from "../clients";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../constants";
import { PongState, PongStatus } from "../types";

//Max amount willing to pay for 1 tx
const MAX_GAS_PRICE = parseEther("0.1");

export function startProcessor() {
  //Process pending txs every 30 seconds
  setInterval(processPendingTransactions, 30000);
}

async function processPendingTransactions() {
  const state = getState();
  const pendingPings = Object.keys(state.pending) as `0x${string}`[];

  for (const pingTxHash of pendingPings) {
    const pongState = state.pending[pingTxHash];

    if (pongState.txHash) {
      await checkPendingTransaction(pingTxHash, pongState);
    } else {
      await sendNewTransaction(pingTxHash, pongState);
    }
  }
}

async function checkPendingTransaction(
  pingTxHash: `0x${string}`,
  pongState: PongState
) {
  try {
    const receipt = await publicClient.getTransactionReceipt({
      hash: pongState.txHash as `0x${string}`,
    });

    if (receipt) {
      if (receipt.status === "success") {
        await deletePong(pingTxHash);
        return;
      }

      await updatePong(pingTxHash, PongStatus.FAILED);
      return;
    }

    await checkIfTransactionStuck(pingTxHash, pongState);
  } catch (error) {
    console.error(`## ERROR CHECKING TX FOR PING ${pingTxHash}:`, error);
  }
}

async function checkIfTransactionStuck(
  pingTxHash: `0x${string}`,
  pongState: PongState
) {
  const tx = await publicClient.getTransaction({
    hash: pongState.txHash as `0x${string}`,
  });

  //Considered stuck if current gas price is double the tx's gas price
  if (tx && (await publicClient.getGasPrice()) > (tx.maxFeePerGas ?? 0n) * 2n) {
    await updatePong(pingTxHash, PongStatus.FAILED);
  }
}

async function sendNewTransaction(
  pingTxHash: `0x${string}`,
  pongState: PongState
) {
  try {
    const gasPrice = await getGasPrice(pongState.attempts);
    if (gasPrice > MAX_GAS_PRICE) {
      console.log(
        `## GAS PRICE TOO HIGH. WILL RETRY PING ${pingTxHash} LATER.`
      );
      return;
    }

    const { request } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "pong",
      args: [pingTxHash],
      account: walletClient.account,
      maxFeePerGas: gasPrice,
    });

    const txHash = await walletClient.writeContract(request);
    await updatePong(pingTxHash, PongStatus.PENDING, txHash);
  } catch (error) {
    console.error(`## ERROR SENDING TX FOR PING ${pingTxHash}`, error);
  }
}

async function getGasPrice(attempts: number): Promise<bigint> {
  const base = await publicClient.getGasPrice();
  const formattedAttempts = BigInt(attempts);

  //Increase by 20% each attempt
  return (base * 120n ** formattedAttempts) / 100n ** formattedAttempts;
}
