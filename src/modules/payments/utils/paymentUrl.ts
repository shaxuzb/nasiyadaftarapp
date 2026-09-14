type CheckoutUrlSource = {
  paymentUrl: string | null;
  paymentLinks: { payme: string | null };
};

function asHttpsUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getPaymentCheckoutUrl(order: CheckoutUrlSource): string | null {
  return asHttpsUrl(order.paymentUrl) ?? asHttpsUrl(order.paymentLinks.payme);
}
