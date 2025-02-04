import "dotenv/config";
import { createPublicClient, createWalletClient, Hex, http } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const baseClientParameters = {
  chain: sepolia,
  transport: http(
    `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_SEPOLIA_API_KEY}`
  ),
};

export const publicClient = createPublicClient(baseClientParameters);

export const walletClient = createWalletClient({
  ...baseClientParameters,
  account: privateKeyToAccount(process.env.BOT_WALLET_PK as Hex),
});
