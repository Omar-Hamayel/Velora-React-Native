import { translate, i18n, medicalNumber } from "../localization/core";
import LanguageSelector from "../components/LanguageSelector";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Platform, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, TextInput } from "../components/LocalizedText";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../components/BottomNav";
import ErrorBanner from "../components/ErrorBanner";
import type { ScreenPoint } from "./OnboardingScreen";
import {
  ApiError,
  activityLevelFromLabel,
  clearSession,
  getCurrentUser,
  getUserHealthProfile,
  stressLevelFromLabel,
  updateUserHealthProfile,
  type ActivityLevel,
  type UserHealthProfileRecord,
} from "../api/authApi";

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

type InfoRow = { icon: keyof typeof Ionicons.glyphMap; label: string; value: string };

// The backend returns enum values as PascalCase ("ModeratelyActive", "Low")
// with no spaces — this only affects display, not anything sent back to it.
function humanizeEnum(value: string): string {
  return translate(`enums.${value}`, {defaultValue: value});
}

function formatDateOfBirth(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

type MenuRow = { icon: keyof typeof Ionicons.glyphMap; label: string };

const SETTINGS_MENU: MenuRow[] = [
  { icon: "notifications-outline", label: "screens.Profile.notifications" },
  { icon: "shield-checkmark-outline", label: "screens.Profile.privacySecurity" },
  { icon: "help-circle-outline", label: "screens.Profile.helpSupport" },
  { icon: "information-circle-outline", label: "screens.Profile.aboutVelora" },
];

const ACTIVITY_EDIT_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: "Sedentary", label: "screens.Profile.sedentary" },
  { value: "Light", label: "screens.Profile.light" },
  { value: "Moderate", label: "screens.Profile.moderate" },
  { value: "Active", label: "screens.Profile.active" },
  { value: "VeryActive", label: "screens.Profile.veryActive" },
];

function numberInRange(value: string, min: number, max: number): boolean {
  if (value.trim() === "") return false;
  const num = medicalNumber(value);
  return Number.isFinite(num) && num >= min && num <= max;
}

const HEIGHT_MIN = 50;
const HEIGHT_MAX = 300;
const WEIGHT_MIN = 1;
const WEIGHT_MAX = 500;
const WATER_MIN = 0;
const WATER_MAX = 15;

type RecordTileKey = "labResults" | "bloodPressure" | "medication";

const RECORD_TILES: {
  key: RecordTileKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "labResults", label: "screens.Profile.labResults", icon: "flask-outline" },
  { key: "bloodPressure", label: "screens.Profile.bloodPressure", icon: "heart-outline" },
  { key: "medication", label: "screens.Profile.medication", icon: "medkit-outline" },
];

export default function ProfileScreen({
  onGoToHome,
  onGoToLabResults,
  onGoToBloodPressure,
  onGoToMedication,
  onLogout,
}: {
  onGoToHome?: (origin: ScreenPoint) => void;
  onGoToLabResults?: (origin: ScreenPoint) => void;
  onGoToBloodPressure?: (origin: ScreenPoint) => void;
  onGoToMedication?: (origin: ScreenPoint) => void;
  onLogout?: () => void;
}) {
  const user = getCurrentUser();
  const [healthProfile, setHealthProfile] = useState<UserHealthProfileRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    await clearSession();
    setIsLoggingOut(false);
    onLogout?.();
  };

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editHeight, setEditHeight] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editActivityLevel, setEditActivityLevel] = useState<ActivityLevel | null>(null);
  const [editWaterIntake, setEditWaterIntake] = useState("");

  const startEditing = () => {
    if (!healthProfile) return;
    setEditHeight(String(healthProfile.heightCm));
    setEditWeight(String(healthProfile.weightKg));
    setEditActivityLevel(activityLevelFromLabel(healthProfile.activityLevel));
    setEditWaterIntake(String(healthProfile.waterIntakeLitersPerDay));
    setErrorMessage(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setErrorMessage(null);
  };

  const editValid =
    numberInRange(editHeight, HEIGHT_MIN, HEIGHT_MAX) &&
    numberInRange(editWeight, WEIGHT_MIN, WEIGHT_MAX) &&
    editActivityLevel !== null &&
    numberInRange(editWaterIntake, WATER_MIN, WATER_MAX);

  const saveEditing = async () => {
    if (!healthProfile || !editActivityLevel || !editValid || isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      // The update endpoint validates the full record, not just the fields
      // shown here — waist/sleep/stress/smoking are carried over unchanged
      // from what's already saved.
      const stressLevel = stressLevelFromLabel(healthProfile.stressLevel);
      if (!stressLevel) throw new ApiError(translate("errors.validation"), 400);
      await updateUserHealthProfile(healthProfile.id, {
        heightCm: medicalNumber(editHeight),
        weightKg: medicalNumber(editWeight),
        waistCircumferenceCm: healthProfile.waistCircumferenceCm,
        activityLevel: editActivityLevel,
        sleepHours: healthProfile.sleepHours,
        waterIntakeLitersPerDay: medicalNumber(editWaterIntake),
        isSmoker: healthProfile.isSmoker,
        stressLevel,
      });
      const refreshed = await getUserHealthProfile();
      setHealthProfile(refreshed);
      setIsEditing(false);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : translate("screens.Profile.couldnTSaveYourChanges"));
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    getUserHealthProfile()
      .then((record) => {
        if (!cancelled) setHealthProfile(record);
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(
          err instanceof ApiError ? err.message : translate("screens.Profile.couldnTLoadYourHealthProfile")
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const personalInfo: InfoRow[] = [
    { icon: "person-outline", label: "screens.Profile.fullName", value: user?.fullName || "—" },
    { icon: "mail-outline", label: "screens.Profile.email", value: user?.email || "—" },
    ...(user?.gender
      ? [
          {
            icon: "male-female-outline" as const,
            label: "screens.Profile.gender",
            value: translate(`enums.${user.gender === "male" ? "Male" : "Female"}`),
          },
        ]
      : []),
    ...(user?.dateOfBirth
      ? [
          {
            icon: "calendar-outline" as const,
            label: "screens.Profile.dateOfBirth",
            value: formatDateOfBirth(user.dateOfBirth),
          },
        ]
      : []),
  ];

  const healthProfileRows: InfoRow[] = healthProfile
    ? [
        { icon: "resize-outline", label: "screens.Profile.height", value: `${healthProfile.heightCm} cm` },
        { icon: "barbell-outline", label: "screens.Profile.weight", value: `${healthProfile.weightKg} kg` },
        {
          icon: "walk-outline",
          label: "screens.Profile.activityLevel",
          value: humanizeEnum(healthProfile.activityLevel),
        },
        {
          icon: "water-outline",
          label: "screens.Profile.waterGoal",
          value: `${healthProfile.waterIntakeLitersPerDay} L / day`,
        },
      ]
    : [];

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
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={34} color={COLORS.teal} />
              </View>
              <TouchableOpacity activeOpacity={0.8} style={styles.editBadge}>
                <Ionicons name="pencil" size={13} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <Text style={styles.userName}>{user?.fullName || "there"}</Text>
            <Text style={styles.userEmail}>{user?.email || ""}</Text>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.editProfileButton}
              onPress={isEditing ? cancelEditing : startEditing}
              disabled={!healthProfile && !isEditing}
            >
              <Text style={styles.editProfileButtonText}>
                {isEditing ? translate("screens.Profile.cancel") : translate("screens.Profile.editProfile")}
              </Text>
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.body}>
            <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />

            {/* Personal Information */}
            <View style={[styles.card, styles.infoCard]}>
              <Text style={styles.cardTitle}>{translate("screens.Profile.personalInformation")}</Text>
              {personalInfo.map((row, index) => (
                <View
                  key={row.label}
                  style={[styles.infoRow, index === personalInfo.length - 1 && styles.infoRowLast]}
                >
                  <View style={styles.infoIconBadge}>
                    <Ionicons name={row.icon} size={16} color={COLORS.teal} />
                  </View>
                  <Text style={styles.infoLabel}>{translate(row.label)}</Text>
                  <Text style={styles.infoValue}>{row.value}</Text>
                </View>
              ))}
            </View>

            {/* Health Profile */}
            <View style={[styles.card, styles.infoCard]}>
              <Text style={styles.cardTitle}>{translate("screens.Profile.healthProfile")}</Text>
              {isLoading ? (
                <ActivityIndicator style={styles.loadingIndicator} color={COLORS.teal} />
              ) : isEditing ? (
                <View style={styles.editForm}>
                  <Text style={styles.editLabel}>{translate("screens.Profile.heightCm")}</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editHeight}
                    onChangeText={setEditHeight}
                    keyboardType="numeric"
                    placeholder={translate("screens.Profile.eG170")}
                    placeholderTextColor={COLORS.grayLight}
                  />

                  <Text style={styles.editLabel}>{translate("screens.Profile.weightKg")}</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editWeight}
                    onChangeText={setEditWeight}
                    keyboardType="numeric"
                    placeholder={translate("screens.Profile.eG70")}
                    placeholderTextColor={COLORS.grayLight}
                  />

                  <Text style={styles.editLabel}>{translate("screens.Profile.activityLevel")}</Text>
                  <View style={styles.editPillRow}>
                    {ACTIVITY_EDIT_OPTIONS.map((option) => {
                      const selected = editActivityLevel === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          activeOpacity={0.8}
                          style={[styles.editPill, selected && styles.editPillSelected]}
                          onPress={() => setEditActivityLevel(option.value)}
                        >
                          <Text
                            style={[
                              styles.editPillText,
                              selected && styles.editPillTextSelected,
                            ]}
                          >
                            {translate(option.label)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.editLabel}>{translate("screens.Profile.waterGoalLDay")}</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editWaterIntake}
                    onChangeText={setEditWaterIntake}
                    keyboardType="numeric"
                    placeholder={translate("screens.Profile.eG25")}
                    placeholderTextColor={COLORS.grayLight}
                  />

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[styles.saveButton, (!editValid || isSaving) && styles.saveButtonDisabled]}
                    onPress={saveEditing}
                    disabled={!editValid || isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={styles.saveButtonText}>{translate("screens.Profile.saveChanges")}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : healthProfileRows.length === 0 ? (
                <Text style={styles.emptyText}>{translate("screens.Profile.noHealthProfileDataYet")}</Text>
              ) : (
                healthProfileRows.map((row, index) => (
                  <View
                    key={row.label}
                    style={[
                      styles.infoRow,
                      index === healthProfileRows.length - 1 && styles.infoRowLast,
                    ]}
                  >
                    <View style={[styles.infoIconBadge, styles.infoIconBadgeGreen]}>
                      <Ionicons name={row.icon} size={16} color={COLORS.gradientEnd} />
                    </View>
                    <Text style={styles.infoLabel}>{translate(row.label)}</Text>
                    <Text style={styles.infoValue}>{row.value}</Text>
                  </View>
                ))
              )}
            </View>

            {/* Health Records */}
            <View style={[styles.card, styles.menuCard]}>
              <Text style={styles.cardTitle}>{translate("screens.Profile.healthRecords")}</Text>
              {RECORD_TILES.map((tile, index) => (
                <TouchableOpacity
                  key={tile.key}
                  activeOpacity={0.7}
                  style={[styles.menuRow, index === RECORD_TILES.length - 1 && styles.menuRowLast]}
                  onPress={(e) => {
                    const origin = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
                    if (tile.key === "labResults") onGoToLabResults?.(origin);
                    if (tile.key === "bloodPressure") onGoToBloodPressure?.(origin);
                    if (tile.key === "medication") onGoToMedication?.(origin);
                  }}
                >
                  <View style={styles.infoIconBadge}>
                    <Ionicons name={tile.icon} size={16} color={COLORS.teal} />
                  </View>
                  <Text style={styles.menuLabel}>{translate(tile.label)}</Text>
                  <Ionicons name={i18n.language === "ar" ? "chevron-back" : "chevron-forward"} size={18} color={COLORS.grayLight} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Settings */}
            <View style={[styles.card, styles.menuCard]}>
              <Text style={styles.cardTitle}>{translate("screens.Profile.settings")}</Text>
              <LanguageSelector />
              {SETTINGS_MENU.map((row, index) => (
                <TouchableOpacity
                  key={row.label}
                  activeOpacity={0.7}
                  style={[
                    styles.menuRow,
                    index === SETTINGS_MENU.length - 1 && styles.menuRowLast,
                  ]}
                >
                  <View style={styles.infoIconBadge}>
                    <Ionicons name={row.icon} size={16} color={COLORS.teal} />
                  </View>
                  <Text style={styles.menuLabel}>{translate(row.label)}</Text>
                  <Ionicons name={i18n.language === "ar" ? "chevron-back" : "chevron-forward"} size={18} color={COLORS.grayLight} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.logoutButton}
              onPress={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <ActivityIndicator color={COLORS.gray} />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={18} color={COLORS.gray} />
                  <Text style={styles.logoutButtonText}>{translate("screens.Profile.logOut")}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        <BottomNav
          activeKey="profile"
          bottomInset={BOTTOM_NAV_INSET}
          onNavigate={(key, origin) => {
            if (key === "home") onGoToHome?.(origin);
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
    paddingBottom: 26,
    paddingHorizontal: 20,
    alignItems: "center",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  avatarWrap: {
    width: 84,
    height: 84,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  editBadge: {
    position: "absolute",
    end: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.gradientStart,
  },
  userName: {
    marginTop: 12,
    fontSize: 19,
    fontWeight: "700",
    color: COLORS.white,
  },
  userEmail: {
    marginTop: 3,
    fontSize: 12.5,
    color: "rgba(255,255,255,0.85)",
  },
  editProfileButton: {
    marginTop: 16,
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  editProfileButtonText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.white,
  },
  body: {
    paddingHorizontal: 20,
    marginTop: -14,
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
  infoCard: {
    marginTop: 16,
  },
  infoRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoRowLast: {
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  loadingIndicator: {
    marginTop: 16,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 12.5,
    color: COLORS.gray,
  },
  editForm: {
    marginTop: 6,
  },
  editLabel: {
    marginTop: 14,
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.black,
  },
  editInput: {
    marginTop: 7,
    height: 44,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    fontSize: 14,
    color: COLORS.black,
  },
  editPillRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  editPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  editPillSelected: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  editPillText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.gray,
  },
  editPillTextSelected: {
    color: COLORS.white,
  },
  saveButton: {
    marginTop: 20,
    paddingVertical: 13,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.teal,
    shadowColor: COLORS.tealDark,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.white,
  },
  infoIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: COLORS.tealTint,
    alignItems: "center",
    justifyContent: "center",
  },
  infoIconBadgeGreen: {
    backgroundColor: COLORS.greenTint,
  },
  infoLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.black,
  },
  menuCard: {
    marginTop: 16,
  },
  menuRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuRowLast: {
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  menuLabel: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.black,
  },
  logoutButton: {
    marginTop: 18,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  logoutButtonText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.gray,
  },
});
