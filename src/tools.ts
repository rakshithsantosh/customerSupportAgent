import { tool } from "@langchain/core/tools";

export const getOffers = tool(
  () => {
    return JSON.stringify([
      {
        code: "SAVE20",
        discount_percent: 20,
      },
      {
        code: "FREESHIP",
        discount_percent: 0,
        description: "Free shipping on all course materials",
      },
    ]);
  },
  {
    name: "getOffers",
    description:
      "Get the latest offers, discounts, and promo codes available for courses.",
  }
);
