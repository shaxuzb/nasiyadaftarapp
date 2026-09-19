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
}

export interface PushNotificationPage {
  count: number;
  results: PushNotification[];
}

export interface PushNotificationListParams {
  page: number;
  pageSize: number;
}
