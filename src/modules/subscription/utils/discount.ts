/**
 * A plan or an SMS package on offer. The backend sends the price before the
 * discount (`oldPrice`) and how much was taken off (`discountPercent`); both
 * are for display only. What is charged is always `price`.
 */
export interface DiscountablePrice {
  price: number;
  oldPrice?: number | null;
  discountPercent?: number | null;
}

export interface PriceDiscount {
  /** The price to show struck through. */
  oldPrice: number;
  /** The percentage for the badge, or null when the server did not send one. */
  percent: number | null;
}

/**
 * The discount to show, or null when there is none.
 *
 * There is a discount only when the old price is higher than the current one;
 * an old price that is equal or lower would advertise a saving that does not
 * exist. The percentage is shown only as the server sent it and never worked
 * out here, so the badge cannot disagree with the server by a rounding step.
 */
export function getPriceDiscount(product: DiscountablePrice): PriceDiscount | null {
  const { price, oldPrice, discountPercent } = product;
  if (
    typeof oldPrice !== "number" ||
    !Number.isFinite(oldPrice) ||
    oldPrice <= price
  ) {
    return null;
  }

  const percent =
    typeof discountPercent === "number" &&
    Number.isFinite(discountPercent) &&
    discountPercent > 0 &&
    discountPercent <= 100
      ? discountPercent
      : null;

  return { oldPrice, percent };
}

/** "-20%", or "-12.5%" when the server sends a fraction. */
export function formatDiscountPercent(percent: number): string {
  return `-${Number(percent.toFixed(1))}%`;
}
