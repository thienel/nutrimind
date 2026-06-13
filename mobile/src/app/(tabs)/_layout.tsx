import { Tabs } from "expo-router";
import { Bot, ChartColumn, House, UserRound } from "lucide-react-native";
import type { ReactNode } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

type TabIconProps = {
  focused: boolean;
  children: ReactNode;
  badgeCount?: number;
};

const TAB_BADGES = {
  home: 0,
  progress: 0,
  coach: 1,
  profile: 0,
};

function TabIcon({ focused, children, badgeCount = 0 }: TabIconProps) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      {children}

      {badgeCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badgeCount > 99 ? "99+" : badgeCount}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#10B981",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarHideOnKeyboard: true,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused} badgeCount={TAB_BADGES.home}>
              <House
                color={color}
                size={focused ? size + 2 : size}
                strokeWidth={focused ? 2.8 : 2.2}
              />
            </TabIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused} badgeCount={TAB_BADGES.progress}>
              <ChartColumn
                color={color}
                size={focused ? size + 2 : size}
                strokeWidth={focused ? 2.8 : 2.2}
              />
            </TabIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="coach"
        options={{
          title: "AI Coach",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused} badgeCount={TAB_BADGES.coach}>
              <Bot
                color={color}
                size={focused ? size + 2 : size}
                strokeWidth={focused ? 2.8 : 2.2}
              />
            </TabIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused} badgeCount={TAB_BADGES.profile}>
              <UserRound
                color={color}
                size={focused ? size + 2 : size}
                strokeWidth={focused ? 2.8 : 2.2}
              />
            </TabIcon>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === "ios" ? 88 : 76,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    paddingHorizontal: 12,
    borderTopWidth: 0,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },

  tabBarItem: {
    borderRadius: 18,
  },

  tabBarLabel: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },

  iconWrap: {
    width: 42,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  iconWrapActive: {
    backgroundColor: "#ECFDF5",
  },

  badge: {
    position: "absolute",
    top: -4,
    right: 2,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 11,
  },
});