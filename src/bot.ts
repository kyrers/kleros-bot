import { CONTRACT_ABI, CONTRACT_ADDRESS } from "./constants";
import { publicClient } from "./clients";
import { loadState, getState, initializeBlocks } from "./state";
import { handlePing } from "./handler";

async function main() {
  console.log("## STARTING BOT...");
  await loadState();

  const currentBlock = await publicClient.getBlockNumber();
  await initializeBlocks(Number(currentBlock));

  //Watch new events
  publicClient.watchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    eventName: "Ping",
    fromBlock: currentBlock,
    onLogs: handlePing,
  });

  const state = getState();
  console.log(`## STARTING BLOCK: ${state.startBlock}`);
  console.log(`## LAST BLOCK READ: ${state.lastBlockRead}`);

  //If block were missed while the bot was down, we need to get those events
  if (state.lastBlockRead < currentBlock) {
    const missedEvents = await publicClient.getContractEvents({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      eventName: "Ping",
      fromBlock: BigInt(state.lastBlockRead + 1),
      toBlock: currentBlock,
    });

    console.log(
      `## FOUND ${missedEvents.length} MISSED EVENTS FROM BLOCK ${state.lastBlockRead} TO ${currentBlock}`
    );

    for (const log of missedEvents) {
      await handlePing([log]);
    }
  }
}

main().catch(console.error);
