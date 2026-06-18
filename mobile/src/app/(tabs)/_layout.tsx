import React, {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Tabs, router } from "expo-router";
import { Bot, ChartColumn, House, Plus, UserRound } from "lucide-react-native";

const AI_COACH_LAST_SEEN_DATE_KEY = "nutrimind_ai_coach_last_seen_date";

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function TabsLayout() {
  const [coachHasUnread, setCoachHasUnread] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadCoachBadgeState() {
      try {
        const lastSeenDate = await AsyncStorage.getItem(
          AI_COACH_LAST_SEEN_DATE_KEY
        );

        if (!isActive) return;

        setCoachHasUnread(lastSeenDate !== getTodayKey());
      } catch (error) {
        console.warn("[TabsLayout] Failed to load AI Coach badge state:", error);

        if (!isActive) return;

        setCoachHasUnread(true);
      }
    }

    loadCoachBadgeState();

    return () => {
      isActive = false;
    };
  }, []);

  const markCoachAsSeen = useCallback(async () => {
    try {
      setCoachHasUnread(false);

      await AsyncStorage.setItem(AI_COACH_LAST_SEEN_DATE_KEY, getTodayKey());
    } catch (error) {
      console.warn("[TabsLayout] Failed to save AI Coach seen state:", error);
    }
  }, []);

  return (
    <View style={styles.root}>
      <Tabs
        tabBar={(props) => (
          <CustomTabBar
            {...props}
            coachHasUnread={coachHasUnread}
            onCoachSeen={markCoachAsSeen}
          />
        )}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon active={focused} label="Home" badgeVisible={false}>
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
              <TabIcon active={focused} label="Progress" badgeVisible={false}>
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
                badgeVisible={coachHasUnread && !focused}
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
              <TabIcon active={focused} label="Profile" badgeVisible={false}>
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

function CustomTabBar({
  state,
  descriptors,
  navigation,
  coachHasUnread,
  onCoachSeen,
}: any) {
  const activeRouteName = state.routes[state.index]?.name;

  useEffect(() => {
    if (activeRouteName === "coach") {
      onCoachSeen();
    }
  }, [activeRouteName, onCoachSeen]);

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

      if (route.name === "coach") {
        onCoachSeen();
      }

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
      ? options.tabBarIcon({
          focused: isFocused,
          coachHasUnread,
        })
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
  badgeVisible,
  children,
}: {
  active: boolean;
  label: string;
  badgeVisible: boolean;
  children: ReactNode;
}) {
  return (
    <View style={styles.tabItem}>
      <View style={[styles.iconWrap, active && styles.activeIconWrap]}>
        {children}

        {badgeVisible ? <View style={styles.badge} /> : null}
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
    top: 4,
    right: 5,
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
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