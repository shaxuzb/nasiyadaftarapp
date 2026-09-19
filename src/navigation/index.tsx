import React from "react";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../hooks/useTheme";
import { useThemeContext } from "../context/ThemeContext";

import { CustomersScreen } from "../screens/CustomersScreen";
import { ReportsScreen } from "../screens/ReportsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";

import { CustomerDetailScreen } from "../screens/CustomerDetailScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { RegisterSmsVerifyScreen } from "../screens/RegisterSmsVerifyScreen";
import { OrganizationSetupScreen } from "../screens/OrganizationSetupScreen";
import { OrganizationSelectScreen } from "../screens/OrganizationSelectScreen";
import { PasswordResetRequestScreen } from "../screens/PasswordResetRequestScreen";
import { PasswordResetConfirmScreen } from "../screens/PasswordResetConfirmScreen";
import { AccountSecurityScreen } from "../screens/AccountSecurityScreen";
import { PinChangeScreen } from "../modules/pin-auth/screens/PinChangeScreen";
import { ClientSmsScreen } from "../screens/ClientSmsScreen";
import { ClientSmsHistoryScreen } from "../screens/ClientSmsHistoryScreen";
import { BlacklistSettingsScreen } from "../screens/BlacklistSettingsScreen";
import { SubscriptionScreen } from "../screens/SubscriptionScreen";
import { PaymentHistoryScreen } from "../screens/PaymentHistoryScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { NotificationSettingsScreen } from "../screens/NotificationSettingsScreen";

import {
  AuthStackParamList,
  RootStackParamList,
  MainTabParamList,
  OrganizationStackParamList,
} from "../types";
import { useAuth } from "../context/AuthContext";
import { BottomSheetBackHandler } from "../bottom-sheet";
import { PinGateScreen } from "../modules/pin-auth/screens/PinGateScreen";
import { useAppLock } from "@/modules/pin-auth/context/AppLockContext";
import { getClientSmsCapabilities } from "../modules/client-sms/utils/smsPermissions";
import { useTranslation } from "../i18n";
import { usePushNotifications } from "../modules/push/hooks/usePushNotifications";
import { PushInAppBanner } from "../modules/push/components/PushInAppBanner";
import {
  consumePendingPushNavigation,
  navigateToPushNotification,
  navigationRef,
} from "./navigationRef";
import { shouldMountMainNavigator } from "./appNavigatorState";

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const OrganizationStack =
  createNativeStackNavigator<OrganizationStackParamList>();

type TabRouteName = keyof MainTabParamList;
type TabIconName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_ICONS: Record<
  TabRouteName,
  { active: TabIconName; inactive: TabIconName }
> = {
  Customers: { active: "people", inactive: "people-outline" },
  Reports: { active: "bar-chart", inactive: "bar-chart-outline" },
  ClientSms: {
    active: "chatbubble-ellipses",
    inactive: "chatbubble-ellipses-outline",
  },
  Settings: { active: "person", inactive: "person-outline" },
};

interface TabIconProps {
  routeName: TabRouteName;
  focused: boolean;
  color: string;
  activeBackground: string;
}

const TabIcon = React.memo(function TabIcon({
  routeName,
  focused,
  color,
  activeBackground,
}: TabIconProps) {
  const icon = TAB_ICONS[routeName];

  return (
    <View
      style={[styles.tabIcon, focused && { backgroundColor: activeBackground }]}
    >
      <Ionicons
        name={focused ? icon.active : icon.inactive}
        size={focused ? 22 : 21}
        color={color}
      />
    </View>
  );
});

function TabNavigator({
  initialRouteName = "Customers",
}: {
  initialRouteName?: TabRouteName;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuth();
  const canViewClientSms = getClientSmsCapabilities(user?.permissions).canView;
  const resolvedInitialRouteName =
    initialRouteName === "ClientSms" && !canViewClientSms
      ? "Customers"
      : initialRouteName;
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      initialRouteName={resolvedInitialRouteName}
      screenOptions={({ route }) => ({
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        popToTopOnBlur: true,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          height: 64 + bottomPadding,
          paddingTop: 7,
          paddingBottom: bottomPadding,
          paddingHorizontal: 8,
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBarBorder,
          borderTopWidth: 1,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderCurve: "continuous",
          boxShadow: theme.cardShadow,
        },
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 15,
          fontWeight: "700",
          marginTop: 2,
        },
        tabBarAllowFontScaling: false,
        tabBarIcon: ({ color, focused }) => {
          return (
            <TabIcon
              routeName={route.name}
              focused={focused}
              color={color}
              activeBackground={theme.primaryLight}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="Customers"
        component={CustomersScreen}
        options={{ title: t("customers.screenTitle") }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: t("reports.screenTitle") }}
      />
      {canViewClientSms ? (
        <Tab.Screen
          name="ClientSms"
          component={ClientSmsScreen}
          options={{ title: t("sms.screenTitle") }}
        />
      ) : null}
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t("profile.screenTitle") }}
      />
    </Tab.Navigator>
  );
}

function MainNavigator({ initialTab }: { initialTab?: TabRouteName }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs">
        {() => <TabNavigator initialRouteName={initialTab} />}
      </Stack.Screen>
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
      <Stack.Screen name="AccountSecurity" component={AccountSecurityScreen} />
      <Stack.Screen name="PinChange" component={PinChangeScreen} />
      <Stack.Screen name="ClientSms" component={ClientSmsScreen} />
      <Stack.Screen
        name="ClientSmsHistory"
        component={ClientSmsHistoryScreen}
      />
      <Stack.Screen
        name="BlacklistSettings"
        component={BlacklistSettingsScreen}
      />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
      />
    </Stack.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Login"
    >
      <AuthStack.Screen name="Login">
        {({ navigation }) => (
          <LoginScreen
            onGoToRegister={() => navigation.navigate("Register")}
            onGoToForgotPassword={() =>
              navigation.navigate("PasswordResetRequest")
            }
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="Register">
        {({ navigation }) => (
          <RegisterScreen
            onGoToLogin={() => navigation.navigate("Login")}
            onGoToSmsVerify={(params) =>
              navigation.navigate("RegisterSmsVerify", params)
            }
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="RegisterSmsVerify">
        {({ route, navigation }) => (
          <RegisterSmsVerifyScreen
            registerPayload={route.params.registerPayload}
            onGoBackToRegister={() => navigation.goBack()}
            onGoToLogin={() =>
              navigation.reset({ index: 0, routes: [{ name: "Login" }] })
            }
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="PasswordResetRequest">
        {({ navigation }) => (
          <PasswordResetRequestScreen
            onGoBackToLogin={() => navigation.replace("Login")}
            onGoToConfirm={(phone) =>
              navigation.replace("PasswordResetConfirm", { phone })
            }
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="PasswordResetConfirm">
        {({ route, navigation }) => (
          <PasswordResetConfirmScreen
            phone={route.params.phone}
            onGoBackToLogin={() => navigation.replace("Login")}
          />
        )}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}

function OrganizationNavigator({
  hasOrganizations,
}: {
  hasOrganizations: boolean;
}) {
  return (
    <OrganizationStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={
        hasOrganizations ? "OrganizationSelect" : "OrganizationSetup"
      }
    >
      <OrganizationStack.Screen
        name="OrganizationSelect"
        component={OrganizationSelectScreen}
      />
      <OrganizationStack.Screen
        name="OrganizationSetup"
        component={OrganizationSetupScreen}
      />
      <OrganizationStack.Screen
        name="Subscription"
        component={SubscriptionScreen}
      />
      <OrganizationStack.Screen
        name="PaymentHistory"
        component={PaymentHistoryScreen}
      />
    </OrganizationStack.Navigator>
  );
}

export function AppNavigator() {
  const theme = useTheme();
  const { resolvedScheme } = useThemeContext();
  const {
    user,
    organizations,
    currentOrganization,
    isBootstrapping,
    isOrganizationLoading,
    organizationSelectionReturnTab,
  } = useAuth();
  const { isResolving: isPinResolving, setupRequired, isLocked } = useAppLock();
  const {
    pendingNotificationId,
    hasPendingNotification,
    clearPendingNotification,
  } = usePushNotifications();
  const [navigationReady, setNavigationReady] = React.useState(false);
  const [unlockedUserId, setUnlockedUserId] = React.useState<number | null>(
    null,
  );
  const userId = user?.id ?? null;
  const currentOrganizationId = currentOrganization?.id ?? null;

  React.useEffect(() => {
    if (userId === null) {
      setUnlockedUserId(null);
      return;
    }

    if (currentOrganizationId !== null && !setupRequired && !isLocked) {
      setUnlockedUserId(userId);
    }
  }, [currentOrganizationId, isLocked, setupRequired, userId]);

  const shouldMountMain = shouldMountMainNavigator({
    userId,
    organizationId: currentOrganizationId,
    isLocked,
    setupRequired,
    unlockedUserId,
  });
  const showPinGate = Boolean(user && (setupRequired || isLocked));

  const navTheme = React.useMemo(() => {
    const baseTheme = resolvedScheme === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: theme.primary,
        background: theme.background,
        card: theme.surface,
        text: theme.text,
        border: theme.border,
        notification: theme.debtColor,
      },
    };
  }, [resolvedScheme, theme]);

  React.useEffect(() => {
    const mainNavigatorActive = Boolean(
      user && currentOrganization && !setupRequired && !isLocked,
    );
    if (!navigationReady || !mainNavigatorActive || !hasPendingNotification) {
      return;
    }

    navigateToPushNotification(pendingNotificationId);
    clearPendingNotification();
  }, [
    clearPendingNotification,
    currentOrganization,
    hasPendingNotification,
    isLocked,
    navigationReady,
    pendingNotificationId,
    setupRequired,
    user,
  ]);

  if (isBootstrapping || isOrganizationLoading || isPinResolving) {
    return (
      <View
        style={[styles.loader, { backgroundColor: navTheme.colors.background }]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          setNavigationReady(true);
          const pending = consumePendingPushNavigation();
          if (pending !== undefined) navigateToPushNotification(pending);
        }}
        theme={navTheme}
      >
      <BottomSheetBackHandler />
      {!user ? (
        <AuthNavigator />
      ) : shouldMountMain && currentOrganization ? (
        <>
          <MainNavigator
            initialTab={organizationSelectionReturnTab ?? undefined}
          />
          {showPinGate ? (
            <View
              pointerEvents="auto"
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: theme.background },
              ]}
            >
              <PinGateScreen />
            </View>
          ) : null}
        </>
      ) : showPinGate ? (
        <PinGateScreen />
      ) : (
        <OrganizationNavigator hasOrganizations={organizations.length > 0} />
      )}
      </NavigationContainer>
      <PushInAppBanner />
    </>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    minHeight: 54,
    borderRadius: 16,
    borderCurve: "continuous",
  },
  tabIcon: {
    width: 42,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
