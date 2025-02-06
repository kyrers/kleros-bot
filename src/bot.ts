import { publicClient } from "./clients";
import { loadState, getState, initializeBlocks } from "./state";
import { processMissedEvents, startEventWatcher } from "./services/event";

async function main() {
  console.log("## STARTING BOT...");
  await loadState();

  const currentBlock = await publicClient.getBlockNumber();
  await initializeBlocks(Number(currentBlock));

  //Watch new events
  await startEventWatcher(currentBlock);

  const state = getState();
  console.log(`## STARTING BLOCK: ${state.startBlock}`);
  console.log(`## LAST BLOCK READ: ${state.lastBlockRead}`);

  //If block were missed while the bot was down, we need to get those events
  await processMissedEvents(state.lastBlockRead, currentBlock);
}

main().catch(console.error);
