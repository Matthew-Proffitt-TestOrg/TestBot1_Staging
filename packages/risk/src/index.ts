import { z } from "zod";
import policies from "../../../config/policies.json" assert { type: "json" };

export const OrderSchema = z.object({
  chainId: z.number(),
  tokenIn: z.string(),
  tokenOut: z.string(),
  amountIn: z.bigint(),
  expectedOutMin: z.bigint()
});

export type Order = z.infer<typeof OrderSchema>;

export function validateOrder(order: Order) {
  OrderSchema.parse(order);
  if ((policies as any).denyTokens?.includes(order.tokenIn)) {
    throw new Error("Denied tokenIn");
  }
  return true;
}
