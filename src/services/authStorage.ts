import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { AuthSession, AuthUser } from "../modules/auth/types";

const AUTH_SESSION_KEY = "auth_session_v1";
const LEGACY_AUTH_SESSION_KEY = AUTH_SESSION_KEY;
const AUTH_UNIQUE_ID_KEY = "auth_unique_id_v1";

let authSessionCache: AuthSession | null = null;

function createUniqueId() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${randomPart}`;
}

export async function hydrateAuthSession(): Promise<AuthSession | null> {
  let raw = await SecureStore.getItemAsync(AUTH_SESSION_KEY);

  // Migrate existing sessions once. Tokens must not remain in AsyncStorage
  // after the first successful secure write.
  if (!raw) {
    const legacyRaw = await AsyncStorage.getItem(LEGACY_AUTH_SESSION_KEY);
    if (legacyRaw) {
      raw = legacyRaw;
    }
  }

  if (!raw) {
    authSessionCache = null;
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (
      typeof parsed.token !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      typeof parsed.uniqueId !== "string" ||
      !parsed.user
    ) {
      throw new Error("Invalid auth session");
    }

    authSessionCache = parsed;

    if (!(await SecureStore.getItemAsync(AUTH_SESSION_KEY))) {
      await SecureStore.setItemAsync(AUTH_SESSION_KEY, JSON.stringify(parsed));
      await AsyncStorage.removeItem(LEGACY_AUTH_SESSION_KEY);
    }

    return parsed;
  } catch {
    authSessionCache = null;
    await Promise.all([
      SecureStore.deleteItemAsync(AUTH_SESSION_KEY),
      AsyncStorage.removeItem(LEGACY_AUTH_SESSION_KEY),
    ]);
    return null;
  }
}

export function getAuthSessionSync(): AuthSession | null {
  return authSessionCache;
}

export async function setAuthSession(session: AuthSession): Promise<void> {
  await SecureStore.setItemAsync(AUTH_SESSION_KEY, JSON.stringify(session));
  await AsyncStorage.removeItem(LEGACY_AUTH_SESSION_KEY);
  authSessionCache = session;
}

export async function updateAuthUserInSession(
  patch: Partial<AuthUser>,
): Promise<AuthSession | null> {
  const session = authSessionCache ?? (await hydrateAuthSession());
  if (!session) {
    return null;
  }

  const updatedSession: AuthSession = {
    ...session,
    user: {
      ...session.user,
      ...patch,
    },
  };

  await setAuthSession(updatedSession);
  return updatedSession;
}

export async function clearAuthSession(): Promise<void> {
  authSessionCache = null;
  await Promise.all([
    SecureStore.deleteItemAsync(AUTH_SESSION_KEY),
    AsyncStorage.removeItem(LEGACY_AUTH_SESSION_KEY),
  ]);
}

export async function getOrCreateUniqueId(): Promise<string> {
  const existing = await AsyncStorage.getItem(AUTH_UNIQUE_ID_KEY);
  if (existing) {
    return existing;
  }

  const uniqueId = createUniqueId();
  await AsyncStorage.setItem(AUTH_UNIQUE_ID_KEY, uniqueId);
  return uniqueId;
}
