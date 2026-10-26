import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AnimatedLogo from "../components/AnimatedLogo";
import ErrorBanner from "../components/ErrorBanner";
import LoadingVideoOverlay from "../components/LoadingVideoOverlay";
import type { ScreenPoint } from "./OnboardingScreen";
import {
  ApiError,
  completeOnboarding,
  submitBodyInfo,
  submitDiseases,
  submitFamilyHistory,
  type ActivityLevel,
  type DiseaseType,
  type FamilyRelation,
  type StressLevel,
} from "../api/authApi";

const MAX_CONTENT_WIDTH = 430;
const { width: windowWidth } = Dimensions.get("window");
const width = Math.min(windowWidth, MAX_CONTENT_WIDTH);
const cardWidth = width * 0.86;

const STEP_FADE_DURATION = 200;

// Same teal -> green gradient sampled from assets/images/logo.png, used
// throughout the sign-up flow so this page reads as the next step in it.
const COLORS = {
  gradientStart: "#0DB9AB",
  gradientEnd: "#56BB54",
  black: "#1A1A1A",
  gray: "#6B7280",
  border: "#E4E7E7",
  white: "#FFFFFF",
  error: "#D64545",
  teal: "#14919B",
};

function numberInRange(value: string, min: number, max: number): boolean {
  if (value.trim() === "") return false;
  const num = Number(value);
  return Number.isFinite(num) && num >= min && num <= max;
}

const HEIGHT_MIN = 50;
const HEIGHT_MAX = 300; // matches the API's confirmed "Height must be between 50 and 300 cm" rule
const WEIGHT_MIN = 20;
const WEIGHT_MAX = 300;
const WAIST_MIN = 30;
const WAIST_MAX = 200;
const SLEEP_MIN = 0;
const SLEEP_MAX = 24;
const WATER_MIN = 0;
const WATER_MAX = 15;

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: "Sedentary", label: "Sedentary" },
  { value: "Light", label: "Light" },
  { value: "Moderate", label: "Moderate" },
  { value: "Active", label: "Active" },
  { value: "VeryActive", label: "Very Active" },
];

const STRESS_OPTIONS: { value: StressLevel; label: string }[] = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
];

const DISEASE_OPTIONS: { value: DiseaseType; label: string }[] = [
  { value: "diabetes", label: "Diabetes" },
  { value: "hypertension", label: "Hypertension" },
  { value: "dyslipidemia", label: "Dyslipidemia" },
  { value: "insulinResistance", label: "Insulin Resistance" },
];

const RELATION_OPTIONS: { value: FamilyRelation; label: string }[] = [
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
];

function familyKey(disease: DiseaseType, relation: FamilyRelation): string {
  return `${disease}|${relation}`;
}

type FieldName = "height" | "weight" | "waist" | "sleepHours" | "waterIntake";
type Step = 1 | 2 | 3;

export default function HealthInfoScreen({
  initialStep = 1,
  onNext,
}: {
  initialStep?: Step;
  onNext?: (origin: ScreenPoint) => void;
}) {
  const [step, setStep] = useState<Step>(initialStep);
  const stepOpacity = useRef(new Animated.Value(1)).current;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [activityTouched, setActivityTouched] = useState(false);
  const [sleepHours, setSleepHours] = useState("");
  const [stressLevel, setStressLevel] = useState<StressLevel | null>(null);
  const [stressTouched, setStressTouched] = useState(false);
  const [isSmoker, setIsSmoker] = useState<boolean | null>(null);
  const [smokerTouched, setSmokerTouched] = useState(false);
  const [waterIntake, setWaterIntake] = useState("");
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({
    height: false,
    weight: false,
    waist: false,
    sleepHours: false,
    waterIntake: false,
  });

  const [selectedDiseases, setSelectedDiseases] = useState<Set<DiseaseType>>(new Set());
  const [noDiseases, setNoDiseases] = useState(false);

  const [familyEntries, setFamilyEntries] = useState<Set<string>>(new Set());
  const [noFamilyHistory, setNoFamilyHistory] = useState(false);

  const step1NextRef = useRef<View>(null);
  const step2NextRef = useRef<View>(null);
  const step3NextRef = useRef<View>(null);

  const heightValid = useMemo(() => numberInRange(height, HEIGHT_MIN, HEIGHT_MAX), [height]);
  const weightValid = useMemo(() => numberInRange(weight, WEIGHT_MIN, WEIGHT_MAX), [weight]);
  const waistValid = useMemo(() => numberInRange(waist, WAIST_MIN, WAIST_MAX), [waist]);
  const activityValid = activityLevel !== null;
  const sleepValid = useMemo(() => numberInRange(sleepHours, SLEEP_MIN, SLEEP_MAX), [sleepHours]);
  const stressValid = stressLevel !== null;
  const smokerValid = isSmoker !== null;
  const waterValid = useMemo(() => numberInRange(waterIntake, WATER_MIN, WATER_MAX), [waterIntake]);

  const step1Valid = heightValid && weightValid && waistValid && activityValid;
  const step2Valid = sleepValid && stressValid && smokerValid && waterValid;
  const diseasesValid = noDiseases || selectedDiseases.size > 0;
  // Family history only applies to conditions the user selected above — if
  // none are selected, there's nothing to report, so it's valid by default.
  const familyHistoryValid =
    selectedDiseases.size === 0 || noFamilyHistory || familyEntries.size > 0;
  const step3Valid = diseasesValid && familyHistoryValid;

  const markTouched = (field: FieldName) => setTouched((t) => ({ ...t, [field]: true }));

  const toggleDisease = (disease: DiseaseType) => {
    setNoDiseases(false);
    setSelectedDiseases((prev) => {
      const next = new Set(prev);
      if (next.has(disease)) {
        next.delete(disease);
        // Deselecting a condition removes any family-history entries tied
        // to it — the relation choice depends on what's picked here, so an
        // entry for a disease that's no longer selected shouldn't survive.
        setFamilyEntries((entries) => {
          const filtered = new Set(
            [...entries].filter((key) => !key.startsWith(`${disease}|`))
          );
          return filtered;
        });
      } else {
        next.add(disease);
      }
      return next;
    });
  };

  const selectNoDiseases = () => {
    setSelectedDiseases(new Set());
    setNoDiseases(true);
    setFamilyEntries(new Set());
    setNoFamilyHistory(false);
  };

  const toggleFamilyEntry = (disease: DiseaseType, relation: FamilyRelation) => {
    setNoFamilyHistory(false);
    setFamilyEntries((prev) => {
      const next = new Set(prev);
      const key = familyKey(disease, relation);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectNoFamilyHistory = () => {
    setFamilyEntries(new Set());
    setNoFamilyHistory(true);
  };

  const goToStep = (target: Step) => {
    setErrorMessage(null);
    Animated.timing(stepOpacity, {
      toValue: 0,
      duration: STEP_FADE_DURATION,
      useNativeDriver: true,
    }).start(() => {
      setStep(target);
      Animated.timing(stepOpacity, {
        toValue: 1,
        duration: STEP_FADE_DURATION + 20,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleApiError = (err: unknown) => {
    const message =
      err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
    setErrorMessage(message);
  };

  const handleStep1Next = () => {
    if (!step1Valid) return;
    goToStep(2);
  };

  const handleStep2Back = () => {
    if (isSubmitting) return;
    goToStep(1);
  };

  // Body Info (step 1) and Lifestyle (step 2) both live in the same
  // UserHealthProfile record on the backend, so step 1 only navigates
  // locally — the actual submission happens here, once, with everything
  // from both steps together.
  const handleStep2Next = async () => {
    if (!step2Valid || isSubmitting || !activityLevel || !stressLevel || isSmoker === null) return;
    setIsSubmitting(true);
    try {
      await submitBodyInfo({
        heightCm: Number(height),
        weightKg: Number(weight),
        waistCircumferenceCm: Number(waist),
        activityLevel,
        sleepHours: Number(sleepHours),
        waterIntakeLitersPerDay: Number(waterIntake),
        isSmoker,
        stressLevel,
      });
      goToStep(3);
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep3Back = () => {
    if (isSubmitting) return;
    goToStep(2);
  };

  // Diseases and Family History live on one card now, so both submit
  // together on this single "Finish" press. "None of these apply to me" /
  // "No known family history" each have nothing to persist — an empty list
  // is exactly the kind of value a [Required]/[MinLength(1)] server-side
  // check on the array itself would reject, so those calls are skipped
  // entirely rather than risking an empty array the server won't accept.
  // completeOnboarding() is a separate, required action call — without it
  // the backend keeps returning requiresProfileCompletion: true on every
  // future login even though all step data was submitted (confirmed live:
  // a user who finished every step still got sent back to step 1 on their
  // next login, before this call was added). It also requires the same
  // Body Info/Lifestyle fields as submitBodyInfo — if a login resumed
  // straight at step 3 (skipping 1 and 2), those fields are still blank
  // locally, so this call would fail with a confusing validation error;
  // catch that case up front instead.
  const handleStep3Next = async () => {
    if (!step3Valid || isSubmitting) return;
    if (!step1Valid || !step2Valid || !activityLevel || !stressLevel || isSmoker === null) {
      setErrorMessage(
        "Please go back and re-enter your Body Info and Lifestyle details first."
      );
      return;
    }
    setIsSubmitting(true);
    try {
      if (!noDiseases) {
        await submitDiseases({ diseases: Array.from(selectedDiseases) });
      }
      if (!noFamilyHistory) {
        const entries = Array.from(familyEntries).map((key) => {
          const [disease, relation] = key.split("|") as [DiseaseType, FamilyRelation];
          return { disease, relation };
        });
        await submitFamilyHistory({ entries });
      }
      await completeOnboarding({
        heightCm: Number(height),
        weightKg: Number(weight),
        waistCircumferenceCm: Number(waist),
        activityLevel,
        sleepHours: Number(sleepHours),
        waterIntakeLitersPerDay: Number(waterIntake),
        isSmoker,
        stressLevel,
      });
      step3NextRef.current?.measureInWindow((x, y, w, h) => {
        onNext?.({ x: x + w / 2, y: y + h / 2 });
      });
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.outer}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
        >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <AnimatedLogo size={100} />

            <Text style={styles.title}>Tell us about your health</Text>
            <Text style={styles.subtitle}>
              This helps us personalize your recommendations.
            </Text>

            <View style={styles.stepDots}>
              <View style={[styles.stepDot, step === 1 && styles.stepDotActive]} />
              <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
              <View style={[styles.stepDot, step === 3 && styles.stepDotActive]} />
            </View>

            <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />

            <Animated.View style={[styles.stepContent, { opacity: stepOpacity }]}>
              {step === 1 && (
                <>
                  <Text style={styles.label}>Height (cm)</Text>
                  <View
                    style={[styles.inputRow, touched.height && !heightValid && styles.inputRowError]}
                  >
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 170"
                      placeholderTextColor={COLORS.gray}
                      keyboardType="decimal-pad"
                      value={height}
                      onChangeText={(text) => {
                        setHeight(text);
                        markTouched("height");
                      }}
                    />
                  </View>
                  {touched.height && !heightValid && (
                    <Text style={styles.errorText}>Enter a height between {HEIGHT_MIN}-{HEIGHT_MAX} cm.</Text>
                  )}

                  <Text style={[styles.label, styles.labelTight]}>Weight (kg)</Text>
                  <View
                    style={[styles.inputRow, touched.weight && !weightValid && styles.inputRowError]}
                  >
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 68"
                      placeholderTextColor={COLORS.gray}
                      keyboardType="decimal-pad"
                      value={weight}
                      onChangeText={(text) => {
                        setWeight(text);
                        markTouched("weight");
                      }}
                    />
                  </View>
                  {touched.weight && !weightValid && (
                    <Text style={styles.errorText}>Enter a weight between {WEIGHT_MIN}-{WEIGHT_MAX} kg.</Text>
                  )}

                  <Text style={[styles.label, styles.labelTight]}>Waist Circumference (cm)</Text>
                  <View
                    style={[styles.inputRow, touched.waist && !waistValid && styles.inputRowError]}
                  >
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 80"
                      placeholderTextColor={COLORS.gray}
                      keyboardType="decimal-pad"
                      value={waist}
                      onChangeText={(text) => {
                        setWaist(text);
                        markTouched("waist");
                      }}
                    />
                  </View>
                  {touched.waist && !waistValid && (
                    <Text style={styles.errorText}>Enter a waist size between {WAIST_MIN}-{WAIST_MAX} cm.</Text>
                  )}

                  <Text style={[styles.label, styles.labelTight]}>Activity Level</Text>
                  <View style={styles.pillWrap}>
                    {ACTIVITY_OPTIONS.map((option) => {
                      const selected = activityLevel === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[styles.pill, selected && styles.pillSelected]}
                          activeOpacity={0.8}
                          onPress={() => {
                            setActivityLevel(option.value);
                            setActivityTouched(true);
                          }}
                        >
                          <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {activityTouched && !activityValid && (
                    <Text style={styles.errorText}>Please select an activity level.</Text>
                  )}

                  <TouchableOpacity
                    ref={step1NextRef}
                    style={[styles.nextButton, (!step1Valid || isSubmitting) && styles.nextButtonDisabled]}
                    activeOpacity={0.85}
                    disabled={!step1Valid || isSubmitting}
                    onPress={handleStep1Next}
                  >
                    <Text style={styles.nextButtonText}>Next</Text>
                    <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                  </TouchableOpacity>
                </>
              )}

              {step === 2 && (
                <>
                  <Text style={styles.label}>Sleep Hours (per night)</Text>
                  <View
                    style={[styles.inputRow, touched.sleepHours && !sleepValid && styles.inputRowError]}
                  >
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 7.5"
                      placeholderTextColor={COLORS.gray}
                      keyboardType="decimal-pad"
                      value={sleepHours}
                      onChangeText={(text) => {
                        setSleepHours(text);
                        markTouched("sleepHours");
                      }}
                    />
                  </View>
                  {touched.sleepHours && !sleepValid && (
                    <Text style={styles.errorText}>Enter hours between {SLEEP_MIN}-{SLEEP_MAX}.</Text>
                  )}

                  <Text style={[styles.label, styles.labelTight]}>Stress Level</Text>
                  <View style={styles.pillWrap}>
                    {STRESS_OPTIONS.map((option) => {
                      const selected = stressLevel === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[styles.pillThird, selected && styles.pillSelected]}
                          activeOpacity={0.8}
                          onPress={() => {
                            setStressLevel(option.value);
                            setStressTouched(true);
                          }}
                        >
                          <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {stressTouched && !stressValid && (
                    <Text style={styles.errorText}>Please select a stress level.</Text>
                  )}

                  <Text style={[styles.label, styles.labelTight]}>Do you smoke?</Text>
                  <View style={styles.genderRow}>
                    {[
                      { value: true, label: "Yes" },
                      { value: false, label: "No" },
                    ].map((option) => {
                      const selected = isSmoker === option.value;
                      return (
                        <TouchableOpacity
                          key={option.label}
                          style={[styles.genderPill, selected && styles.pillSelected]}
                          activeOpacity={0.8}
                          onPress={() => {
                            setIsSmoker(option.value);
                            setSmokerTouched(true);
                          }}
                        >
                          <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {smokerTouched && !smokerValid && (
                    <Text style={styles.errorText}>Please select an option.</Text>
                  )}

                  <Text style={[styles.label, styles.labelTight]}>Water Intake (liters/day)</Text>
                  <View
                    style={[styles.inputRow, touched.waterIntake && !waterValid && styles.inputRowError]}
                  >
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 2.5"
                      placeholderTextColor={COLORS.gray}
                      keyboardType="decimal-pad"
                      value={waterIntake}
                      onChangeText={(text) => {
                        setWaterIntake(text);
                        markTouched("waterIntake");
                      }}
                    />
                  </View>
                  {touched.waterIntake && !waterValid && (
                    <Text style={styles.errorText}>Enter liters between {WATER_MIN}-{WATER_MAX}.</Text>
                  )}

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.backButton}
                      activeOpacity={0.8}
                      disabled={isSubmitting}
                      onPress={handleStep2Back}
                    >
                      <Ionicons name="arrow-back" size={18} color={COLORS.gray} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      ref={step2NextRef}
                      style={[
                        styles.nextButton,
                        styles.nextButtonInRow,
                        (!step2Valid || isSubmitting) && styles.nextButtonDisabled,
                      ]}
                      activeOpacity={0.85}
                      disabled={!step2Valid || isSubmitting}
                      onPress={handleStep2Next}
                    >
                      <Text style={styles.nextButtonText}>Next</Text>
                      <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {step === 3 && (
                <>
                  <Text style={styles.label}>
                    Do you currently have any of these conditions?
                  </Text>
                  <View style={styles.pillWrap}>
                    {DISEASE_OPTIONS.map((option) => {
                      const selected = selectedDiseases.has(option.value);
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[styles.pill, selected && styles.pillSelected]}
                          activeOpacity={0.8}
                          onPress={() => toggleDisease(option.value)}
                        >
                          <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    style={[styles.noneRow, noDiseases && styles.noneRowSelected]}
                    activeOpacity={0.8}
                    onPress={selectNoDiseases}
                  >
                    <Ionicons
                      name={noDiseases ? "checkmark-circle" : "ellipse-outline"}
                      size={18}
                      color={noDiseases ? COLORS.teal : COLORS.gray}
                    />
                    <Text style={[styles.noneRowText, noDiseases && styles.noneRowTextSelected]}>
                      None of these apply to me
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.sectionDivider} />

                  <Text style={styles.label}>
                    Has anyone in your immediate family had these conditions?
                  </Text>

                  {selectedDiseases.size === 0 ? (
                    <Text style={styles.hintText}>
                      Select a condition above to add family history for it.
                    </Text>
                  ) : (
                    <>
                      {DISEASE_OPTIONS.filter((disease) => selectedDiseases.has(disease.value)).map(
                        (disease) => (
                          <View key={disease.value} style={styles.familyRow}>
                            <Text style={styles.familyRowLabel}>{disease.label}</Text>
                            <View style={styles.familyRelationRow}>
                              {RELATION_OPTIONS.map((relation) => {
                                const key = familyKey(disease.value, relation.value);
                                const selected = familyEntries.has(key);
                                return (
                                  <TouchableOpacity
                                    key={key}
                                    style={[styles.pillThird, selected && styles.pillSelected]}
                                    activeOpacity={0.8}
                                    onPress={() => toggleFamilyEntry(disease.value, relation.value)}
                                  >
                                    <Text
                                      style={[styles.pillText, selected && styles.pillTextSelected]}
                                    >
                                      {relation.label}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                        )
                      )}

                      <TouchableOpacity
                        style={[styles.noneRow, noFamilyHistory && styles.noneRowSelected]}
                        activeOpacity={0.8}
                        onPress={selectNoFamilyHistory}
                      >
                        <Ionicons
                          name={noFamilyHistory ? "checkmark-circle" : "ellipse-outline"}
                          size={18}
                          color={noFamilyHistory ? COLORS.teal : COLORS.gray}
                        />
                        <Text
                          style={[styles.noneRowText, noFamilyHistory && styles.noneRowTextSelected]}
                        >
                          No known family history of these conditions
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.backButton}
                      activeOpacity={0.8}
                      disabled={isSubmitting}
                      onPress={handleStep3Back}
                    >
                      <Ionicons name="arrow-back" size={18} color={COLORS.gray} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      ref={step3NextRef}
                      style={[
                        styles.nextButton,
                        styles.nextButtonInRow,
                        (!step3Valid || isSubmitting) && styles.nextButtonDisabled,
                      ]}
                      activeOpacity={0.85}
                      disabled={!step3Valid || isSubmitting}
                      onPress={handleStep3Next}
                    >
                      <Text style={styles.nextButtonText}>Finish</Text>
                      <Ionicons name="checkmark" size={18} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </Animated.View>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {isSubmitting && <LoadingVideoOverlay text="Saving..." />}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
  },
  keyboardAvoider: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  card: {
    width: cardWidth,
    backgroundColor: COLORS.white,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: "center",
    shadowColor: "#04372F",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  title: {
    marginTop: 10,
    fontSize: 19,
    fontWeight: "700",
    color: COLORS.black,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12.5,
    color: COLORS.gray,
    textAlign: "center",
  },
  stepDots: {
    marginTop: 12,
    flexDirection: "row",
    gap: 6,
  },
  stepDot: {
    width: 18,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  stepDotActive: {
    backgroundColor: COLORS.teal,
  },
  stepContent: {
    width: "100%",
    alignItems: "center",
  },
  label: {
    alignSelf: "flex-start",
    marginTop: 18,
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.black,
  },
  labelTight: {
    marginTop: 14,
  },
  inputRow: {
    marginTop: 7,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 13,
    height: 46,
  },
  inputRowError: {
    borderColor: COLORS.error,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.black,
    height: "100%",
  },
  errorText: {
    alignSelf: "flex-start",
    marginTop: 5,
    fontSize: 11.5,
    color: COLORS.error,
  },
  pillWrap: {
    marginTop: 8,
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pillThird: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pillSelected: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.gray,
  },
  pillTextSelected: {
    color: COLORS.white,
  },
  genderRow: {
    marginTop: 8,
    width: "100%",
    flexDirection: "row",
    gap: 10,
  },
  genderPill: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  noneRow: {
    marginTop: 16,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  noneRowSelected: {
    borderColor: COLORS.teal,
    backgroundColor: "#E3F7F1",
  },
  noneRowText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.gray,
  },
  noneRowTextSelected: {
    color: COLORS.teal,
  },
  sectionDivider: {
    marginTop: 20,
    width: "100%",
    height: 1,
    backgroundColor: COLORS.border,
  },
  hintText: {
    marginTop: 8,
    fontSize: 12.5,
    color: COLORS.gray,
    textAlign: "left",
    alignSelf: "flex-start",
  },
  familyRow: {
    marginTop: 14,
    width: "100%",
  },
  familyRowLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.black,
  },
  familyRelationRow: {
    marginTop: 6,
    flexDirection: "row",
    gap: 8,
  },
  nextButton: {
    width: "100%",
    marginTop: 22,
    flexDirection: "row",
    gap: 8,
    backgroundColor: COLORS.teal,
    borderRadius: 15,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.teal,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  nextButtonDisabled: {
    backgroundColor: COLORS.teal,
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
  },
  buttonRow: {
    width: "100%",
    marginTop: 22,
    flexDirection: "row",
    gap: 10,
  },
  nextButtonInRow: {
    flex: 1,
    width: undefined,
    marginTop: 0,
  },
  backButton: {
    width: 50,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
});