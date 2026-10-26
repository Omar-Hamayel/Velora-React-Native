import React from "react";
import { GestureResponderEvent, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { ScreenPoint } from "../screens/OnboardingScreen";

// Same teal -> green gradient sampled from assets/images/logo.png, used
// throughout the app so this nav bar reads as part of the same product.
const COLORS = {
  gradientStart: "#0DB9AB",
  gradientEnd: "#56BB54",
  teal: "#14919B",
  tealDark: "#0F7A82",
  grayLight: "#9CA3AF",
  border: "#E4E7E7",
  white: "#FFFFFF",
};

export type NavKey = "home" | "plan" | "add" | "progress" | "profile";

const NAV_ITEMS: { key: NavKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "home", label: "Home", icon: "home" },
  { key: "plan", label: "Plan", icon: "calendar-outline" },
  { key: "add", label: "Add", icon: "add" },
  { key: "progress", label: "Progress", icon: "stats-chart-outline" },
  { key: "profile", label: "Profile", icon: "person-outline" },
];

export default function BottomNav({
  activeKey,
  onNavigate,
  bottomInset = 10,
}: {
  activeKey: NavKey;
  onNavigate?: (key: NavKey, origin: ScreenPoint) => void;
  bottomInset?: number;
}) {
  const handlePress = (key: NavKey, event: GestureResponderEvent) => {
    onNavigate?.(key, { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
  };

  return (
    <View style={[styles.bottomNav, { paddingBottom: bottomInset }]}>
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === activeKey;

        if (item.key === "add") {
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.85}
              style={styles.navAddButtonWrap}
              onPress={(e) => handlePress(item.key, e)}
            >
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.navAddButton}
              >
                <Ionicons name="add" size={26} color={COLORS.white} />
              </LinearGradient>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.7}
            style={styles.navItem}
            onPress={(e) => handlePress(item.key, e)}
          >
            <Ionicons name={item.icon} size={22} color={isActive ? COLORS.teal : COLORS.grayLight} />
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 10,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    width: 56,
  },
  navLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: COLORS.grayLight,
  },
  navLabelActive: {
    color: COLORS.teal,
  },
  navAddButtonWrap: {
    marginTop: -26,
  },
  navAddButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.tealDark,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
});