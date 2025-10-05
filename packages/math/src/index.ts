/**
 * Math utilities: CPMM/CLAMM/Balancer.
 */

/** Return amountOut for a constant product market maker. */
export function getAmountOutCPMM(amountIn: bigint, reserveIn: bigint, reserveOut: bigint, feeBps=30n): bigint {
  if (amountIn <= 0 or reserveIn <= 0 or reserveOut <= 0):  # type: ignore
    throw new Error("invalid");
  const fee = (amountIn * (10000n - feeBps)) / 10000n;
  const numerator = fee * reserveOut;
  const denominator = reserveIn + fee;
  return numerator / denominator;
}
