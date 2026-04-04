import React from "react";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import { lightTheme, darkTheme } from "../theme";
import { useTheme } from "../hooks/useTheme";

// Screens - Tabs
import { CustomersScreen } from "../screens/CustomersScreen";
import { ReportsScreen } from "../screens/ReportsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";

// Screens - Stack
import { CustomerDetailScreen } from "../screens/CustomerDetailScreen";
import { AddCustomerScreen } from "../screens/AddCustomerScreen";
import { AddTransactionScreen } from "../screens/AddTransactionScreen";

import { RootStackParamList, MainTabParamList } from "../types";

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function TabNavigator() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="Customers"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBarBorder,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarIcon: ({ color, focused }) => {
          const icons: Record<
            string,
            [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]
          > = {
            Customers: ["people", "people-outline"],
            Reports: ["bar-chart", "bar-chart-outline"],
            Settings: ["settings", "settings-outline"],
          };
          const [filled, outline] = icons[route.name] ?? [
            "home",
            "home-outline",
          ];
          return (
            <Ionicons
              name={focused ? filled : outline}
              size={22}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="Customers"
        component={CustomersScreen}
        options={{ title: "Bosh sahifa" }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: "Hisobotlar" }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Sozlamalar" }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const scheme = useColorScheme();

  const navTheme = {
    ...(scheme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === "dark" ? DarkTheme : DefaultTheme).colors,
      background:
        scheme === "dark" ? darkTheme.background : lightTheme.background,
      card: scheme === "dark" ? darkTheme.surface : lightTheme.surface,
      text: scheme === "dark" ? darkTheme.text : lightTheme.text,
      border: scheme === "dark" ? darkTheme.border : lightTheme.border,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
        <Stack.Screen name="AddCustomer" component={AddCustomerScreen} />
        <Stack.Screen
          name="AddTransaction"
          options={{
            presentation: "transparentModal",
            animation: "fade_from_bottom",
            contentStyle: { backgroundColor: "transparent" },
          }}
          component={AddTransactionScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
