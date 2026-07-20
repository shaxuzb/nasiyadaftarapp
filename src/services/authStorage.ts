import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthSession, AuthUser } from "../modules/auth/types";

const AUTH_SESSION_KEY = "auth_session_v1";
const AUTH_UNIQUE_ID_KEY = "auth_unique_id_v1";

let authSessionCache: AuthSession | null = null;

function createUniqueId() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${randomPart}`;
}

export async function hydrateAuthSession(): Promise<AuthSession | null> {
  const raw = await AsyncStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) {
    authSessionCache = null;
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    authSessionCache = parsed;
    return parsed;
  } catch {
    authSessionCache = null;
    await AsyncStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

export function getAuthSessionSync(): AuthSession | null {
  return authSessionCache;
}

export async function setAuthSession(session: AuthSession): Promise<void> {
  authSessionCache = session;
  await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
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
  await AsyncStorage.removeItem(AUTH_SESSION_KEY);
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
