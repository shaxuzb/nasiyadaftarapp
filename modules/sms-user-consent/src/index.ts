import { requireOptionalNativeModule } from "expo";
import type { EventSubscription } from "expo-modules-core";

export interface SmsUserConsentCodeEvent {
  code: string;
}

export interface SmsUserConsentErrorEvent {
  code: string;
  message: string;
}

type SmsUserConsentEvents = {
  onCodeReceived: (event: SmsUserConsentCodeEvent) => void;
  onConsentCancelled: () => void;
  onError: (event: SmsUserConsentErrorEvent) => void;
};

interface SmsUserConsentNativeModule {
  startListening: () => Promise<void>;
  stopListening: () => void;
  addListener: <EventName extends keyof SmsUserConsentEvents>(
    eventName: EventName,
    listener: SmsUserConsentEvents[EventName],
  ) => EventSubscription;
}

const nativeModule =
  requireOptionalNativeModule<SmsUserConsentNativeModule>("SmsUserConsent");
const eventEmitter = nativeModule;

export const isAvailable = nativeModule !== null;

export async function startListening(): Promise<void> {
  await nativeModule?.startListening();
}

export function stopListening(): void {
  void nativeModule?.stopListening();
}

export function addCodeListener(
  listener: (event: SmsUserConsentCodeEvent) => void,
): EventSubscription | null {
  return eventEmitter?.addListener("onCodeReceived", listener) ?? null;
}

export function addErrorListener(
  listener: (event: SmsUserConsentErrorEvent) => void,
): EventSubscription | null {
  return eventEmitter?.addListener("onError", listener) ?? null;
}

export function addConsentCancelledListener(
  listener: () => void,
): EventSubscription | null {
  return eventEmitter?.addListener("onConsentCancelled", listener) ?? null;
}
