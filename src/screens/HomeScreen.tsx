import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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

type DateOption = { day: string; date: number };

const DATE_OPTIONS: DateOption[] = [
  { day: "M", date: 12 },
  { day: "T", date: 13 },
  { day: "W", date: 14 },
  { day: "T", date: 15 },
  { day: "F", date: 16 },
  { day: "S", date: 17 },
  { day: "S", date: 18 },
];
const DEFAULT_SELECTED_DATE_INDEX = 2;

type PlanItem = {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  time?: string;
  status?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBackground: string;
  iconColor: string;
};

const DAILY_PLAN: PlanItem[] = [
  {
    id: "breakfast",
    category: "Breakfast Recommendation",
    title: "Oats with fruits and nuts",
    subtitle: "Supports blood sugar balance",
    time: "08:30 AM",
    icon: "restaurant-outline",
    iconBackground: COLORS.greenTint,
    iconColor: COLORS.gradientEnd,
  },
  {
    id: "activity",
    category: "Activity Recommendation",
    title: "30 min walking",
    subtitle: "Best before sunset",
    time: "05:00 PM",
    icon: "walk-outline",
    iconBackground: COLORS.tealTint,
    iconColor: COLORS.teal,
  },
  {
    id: "wellness",
    category: "Wellness Tip",
    title: "Reduce salty food today",
    subtitle: "Supports blood pressure control",
    icon: "bulb-outline",
    iconBackground: COLORS.greenTint,
    iconColor: COLORS.gradientEnd,
  },
  {
    id: "hydration",
    category: "Hydration Goal",
    title: "Drink 8 cups of water",
    subtitle: "In progress",
    status: "In progress",
    icon: "water-outline",
    iconBackground: COLORS.tealTint,
    iconColor: COLORS.teal,
  },
];

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
    label: "Lab Results",
    icon: "flask-outline",
    iconBackground: COLORS.tealTint,
    iconColor: COLORS.teal,
  },
  {
    key: "bloodPressure",
    label: "Blood Pressure",
    icon: "heart-outline",
    iconBackground: COLORS.greenTint,
    iconColor: COLORS.gradientEnd,
  },
  {
    key: "medication",
    label: "Medication",
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
  const [selectedDateIndex, setSelectedDateIndex] = useState(DEFAULT_SELECTED_DATE_INDEX);
  const [isRecommendationDone, setIsRecommendationDone] = useState(false);
  const [isReminderSet, setIsReminderSet] = useState(false);

  return (
    <View style={styles.outer}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
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
                  <Text style={styles.greeting}>Welcome back 👋</Text>
                  <Text style={styles.userName}>{userName}</Text>
                </View>
              </View>

              <TouchableOpacity activeOpacity={0.75} style={styles.notificationButton}>
                <Ionicons name="notifications-outline" size={20} color={COLORS.white} />
                <View style={styles.notificationDot} />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={styles.body}>
            {/* Today's Health Recommendation */}
            <View style={[styles.card, styles.recommendationCard]}>
              <View style={styles.recommendationIconBadge}>
                <Ionicons name="sunny-outline" size={20} color={COLORS.white} />
              </View>
              <Text style={styles.cardTitle}>Today's Health Recommendation</Text>
              <Text style={styles.recommendationHeadline}>30-minute walk after lunch</Text>
              <Text style={styles.cardSubtitle}>
                Recommended based on your activity level and health goals.
              </Text>

              <View style={styles.recommendationButtonRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.outlineButton, isReminderSet && styles.outlineButtonActive]}
                  onPress={() => setIsReminderSet((v) => !v)}
                >
                  <Ionicons
                    name={isReminderSet ? "alarm" : "alarm-outline"}
                    size={16}
                    color={isReminderSet ? COLORS.teal : COLORS.gray}
                  />
                  <Text
                    style={[
                      styles.outlineButtonText,
                      isReminderSet && styles.outlineButtonTextActive,
                    ]}
                  >
                    {isReminderSet ? "Reminder Set" : "Remind Me"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.filledButton, isRecommendationDone && styles.filledButtonDone]}
                  onPress={() => setIsRecommendationDone((v) => !v)}
                >
                  <Ionicons
                    name={isRecommendationDone ? "checkmark-done" : "checkmark"}
                    size={16}
                    color={COLORS.white}
                  />
                  <Text style={styles.filledButtonText}>
                    {isRecommendationDone ? "Done" : "Mark as Done"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Health Records */}
            <Text style={styles.sectionTitleLeft}>Health Records</Text>
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
                  <Text style={styles.recordLabel}>{tile.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.grayLight} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Weekly Wellness Score */}
            <View style={[styles.card, styles.wellnessCard]}>
              <View style={styles.wellnessHeaderRow}>
                <Text style={styles.cardTitle}>Weekly Wellness Score</Text>
                <Ionicons name="trending-up-outline" size={18} color={COLORS.teal} />
              </View>

              <View style={styles.wellnessScoreRow}>
                <Text style={styles.wellnessScoreText}>72%</Text>
                <Text style={styles.cardSubtitle}>3 goals completed this week</Text>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: "72%" }]} />
              </View>
            </View>

            {/* Today's Plan date selector */}
            <View style={styles.sectionHeaderRow}>
              <TouchableOpacity activeOpacity={0.7} hitSlop={8}>
                <Ionicons name="chevron-back" size={18} color={COLORS.gray} />
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>Today's Plan</Text>
              <TouchableOpacity activeOpacity={0.7} hitSlop={8}>
                <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <View style={styles.dateRow}>
              {DATE_OPTIONS.map((option, index) => {
                const selected = index === selectedDateIndex;
                return (
                  <TouchableOpacity
                    key={`${option.day}-${option.date}`}
                    activeOpacity={0.8}
                    style={[styles.datePill, selected && styles.datePillSelected]}
                    onPress={() => setSelectedDateIndex(index)}
                  >
                    <Text style={[styles.dateDay, selected && styles.dateDaySelected]}>
                      {option.day}
                    </Text>
                    <Text style={[styles.dateNumber, selected && styles.dateNumberSelected]}>
                      {option.date}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Daily plan cards */}
            <View style={styles.planList}>
              {DAILY_PLAN.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  style={[styles.card, styles.planCard]}
                >
                  <View style={[styles.planIconBadge, { backgroundColor: item.iconBackground }]}>
                    <Ionicons name={item.icon} size={20} color={item.iconColor} />
                  </View>

                  <View style={styles.planCardBody}>
                    <Text style={styles.planCategory}>{item.category}</Text>
                    <Text style={styles.planTitle}>{item.title}</Text>
                    <View style={styles.planMetaRow}>
                      {item.time && (
                        <View style={styles.planTimeRow}>
                          <Ionicons name="time-outline" size={12} color={COLORS.grayLight} />
                          <Text style={styles.planTime}>{item.time}</Text>
                        </View>
                      )}
                      <Text style={styles.planSubtitle} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    </View>
                  </View>

                  {item.status ? (
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{item.status}</Text>
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={COLORS.grayLight} />
                  )}
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
    right: 10,
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
    right: 18,
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