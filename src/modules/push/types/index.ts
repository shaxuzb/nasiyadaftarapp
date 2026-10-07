export type PushPlatform = "android" | "ios";

export interface PushDevicePayload {
  installationId: string;
  platform: PushPlatform;
  token: string;
}

export interface PushNotification {
  id: number;
  title: string;
  body: string;
  createdDate: string;
  isRead: boolean;
  /** Where tapping it leads: "/path" in the app or an outside address. */
  link: string | null;
}

export interface PushNotificationPage {
  count: number;
  results: PushNotification[];
}

export interface PushNotificationListParams {
  page: number;
  pageSize: number;
}
