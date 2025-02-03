import "dotenv/config";
import { client } from "./client";
import { PING_EVENT_ABI } from "./constants";

async function main() {
  console.log("## Starting bot...");

  client.watchEvent({
    address: process.env.PING_PONG_CONTRACT_ADDRESS as `0x${string}`,
    event: PING_EVENT_ABI,
    onLogs: (logs) => {
      console.log("## PING DETECTED: ", logs);
    },
  });
}

main().catch(console.error);
