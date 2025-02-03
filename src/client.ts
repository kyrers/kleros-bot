import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import "dotenv/config";

export const client = createPublicClient({
  chain: sepolia,
  transport: http(
    `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_SEPOLIA_API_KEY}`
  ),
});
