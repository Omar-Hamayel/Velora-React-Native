import { translate, i18n } from "../localization/core";
import RecommendationList from "../components/RecommendationList";
import React, { useState } from "react";
import {
  Platform, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "../components/LocalizedText";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../components/BottomNav";
import type { ScreenPoint } from "./OnboardingScreen";
import { getCurrentUser } from "../api/authApi";

const MAX_CONTENT_WIDTH = 430;

// No react-native-safe-area-context in this project, so the top/bottom safe
// insets the header and nav bar need to clear the notch and home indicator
// are approximated per-platform instead of measured.
const HEADER_TOP_INSET = Platform.OS === "ios" ? 54 : (StatusBar.currentHeight ?? 24) + 12;
const BOTTOM_NAV_INSET = Platform.OS === "ios" ? 24 : 10;

// Same teal -> green gradient sampled from assets/images/logo.png, used
// throughout the app so this screen reads as part of the same product.
const COLORS = {
  gradientStart: "#0DB9AB",
  gradientEnd: "#56BB54",
  teal: "#14919B",
  tealDark: "#0F7A82",
  tealTint: "#E3F7F1",
  greenTint: "#EAF7E9",
  black: "#1A1A1A",
  gray: "#6B7280",
  grayLight: "#9CA3AF",
  border: "#E4E7E7",
  white: "#FFFFFF",
  background: "#F5F8F7",
};

type RecordTileKey = "labResults" | "bloodPressure" | "medication";

const RECORD_TILES: {
  key: RecordTileKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBackground: string;
  iconColor: string;
}[] = [
  {
    key: "labResults",
    label: "screens.Home.labResults",
    icon: "flask-outline",
    iconBackground: COLORS.tealTint,
    iconColor: COLORS.teal,
  },
  {
    key: "bloodPressure",
    label: "screens.Home.bloodPressure",
    icon: "heart-outline",
    iconBackground: COLORS.greenTint,
    iconColor: COLORS.gradientEnd,
  },
  {
    key: "medication",
    label: "screens.Home.medication",
    icon: "medkit-outline",
    iconBackground: COLORS.tealTint,
    iconColor: COLORS.teal,
  },
];

export default function HomeScreen({
  onGoToProfile,
  onGoToLabResults,
  onGoToBloodPressure,
  onGoToMedication,
}: {
  onGoToProfile?: (origin: ScreenPoint) => void;
  onGoToLabResults?: (origin: ScreenPoint) => void;
  onGoToBloodPressure?: (origin: ScreenPoint) => void;
  onGoToMedication?: (origin: ScreenPoint) => void;
}) {
  const userName = getCurrentUser()?.fullName || "there";
  return (
    <View style={styles.outer}>
      <StatusBar barStyle="light-content" />
      <View style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces
        >
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={22} color={COLORS.teal} />
                </View>
                <View>
                  <Text style={styles.greeting}>{translate("screens.Home.welcomeBack")}</Text>
                  <Text style={styles.userName}>{userName}</Text>
                </View>
              </View>

              <View style={styles.notificationButton}>
                <Ionicons name="notifications-outline" size={20} color={COLORS.white} />
              </View>
            </View>
          </LinearGradient>

          <View style={styles.body}>
            <RecommendationList />

            {/* Health Records */}
            <Text style={styles.sectionTitleLeft}>{translate("screens.Home.healthRecords")}</Text>
            <View style={[styles.card, styles.recordsCard]}>
              {RECORD_TILES.map((tile, index) => (
                <TouchableOpacity
                  key={tile.key}
                  activeOpacity={0.85}
                  style={[
                    styles.recordRow,
                    index === RECORD_TILES.length - 1 && styles.recordRowLast,
                  ]}
                  onPress={(e) => {
                    const origin = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
                    if (tile.key === "labResults") onGoToLabResults?.(origin);
                    if (tile.key === "bloodPressure") onGoToBloodPressure?.(origin);
                    if (tile.key === "medication") onGoToMedication?.(origin);
                  }}
                >
                  <View style={[styles.recordIconBadge, { backgroundColor: tile.iconBackground }]}>
                    <Ionicons name={tile.icon} size={18} color={tile.iconColor} />
                  </View>
                  <Text style={styles.recordLabel}>{translate(tile.label)}</Text>
                  <Ionicons name={i18n.language === "ar" ? "chevron-back" : "chevron-forward"} size={18} color={COLORS.grayLight} />
                </TouchableOpacity>
              ))}
            </View>

          </View>
        </ScrollView>

        <BottomNav
          activeKey="home"
          bottomInset={BOTTOM_NAV_INSET}
          onNavigate={(key, origin) => {
            if (key === "profile") onGoToProfile?.(origin);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    paddingTop: HEADER_TOP_INSET,
    paddingBottom: 34,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    fontSize: 12.5,
    color: "rgba(255,255,255,0.85)",
  },
  userName: {
    marginTop: 2,
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.white,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    position: "absolute",
    top: 9,
    end: 10,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#FF6B6B",
    borderWidth: 1.5,
    borderColor: COLORS.gradientStart,
  },
  body: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 18,
    shadowColor: "#04372F",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.black,
  },
  cardSubtitle: {
    fontSize: 12.5,
    color: COLORS.gray,
    lineHeight: 17,
  },
  recommendationCard: {
    marginTop: -22,
    paddingTop: 20,
  },
  recommendationIconBadge: {
    position: "absolute",
    top: -16,
    end: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.tealDark,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  recommendationHeadline: {
    marginTop: 8,
    fontSize: 19,
    fontWeight: "700",
    color: COLORS.black,
  },
  recommendationButtonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  outlineButton: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  outlineButtonActive: {
    borderColor: COLORS.teal,
    backgroundColor: COLORS.tealTint,
  },
  outlineButtonText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.gray,
  },
  outlineButtonTextActive: {
    color: COLORS.teal,
  },
  filledButton: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: COLORS.teal,
    shadowColor: COLORS.tealDark,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  filledButtonDone: {
    backgroundColor: COLORS.gradientEnd,
  },
  filledButtonText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.white,
  },
  wellnessCard: {
    marginTop: 16,
  },
  wellnessHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wellnessScoreRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  wellnessScoreText: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.teal,
  },
  progressTrack: {
    marginTop: 14,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: COLORS.gradientEnd,
  },
  sectionHeaderRow: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.black,
  },
  dateRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  datePill: {
    width: 38,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  datePillSelected: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  dateDay: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.grayLight,
  },
  dateDaySelected: {
    color: "rgba(255,255,255,0.85)",
  },
  dateNumber: {
    marginTop: 3,
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.black,
  },
  dateNumberSelected: {
    color: COLORS.white,
  },
  planList: {
    marginTop: 18,
    gap: 12,
  },
  sectionTitleLeft: {
    marginTop: 22,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.black,
  },
  recordsCard: {
    marginTop: 12,
    padding: 0,
    overflow: "hidden",
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recordRowLast: {
    borderBottomWidth: 0,
  },
  recordIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  recordLabel: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.black,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  planIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  planCardBody: {
    flex: 1,
  },
  planCategory: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.grayLight,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  planTitle: {
    marginTop: 2,
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.black,
  },
  planMetaRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  planTime: {
    fontSize: 11.5,
    color: COLORS.grayLight,
    fontWeight: "600",
  },
  planSubtitle: {
    flexShrink: 1,
    fontSize: 12,
    color: COLORS.gray,
  },
  statusPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: COLORS.tealTint,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.teal,
  },
});
