import type { PaymentCopy } from "../paymentCopy";

/** Words of the payment flow (checkout, status, history), in English. */
export const enPaymentCopy: PaymentCopy = {
  checkout: {
    externalHint:
      "Payment continues on a secure external page. Card details are not entered in the app.",
    freeHint:
      "This plan is free. Activation starts on our server after you confirm.",
    methodTitle: "Payment method",
    methodHint: "Choose a payment method to continue",
    pay: "Pay {amount}",
    activate: "Switch to plan",
    buyPackage: "Buy SMS package",
    processing: "Preparing payment...",
    cancel: "Cancel",
    error: "Could not create the payment order",
  },
  pendingBanner: {
    title: "Payment pending",
    multiple: "{count} payments pending",
    select: "Choose one to continue",
    plan: "Plan",
    package: "SMS package",
    action: "Continue",
  },
  pendingSheet: {
    title: "Pending payments",
    description: "Choose an order to continue.",
    plan: "Plan",
    package: "SMS package",
    pending: "Payment pending",
    holding: "Payment processing",
    activating: "Activating",
    loading: "Loading payment details...",
    continue: "Continue",
    close: "Close",
    empty: "No pending payments found.",
  },
  statusSheet: {
    title: "Payment status",
    waiting:
      "The payment is not finished yet. You can continue the payment or check its status.",
    holding:
      "The provider is processing the payment. Refresh the status in a moment.",
    activating:
      "Payment received. The service is being activated.",
    success: "Payment completed and the service is activated.",
    refunded:
      "The payment was refunded. Choose a plan or SMS package to buy again.",
    terminal:
      "This payment is closed. Choose a plan or SMS package again to make a new purchase.",
    continue: "Continue payment",
    refresh: "Refresh status",
    cancel: "Cancel payment",
    close: "Close",
    cancelTitle: "Cancel the payment?",
    cancelMessage: "Only an order that hasn't been paid yet will be cancelled.",
    error: "Could not refresh the payment status",
    openError: "Could not open the payment page",
    loading: "Loading payment details...",
  },
  detailSheet: {
    title: "Payment details",
    continue: "Continue payment",
    refresh: "Refresh status",
    cancel: "Cancel payment",
    close: "Close",
    cancelTitle: "Cancel the payment?",
    cancelMessage: "Only an order that hasn't been paid yet will be cancelled.",
    error: "Could not refresh payment details",
    openError: "Could not open the payment page",
    loading: "Loading payment details...",
  },
  history: {
    title: "Payment history",
    empty: "No payments yet",
    error: "Could not load payments",
    retry: "Try again",
    fulfilled: "Activated",
  },
  order: {
    status: {
      pending: "Payment pending",
      holding: "Payment processing",
      paid: "Payment received",
      cancelled: "Payment cancelled",
      failed: "Payment failed",
      expired: "Payment expired",
      refunded: "Payment refunded",
    },
    fulfilled: "Service activated",
    provider: "Provider",
    account: "Account number",
    created: "Created",
    paid: "Paid",
    fulfilledAt: "Activated",
    orderId: "Order ID",
  },
};
