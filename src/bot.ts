import { CONTRACT_ABI, CONTRACT_ADDRESS } from "./constants";
import { publicClient, walletClient } from "./clients";

async function main() {
  console.log("## Starting bot...");

  publicClient.watchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    eventName: "Ping",
    onLogs: async (logs) => {
      const pingTxHash = logs[0].transactionHash;
      console.log("## DETECTED PING EVENT FROM TX:", pingTxHash);

      try {
        const { request } = await publicClient.simulateContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: "pong",
          args: [pingTxHash],
          account: walletClient.account,
        });

        const hash = await walletClient.writeContract(request);
        console.log(`## CALLED Pong FOR Ping ${pingTxHash}. PONG TX: ${hash}`);
      } catch (error) {
        console.error(`## FAILED TO CALL Pong FOR Ping ${pingTxHash}:`, error);
        throw error;
      }
    },
  });
}

main().catch(console.error);
