import { Log } from "viem";
import { publicClient } from "../clients";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../constants";
import { addPong, hasPong, setLastBlockRead } from "../state";

async function handlePing(logs: Log[]) {
  const pingTxHash = logs[0].transactionHash as `0x${string}`;
  const blockNumber = Number(logs[0].blockNumber);
  console.log("## HANDLING PING:", pingTxHash);

  if (hasPong(pingTxHash)) {
    console.log("## PING ALREADY PROCESSED:", pingTxHash);
    return;
  }

  await addPong(pingTxHash);
  await setLastBlockRead(blockNumber);
}

export async function startEventWatcher(fromBlock: bigint) {
  return publicClient.watchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    eventName: "Ping",
    fromBlock: fromBlock,
    onLogs: handlePing,
    onError: (error) => {
      //If unable to listen to events, it's no use running the bot.
      //This can only be done because missed events will be recovered when there is no error!
      console.error("## CANNOT LISTEN TO EVENTS. SHUTTING DOWN!", error);
      process.exit(1);
    },
  });
}

export async function processMissedEvents(
  lastBlockRead: number,
  currentBlock: bigint
) {
  if (lastBlockRead < Number(currentBlock)) {
    const missedEvents = await publicClient.getContractEvents({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      eventName: "Ping",
      fromBlock: BigInt(lastBlockRead + 1),
      toBlock: currentBlock,
    });

    console.log(
      `## FOUND ${missedEvents.length} MISSED EVENTS FROM BLOCK ${lastBlockRead} TO ${currentBlock}`
    );

    for (const log of missedEvents) {
      await handlePing([log]);
    }
  }
}
