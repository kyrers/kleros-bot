import { CONTRACT_ABI, CONTRACT_ADDRESS } from "./constants";
import { publicClient, walletClient } from "./clients";

async function main() {
  console.log("## STARTING BOT...");

  const startingBlock = await publicClient.getBlockNumber();
  console.log("## LISTENING FROM BLOCK:", startingBlock);

  publicClient.watchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    eventName: "Ping",
    fromBlock: startingBlock,
    onLogs: async (logs) => {
      const pingTxHash = logs[0].transactionHash;
      console.log("## PING EMITTED:", pingTxHash);

      try {
        const { request } = await publicClient.simulateContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: "pong",
          args: [pingTxHash],
          account: walletClient.account,
        });

        const hash = await walletClient.writeContract(request);
        console.log(`## CALLED PONG: \n PING: ${pingTxHash} \n PONG: ${hash}`);
      } catch (error) {
        console.error(`## FAILED TO CALL PONG FOR PING: ${pingTxHash}:`, error);
        throw error;
      }
    },
  });
}

main().catch(console.error);
