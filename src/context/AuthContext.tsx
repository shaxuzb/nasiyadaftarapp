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
import { appleAccount } from "../modules/auth/services/appleAuthApi";
import {
  clearAuthSession,
  getAuthSessionSync,
  getOrCreateUniqueId,
  hydrateAuthSession,
  setAuthSession,
  updateAuthUserInSession,
} from "../modules/auth/services/authService";
import {
  AppleLoginRequest,
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
  OrganizationMembership,
  OrganizationRequest,
} from "../modules/organization/types";
import { getCurrentSubscription } from "../modules/subscription/services/subscriptionService";
import { canCreateOrganization } from "../modules/subscription/utils/entitlements";
import { isAuthResponse } from "../modules/auth/utils/authResponse";
import { clearPaymentLifecycleForUser } from "../modules/payments/services/paymentStorage";
import {
  clearOrganizationQueries,
  invalidateAccountDependentQueries,
} from "../core/query/queryInvalidation";
import { queryClient } from "../core/query/queryClient";
import { queryKeys } from "../core/query/queryKeys";
import { getOrganizationSelectionBackAction } from "./organizationSelection";
import { unregisterPushDevice } from "../modules/push/services/pushService";

interface AuthContextValue {
  user: AuthUser | null;
  organizations: OrganizationMembership[];
  currentOrganization: OrganizationMembership | null;
  isBootstrapping: boolean;
  isOrganizationLoading: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  loginWithGoogleIdToken: (idToken: string) => Promise<void>;
  loginWithAppleCredential: (payload: AppleLoginRequest) => Promise<void>;
  createOrganizationForCurrentUser: (
    payload: OrganizationRequest,
  ) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
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

  const updateUserProfile = useCallback(async (patch: Partial<AuthUser>) => {
    const updatedSession = await updateAuthUserInSession(patch);
    if (updatedSession) {
      setUser(updatedSession.user);
    } else {
      setUser((current) => (current ? { ...current, ...patch } : current));
    }

    await invalidateAccountDependentQueries();
  }, []);

  const syncSubscription = useCallback(
    async (baseUser: AuthUser) => {
      try {
        const subscription = await getCurrentSubscription();
        queryClient.setQueryData(
          queryKeys.subscriptionCurrent(baseUser.id),
          subscription,
        );
        await persistUser({ ...baseUser, subscription });
      } catch (error) {
        if (__DEV__) console.warn("Subscription refresh failed", error);
      }
    },
    [persistUser],
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
      await syncSubscription(getAuthSessionSync()?.user ?? authenticatedUser);
    },
    [resolveOrganizations, syncSubscription],
  );

  const refreshOrganizations = useCallback(async () => {
    if (!user) return;
    await resolveOrganizations(user);
  }, [resolveOrganizations, user]);

  const refreshSubscription = useCallback(async () => {
    if (!user) return;
    const subscription = await getCurrentSubscription();
    queryClient.setQueryData(
      queryKeys.subscriptionCurrent(user.id),
      subscription,
    );
    await persistUser({ ...user, subscription });
  }, [persistUser, user]);

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
        await applyOrganizationSelection(
          user,
          availableOrganizations,
          organizationId,
        );
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
      if (
        !canCreateOrganization(user.subscription, existingOrganizations.length)
      ) {
        const limit = user.subscription?.maxOrganizations ?? 0;
        throw new Error(
          `Joriy tarif bo'yicha ko'pi bilan ${limit} ta tashkilot yaratish mumkin`,
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
    const paymentUserId = user?.id ?? session?.user.id ?? null;

    if (session?.uniqueId) {
      void unregisterPushDevice(session.uniqueId).catch(() => undefined);
    }

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

    if (paymentUserId) {
      await clearPaymentLifecycleForUser(paymentUserId).catch(() => undefined);
    }
    queryClient.removeQueries({ queryKey: queryKeys.paymentsRoot() });
    queryClient.removeQueries({ queryKey: ["push"] });
    clearOrganizationQueries();
    await clearAuthSession();
    previousOrganizationRef.current = null;
    setOrganizationSelectionReturnTab(null);
    setCurrentOrganization(null);
    setOrganizations([]);
    setUser(null);
  }, [user]);

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

  const loginWithAppleCredential = useCallback(
    async (payload: AppleLoginRequest) => {
      const response = await appleAccount(payload);
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
          await syncSubscription(getAuthSessionSync()?.user ?? session.user);
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
  }, [resolveOrganizations, syncSubscription]);

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
      loginWithAppleCredential,
      createOrganizationForCurrentUser,
      refreshOrganizations,
      refreshSubscription,
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
      loginWithAppleCredential,
      loginWithGoogleIdToken,
      logout,
      openOrganizationSelector,
      organizationSelectionReturnTab,
      organizations,
      refreshOrganizations,
      refreshSubscription,
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
