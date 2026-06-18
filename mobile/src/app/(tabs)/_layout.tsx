import React, { type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Tabs, router } from "expo-router";
import { Bot, ChartColumn, House, Plus, UserRound } from "lucide-react-native";

const TAB_BADGES = {
  home: 0,
  progress: 0,
  coach: 1,
  profile: 0,
};

export default function TabsLayout() {
  return (
    <View style={styles.root}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                active={focused}
                label="Home"
                badgeCount={TAB_BADGES.home}
              >
                <House
                  size={22}
                  color={focused ? "#10B981" : "#94A3B8"}
                  strokeWidth={2.4}
                />
              </TabIcon>
            ),
          }}
        />

        <Tabs.Screen
          name="progress"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                active={focused}
                label="Progress"
                badgeCount={TAB_BADGES.progress}
              >
                <ChartColumn
                  size={22}
                  color={focused ? "#10B981" : "#94A3B8"}
                  strokeWidth={2.4}
                />
              </TabIcon>
            ),
          }}
        />

        <Tabs.Screen
          name="coach"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                active={focused}
                label="AI Coach"
                badgeCount={TAB_BADGES.coach}
              >
                <Bot
                  size={22}
                  color={focused ? "#10B981" : "#94A3B8"}
                  strokeWidth={2.4}
                />
              </TabIcon>
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                active={focused}
                label="Profile"
                badgeCount={TAB_BADGES.profile}
              >
                <UserRound
                  size={22}
                  color={focused ? "#10B981" : "#94A3B8"}
                  strokeWidth={2.4}
                />
              </TabIcon>
            ),
          }}
        />
      </Tabs>

      <Pressable
        style={styles.centerButton}
        onPress={() => router.push("/meal-log")}
      >
        <Plus size={30} color="#FFFFFF" strokeWidth={2.6} />
      </Pressable>
    </View>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const renderTab = (index: number) => {
    const route = state.routes[index];
    if (!route) return null;

    const { options } = descriptors[route.key];
    const isFocused = state.index === index;

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };

    const onLongPress = () => {
      navigation.emit({
        type: "tabLongPress",
        target: route.key,
      });
    };

    const icon = options.tabBarIcon
      ? options.tabBarIcon({ focused: isFocused })
      : null;

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        onLongPress={onLongPress}
        style={styles.tabButton}
      >
        {icon}
      </Pressable>
    );
  };

  return (
    <View style={styles.tabBar}>
      {renderTab(0)}
      {renderTab(1)}
      <View style={styles.spacer} />
      {renderTab(2)}
      {renderTab(3)}
    </View>
  );
}

function TabIcon({
  active,
  label,
  badgeCount,
  children,
}: {
  active: boolean;
  label: string;
  badgeCount: number;
  children: ReactNode;
}) {
  return (
    <View style={styles.tabItem}>
      <View style={[styles.iconWrap, active && styles.activeIconWrap]}>
        {children}

        {badgeCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeCount}</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.tabLabel, active && styles.activeTabLabel]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  tabBar: {
    flexDirection: "row",
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 18,
    height: 76,
    borderRadius: 34,
    backgroundColor: "#FFFFFF",
    alignItems: "stretch",
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 10,
  },

  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: Platform.OS === "ios" ? 4 : 0,
  },

  spacer: {
    flex: 1,
  },

  tabItem: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  activeIconWrap: {
    backgroundColor: "#ECFDF5",
  },

  tabLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "800",
  },

  activeTabLabel: {
    color: "#10B981",
  },

  badge: {
    position: "absolute",
    top: -3,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },

  centerButton: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 55 : 56,
    left: "50%",
    width: 64,
    height: 64,
    marginLeft: -32,
    borderRadius: 32,
    backgroundColor: "#10CDBA",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 14,
    zIndex: 50,
  },
});