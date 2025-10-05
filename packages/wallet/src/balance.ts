import { createPublicClient, formatEther, http } from "viem";
import { sepolia } from "viem/chains";

/**
 * Structured balance information returned by {@link checkSepoliaBalance}.
 */
export interface WalletBalance {
  /** Raw balance denominated in wei. */
  readonly wei: bigint;
  /** Human-readable balance formatted in ether units. */
  readonly ether: string;
}

/**
 * Fetch the Sepolia ETH balance for the provided address. The helper is
 * intentionally lightweight so the CLI can surface friendly diagnostics without
 * blocking wallet initialization when the RPC is unavailable.
 */
export async function checkSepoliaBalance(
  rpcUrl: string,
  address: `0x${string}`,
): Promise<WalletBalance | undefined> {
  if (!rpcUrl) {
    return undefined;
  }

  try {
    const client = createPublicClient({
      chain: sepolia,
      transport: http(rpcUrl),
    });

    const wei = await client.getBalance({ address });
    return {
      wei,
      ether: formatEther(wei),
    };
  } catch (error) {
    // Swallow network-related errors to avoid blocking CLI flows. The caller can
    // decide how to surface the failure to the operator.
    return undefined;
  }
}
