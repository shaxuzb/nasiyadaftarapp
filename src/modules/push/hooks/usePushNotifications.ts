import { useContext } from "react";
import { PushNotificationContext } from "../context/PushNotificationContext";

export function usePushNotifications() {
  const value = useContext(PushNotificationContext);
  if (!value) {
    throw new Error(
      "usePushNotifications must be used inside PushNotificationProvider",
    );
  }
  return value;
}
