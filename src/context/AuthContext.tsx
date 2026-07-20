import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  googleAccount,
  loginAccount,
  logoutAccount,
  registerAccount,
} from "../modules/auth/services/authService";
import {
  clearAuthSession,
  getAuthSessionSync,
  getOrCreateUniqueId,
  hydrateAuthSession,
  setAuthSession,
  updateAuthUserInSession,
} from "../modules/auth/services/authService";
import {
  AuthResponse,
  AuthUser,
  GoogleLoginRequest,
  LoginRequest,
  RegisterRequest,
} from "../modules/auth/types";
import { setUnauthorizedHandler } from "../services/axiosService";
import {
  createOrganization,
  getCurrentOrganization,
} from "../modules/organization/services/organizationService";
import {
  OrganizationRequest,
  OrganizationResponse,
} from "../modules/organization/types";
import { isAuthResponse } from "../modules/auth/utils/authResponse";

interface AuthContextValue {
  user: AuthUser | null;
  currentOrganization: OrganizationResponse | null;
  isBootstrapping: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  loginWithGoogleIdToken: (idToken: string) => Promise<void>;
  createOrganizationForCurrentUser: (payload: OrganizationRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<OrganizationResponse | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const completeAuth = useCallback(async (response: AuthResponse) => {
    const uniqueId = await getOrCreateUniqueId();
    await setAuthSession({
      token: response.token,
      refreshToken: response.refreshToken,
      user: response.user,
      uniqueId,
    });
    setUser(response.user);
  }, []);

  const updateOrganizationState = useCallback(
    async (patch: Partial<AuthUser>) => {
      const updatedSession = await updateAuthUserInSession(patch);
      if (updatedSession) {
        setUser(updatedSession.user);
      } else {
        setUser((prev) => (prev ? { ...prev, ...patch } : prev));
      }
    },
    [],
  );

  const syncOrganization = useCallback(async () => {
    try {
      const current = await getCurrentOrganization();
      setCurrentOrganization(current);

      if (current) {
        await updateOrganizationState({
          hasOrganization: true,
          organizationId: current.id,
          organizationName: current.name,
        });
      } else {
        await updateOrganizationState({ hasOrganization: false });
      }
    } catch {
      setCurrentOrganization(null);
      await updateOrganizationState({ hasOrganization: false });
    }
  }, [updateOrganizationState]);

  const createOrganizationForCurrentUser = useCallback(
    async (payload: OrganizationRequest) => {
      const created = await createOrganization(payload);

      setCurrentOrganization(
        created ?? {
          id: user?.organizationId ?? 0,
          name: payload.name,
          phoneNumber: payload.phoneNumber,
          address: payload.address,
          note: payload.note,
        },
      );

      await updateOrganizationState({
        hasOrganization: true,
        organizationId: created?.id ?? user?.organizationId ?? null,
        organizationName: created?.name ?? payload.name,
      });
    },
    [updateOrganizationState, user?.organizationId],
  );

  const logout = useCallback(async () => {
    const session = getAuthSessionSync() ?? (await hydrateAuthSession());

    if (session?.refreshToken && session.uniqueId) {
      try {
        await logoutAccount({
          refreshToken: session.refreshToken,
          uniqueId: session.uniqueId,
        });
      } catch {
        // local session still must be cleared even if logout API fails
      }
    }

    await clearAuthSession();
    setCurrentOrganization(null);
    setUser(null);
  }, []);

  const login = useCallback(
    async (payload: LoginRequest) => {
      const response = await loginAccount(payload);
      await completeAuth(response);
    },
    [completeAuth],
  );

  const register = useCallback(
    async (payload: RegisterRequest) => {
      const response = await registerAccount(payload);

      if (isAuthResponse(response)) {
        await completeAuth(response);
        return;
      }

      const loginResponse = await loginAccount({
        userName: payload.userName,
        password: payload.password,
      });
      await completeAuth(loginResponse);
    },
    [completeAuth],
  );

  const loginWithGoogleIdToken = useCallback(
    async (idToken: string) => {
      const payload: GoogleLoginRequest = { idToken };
      const response = await googleAccount(payload);
      await completeAuth(response);
    },
    [completeAuth],
  );

  useEffect(() => {
    let active = true;

    (async () => {
      const session = await hydrateAuthSession();
      await getOrCreateUniqueId();

      if (!active) return;

      setUser(session?.user ?? null);
      setIsBootstrapping(false);

      if (session?.user) {
        await syncOrganization();
      }
    })();

    return () => {
      active = false;
    };
  }, [syncOrganization]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void logout();
    });

    return () => {
      setUnauthorizedHandler(undefined);
    };
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      currentOrganization,
      isBootstrapping,
      login,
      register,
      loginWithGoogleIdToken,
      createOrganizationForCurrentUser,
      logout,
    }),
    [
      createOrganizationForCurrentUser,
      currentOrganization,
      isBootstrapping,
      login,
      loginWithGoogleIdToken,
      logout,
      register,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
