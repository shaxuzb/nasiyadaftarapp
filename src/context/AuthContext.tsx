import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  googleAccount,
  loginAccount,
  logoutAccount,
  registerAccount,
  selectOrganizationAccount,
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
  OrganizationSelectResponse,
  RegisterRequest,
} from "../modules/auth/types";
import { setUnauthorizedHandler } from "../services/axiosService";
import {
  createOrganization,
  getManualOrganizations,
} from "../modules/organization/services/organizationService";
import {
  MAX_ORGANIZATIONS_PER_USER,
  OrganizationMembership,
  OrganizationRequest,
} from "../modules/organization/types";
import { isAuthResponse } from "../modules/auth/utils/authResponse";
import {
  clearOrganizationQueries,
  invalidateAccountDependentQueries,
} from "../core/query/queryInvalidation";
import { getOrganizationSelectionBackAction } from "./organizationSelection";

interface AuthContextValue {
  user: AuthUser | null;
  organizations: OrganizationMembership[];
  currentOrganization: OrganizationMembership | null;
  isBootstrapping: boolean;
  isOrganizationLoading: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  loginWithGoogleIdToken: (idToken: string) => Promise<void>;
  createOrganizationForCurrentUser: (
    payload: OrganizationRequest,
  ) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
  selectOrganization: (organizationId: number) => Promise<void>;
  openOrganizationSelector: () => Promise<void>;
  cancelOrganizationSelection: () => Promise<void>;
  organizationSelectionReturnTab: "Settings" | null;
  updateUserProfile: (patch: Partial<AuthUser>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getSelectedOrganization(
  organizations: OrganizationMembership[],
  organizationId?: number | null,
): OrganizationMembership | null {
  if (typeof organizationId !== "number") return null;
  return (
    organizations.find((organization) => organization.id === organizationId) ??
    null
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationMembership[]>(
    [],
  );
  const [currentOrganization, setCurrentOrganization] =
    useState<OrganizationMembership | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isOrganizationLoading, setIsOrganizationLoading] = useState(false);
  const previousOrganizationRef = useRef<OrganizationMembership | null>(null);
  const [organizationSelectionReturnTab, setOrganizationSelectionReturnTab] =
    useState<"Settings" | null>(null);

  const persistUser = useCallback(async (nextUser: AuthUser) => {
    const session = getAuthSessionSync() ?? (await hydrateAuthSession());
    if (session) {
      await setAuthSession({ ...session, user: nextUser });
    }
    setUser(nextUser);
  }, []);

  const updateUserProfile = useCallback(
    async (patch: Partial<AuthUser>) => {
      const updatedSession = await updateAuthUserInSession(patch);
      if (updatedSession) {
        setUser(updatedSession.user);
      } else {
        setUser((current) => (current ? { ...current, ...patch } : current));
      }

      await invalidateAccountDependentQueries();
    },
    [],
  );

  const applyOrganizationSelection = useCallback(
    async (
      baseUser: AuthUser,
      availableOrganizations: OrganizationMembership[],
      organizationId: number,
    ) => {
      const selected = getSelectedOrganization(
        availableOrganizations,
        organizationId,
      );
      if (!selected) {
        throw new Error("Tanlangan tashkilot topilmadi");
      }

      const response: OrganizationSelectResponse =
        (await selectOrganizationAccount(organizationId)) ?? {};
      const nextOrganizations =
        response.user?.organizations ?? availableOrganizations;
      const nextUser: AuthUser = {
        ...baseUser,
        ...response.user,
        organizations: nextOrganizations,
        hasOrganization: true,
        organizationId,
        organizationName: selected.name,
      };
      const session = getAuthSessionSync() ?? (await hydrateAuthSession());

      if (session) {
        await setAuthSession({
          ...session,
          token: response.token ?? session.token,
          refreshToken: response.refreshToken ?? session.refreshToken,
          user: nextUser,
        });
      }

      clearOrganizationQueries();
      setOrganizations(nextOrganizations);
      previousOrganizationRef.current = null;
      setOrganizationSelectionReturnTab(null);
      setCurrentOrganization(selected);
      setUser(nextUser);
    },
    [],
  );

  const resolveOrganizations = useCallback(
    async (baseUser: AuthUser) => {
      setIsOrganizationLoading(true);
      try {
        let availableOrganizations: OrganizationMembership[];
        try {
          availableOrganizations = await getManualOrganizations();
        } catch (error) {
          if (baseUser.organizations?.length) {
            availableOrganizations = baseUser.organizations;
          } else {
            throw error;
          }
        }

        setOrganizations(availableOrganizations);
        const selected = getSelectedOrganization(
          availableOrganizations,
          baseUser.organizationId,
        );

        if (selected) {
          setCurrentOrganization(selected);
          await persistUser({
            ...baseUser,
            organizations: availableOrganizations,
            hasOrganization: true,
            organizationName: selected.name,
          });
          return;
        }

        if (availableOrganizations.length === 1) {
          await applyOrganizationSelection(
            baseUser,
            availableOrganizations,
            availableOrganizations[0].id,
          );
          return;
        }

        setCurrentOrganization(null);
        await persistUser({
          ...baseUser,
          organizations: availableOrganizations,
          organizationId: null,
          organizationName: null,
          hasOrganization: availableOrganizations.length > 0,
        });
      } finally {
        setIsOrganizationLoading(false);
      }
    },
    [applyOrganizationSelection, persistUser],
  );

  const completeAuth = useCallback(
    async (response: AuthResponse) => {
      const uniqueId = await getOrCreateUniqueId();
      const authenticatedUser: AuthUser = {
        ...response.user,
        organizations: response.user.organizations ?? [],
      };

      await setAuthSession({
        token: response.token,
        refreshToken: response.refreshToken,
        user: authenticatedUser,
        uniqueId,
      });
      setUser(authenticatedUser);
      setOrganizations(authenticatedUser.organizations ?? []);
      setCurrentOrganization(null);
      await resolveOrganizations(authenticatedUser);
    },
    [resolveOrganizations],
  );

  const refreshOrganizations = useCallback(async () => {
    if (!user) return;
    await resolveOrganizations(user);
  }, [resolveOrganizations, user]);

  const selectOrganization = useCallback(
    async (organizationId: number) => {
      if (!user) throw new Error("Tashkilotni tanlash uchun tizimga kiring");

      setIsOrganizationLoading(true);
      try {
        let availableOrganizations = organizations;
        if (!getSelectedOrganization(availableOrganizations, organizationId)) {
          availableOrganizations = await getManualOrganizations();
          setOrganizations(availableOrganizations);
        }
        await applyOrganizationSelection(user, availableOrganizations, organizationId);
      } finally {
        setIsOrganizationLoading(false);
      }
    },
    [applyOrganizationSelection, organizations, user],
  );

  const openOrganizationSelector = useCallback(async () => {
    if (!user) return;
    previousOrganizationRef.current = currentOrganization;
    setOrganizationSelectionReturnTab(currentOrganization ? "Settings" : null);
    setCurrentOrganization(null);
    await updateUserProfile({ organizationId: null, organizationName: null });
  }, [currentOrganization, updateUserProfile, user]);

  const createOrganizationForCurrentUser = useCallback(
    async (payload: OrganizationRequest) => {
      if (!user) throw new Error("Tashkilot yaratish uchun tizimga kiring");

      const existingOrganizations = await getManualOrganizations();
      if (existingOrganizations.length >= MAX_ORGANIZATIONS_PER_USER) {
        throw new Error(
          `Ko'pi bilan ${MAX_ORGANIZATIONS_PER_USER} ta tashkilot yaratish mumkin`,
        );
      }

      const created = await createOrganization(payload);
      clearOrganizationQueries();
      const availableOrganizations = await getManualOrganizations();
      const target =
        (created &&
          getSelectedOrganization(availableOrganizations, created.id)) ||
        availableOrganizations.find(
          (organization) =>
            organization.name.trim().toLocaleLowerCase() ===
            payload.name.trim().toLocaleLowerCase(),
        );

      if (!target) {
        throw new Error("Yaratilgan tashkilotni aniqlab bo'lmadi");
      }

      setOrganizations(availableOrganizations);
      setIsOrganizationLoading(true);
      try {
        await applyOrganizationSelection(
          user,
          availableOrganizations,
          target.id,
        );
      } finally {
        setIsOrganizationLoading(false);
      }
    },
    [applyOrganizationSelection, user],
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
        // Local credentials must still be cleared when the logout request fails.
      }
    }

    clearOrganizationQueries();
    await clearAuthSession();
    previousOrganizationRef.current = null;
    setOrganizationSelectionReturnTab(null);
    setCurrentOrganization(null);
    setOrganizations([]);
    setUser(null);
  }, []);

  const cancelOrganizationSelection = useCallback(async () => {
    const action = getOrganizationSelectionBackAction(
      previousOrganizationRef.current,
    );
    previousOrganizationRef.current = null;

    if (action.type === "logout") {
      setOrganizationSelectionReturnTab(null);
      await logout();
      return;
    }

    setOrganizationSelectionReturnTab("Settings");
    setCurrentOrganization(action.organization);
    await updateUserProfile({
      organizationId: action.organization.id,
      organizationName: action.organization.name,
      hasOrganization: true,
    });
  }, [logout, updateUserProfile]);

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
      try {
        const session = await hydrateAuthSession();
        await getOrCreateUniqueId();
        if (!active) return;

        if (session?.user) {
          setUser(session.user);
          setOrganizations(session.user.organizations ?? []);
          await resolveOrganizations(session.user);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn("Auth bootstrap failed", error);
        }
        if (active) {
          setCurrentOrganization(null);
          setOrganizations([]);
          setUser(null);
        }
      } finally {
        if (active) {
          setIsBootstrapping(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [resolveOrganizations]);

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
      organizations,
      currentOrganization,
      isBootstrapping,
      isOrganizationLoading,
      login,
      register,
      loginWithGoogleIdToken,
      createOrganizationForCurrentUser,
      refreshOrganizations,
      selectOrganization,
      openOrganizationSelector,
      cancelOrganizationSelection,
      organizationSelectionReturnTab,
      updateUserProfile,
      logout,
    }),
    [
      createOrganizationForCurrentUser,
      currentOrganization,
      cancelOrganizationSelection,
      isBootstrapping,
      isOrganizationLoading,
      login,
      loginWithGoogleIdToken,
      logout,
      openOrganizationSelector,
      organizationSelectionReturnTab,
      organizations,
      refreshOrganizations,
      register,
      selectOrganization,
      updateUserProfile,
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
