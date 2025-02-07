import { parseEther, parseGwei } from "viem";
import { addOrUpdatePong, deletePong, getState } from "../state";
import { publicClient, walletClient } from "../clients";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../constants";
import { PongState, PongStatus } from "../types";

//Max amount willing to pay for 1 tx
const MAX_GAS_PRICE = parseEther("0.1");

//Consider txs stuck if not mined after 20 blocks
const BLOCKS_UNTIL_STUCK = 20;

async function calculateGasCost(pingTxHash: `0x${string}`): Promise<bigint> {
  const gasEstimate = await publicClient.estimateContractGas({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "pong",
    args: [pingTxHash],
    account: walletClient.account,
  });

  const gasPrice = await publicClient.getGasPrice();
  return gasEstimate * gasPrice;
}

export async function sendPong(pingTxHash: `0x${string}`) {
  try {
    const onchainNonce = await publicClient.getTransactionCount({
      address: walletClient.account.address,
    });

    const currentBlockNumber = await publicClient.getBlockNumber();
    const gasCost = await calculateGasCost(pingTxHash);

    if (gasCost > MAX_GAS_PRICE) {
      await addOrUpdatePong({ pingTxHash });
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
      nonce: onchainNonce,
    });

    const txHash = await walletClient.writeContract(request);
    await addOrUpdatePong({
      pingTxHash,
      pongTxHash: txHash,
      submittedBlock: Number(currentBlockNumber),
    });
  } catch (error) {
    console.error("## ERROR SENDING PONG:", error);
    await addOrUpdatePong({ pingTxHash });
  }
}

export function startTransactionProcessor() {
  //Process pending txs every 30 seconds
  setInterval(processPendingTransactions, 30000);
}

async function processPendingTransactions() {
  const state = getState();
  const pendingPings = Object.keys(state.pending) as `0x${string}`[];
  console.log("## PENDING:", pendingPings);

  for (const pingTxHash of pendingPings) {
    const pongState = state.pending[pingTxHash];

    if (pongState.txHash) {
      await checkTransaction(pingTxHash, pongState);
    } else {
      await retryTransaction(pingTxHash, pongState);
    }
  }
}

async function checkTransaction(
  pingTxHash: `0x${string}`,
  pongState: PongState
) {
  console.log(`## CHECKING PING ${pingTxHash} STATUS!`);
  try {
    const receipt = await publicClient.getTransactionReceipt({
      hash: pongState.txHash as `0x${string}`,
    });

    if (receipt) {
      if (receipt.status === "success") {
        //Tx mined successfully - remove from state
        console.log(`${pingTxHash} SUCCESSFUL!`);
        await deletePong(pingTxHash);
        return;
      }

      //Tx failed - mark for retry
      console.log(`${pingTxHash} FAILED AND WILL BE RETRIED SOON!`);
      await addOrUpdatePong({
        pingTxHash,
        pongTxHash: undefined,
        status: PongStatus.FAILED,
        attempts: pongState.retryAttempts + 1,
      });
      return;
    }
  } catch (_) {
    console.error(
      "## ERROR LOOKING FOR THE PONG TX RECEIPT FOR PING:",
      pingTxHash
    );
    await checkIsTxStuck(pingTxHash, pongState);
  }
}

async function checkIsTxStuck(pingTxHash: `0x${string}`, pongState: PongState) {
  console.log(`## CHECKING IF PONG FOR PING ${pingTxHash} IS STUCK`);

  const currentBlockNumber = await publicClient.getBlockNumber();

  if (
    Number(currentBlockNumber) - (pongState.submittedBlock ?? 0) >
    BLOCKS_UNTIL_STUCK
  ) {
    console.log(`## PONG FOR PING ${pingTxHash} IS STUCK!`);

    //Get the stuck transaction to get its nonce
    const stuckTx = await publicClient.getTransaction({
      hash: pongState.txHash as `0x${string}`,
    });

    await addOrUpdatePong({
      pingTxHash,
      pongTxHash: undefined,
      status: PongStatus.FAILED,
      attempts: pongState.retryAttempts + 1,
      stuckNonce: stuckTx?.nonce,
    });
  }
}

async function retryTransaction(
  pingTxHash: `0x${string}`,
  pongState: PongState
) {
  try {
    console.log("## RETRYING PING:", pingTxHash);

    //If this was a stuck transaction, use its nonce for replacement
    //If it was a failed transaction, get new nonce
    const nonce =
      pongState.stuckNonce ??
      (await publicClient.getTransactionCount({
        address: walletClient.account.address,
      }));

    const currentBlockNumber = await publicClient.getBlockNumber();
    const gasCost = await calculateGasCost(pingTxHash);

    if (gasCost > MAX_GAS_PRICE) {
      console.log(
        `## GAS PRICE TOO HIGH FOR RETRY. WILL TRY LATER: ${pingTxHash}`
      );
      return;
    }

    const { request } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "pong",
      args: [pingTxHash],
      account: walletClient.account,
      nonce: nonce,
    });

    const txHash = await walletClient.writeContract(request);
    await addOrUpdatePong({
      pingTxHash,
      pongTxHash: txHash,
      status: PongStatus.PENDING,
      attempts: pongState.retryAttempts + 1,
      submittedBlock: Number(currentBlockNumber),
    });
  } catch (error) {
    //Will be retried on next processor cycle
    console.error(`## ERROR RETRYING PONG FOR PING ${pingTxHash}:`, error);
  }
}
