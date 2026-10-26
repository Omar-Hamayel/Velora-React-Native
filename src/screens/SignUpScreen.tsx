import { translate, i18n, normalizeDigits } from "../localization/core";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Animated, Dimensions, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, TextInput } from "../components/LocalizedText";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import LoadingVideoOverlay from "../components/LoadingVideoOverlay";
import AnimatedLogo from "../components/AnimatedLogo";
import ErrorBanner from "../components/ErrorBanner";
import type { ScreenPoint } from "./OnboardingScreen";
import { ApiError, register, resendConfirmationEmail } from "../api/authApi";

const MAX_CONTENT_WIDTH = 430;
const { width: windowWidth } = Dimensions.get("window");
const width = Math.min(windowWidth, MAX_CONTENT_WIDTH);
const cardWidth = width * 0.86;

const STEP_FADE_DURATION = 200;
const RESEND_AVAILABLE_AFTER_MS = 30000;

// Sampled directly from assets/images/logo.png's own gradient (teal -> green)
// so the screen background matches the logo, not a guessed color.
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

// Matches the backend's actual validation rules (confirmed against the live
// API's error responses), not just a reasonable guess:
// FullName: 3-150 chars, letters/spaces/hyphens/apostrophes only.
// Password: 8+ chars with an uppercase letter, a lowercase letter, and a digit.
const FULL_NAME_REGEX = /^[\p{L}\s'-]{3,150}$/u;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const DOB_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function isValidDateOfBirth(value: string): boolean {
  const match = DOB_REGEX.exec(value);
  if (!match) return false;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return false;
  }
  const today = new Date();
  if (date.getTime() > today.getTime()) return false;
  const ageInYears = (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return ageInYears >= 13 && ageInYears <= 120;
}

type Gender = "female" | "male";
const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "female", label: "screens.SignUp.female" },
  { value: "male", label: "screens.SignUp.male" },
];

type FieldName = "fullName" | "email" | "password" | "confirmPassword" | "dob";

export default function SignUpScreen({
  onBackToLogin,
  onNext,
}: {
  onBackToLogin?: () => void;
  onNext?: (origin: ScreenPoint) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const stepOpacity = useRef(new Animated.Value(1)).current;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [gender, setGender] = useState<Gender | null>(null);
  const [genderTouched, setGenderTouched] = useState(false);
  const [dob, setDob] = useState("");
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({
    fullName: false,
    email: false,
    password: false,
    confirmPassword: false,
    dob: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const step1NextRef = useRef<View>(null);
  const step2NextRef = useRef<View>(null);
  const step3NextRef = useRef<View>(null);

  const fullNameValid = useMemo(() => FULL_NAME_REGEX.test(fullName.trim()), [fullName]);
  const emailValid = useMemo(() => EMAIL_REGEX.test(email), [email]);
  const passwordValid = useMemo(() => PASSWORD_REGEX.test(password), [password]);
  const confirmPasswordValid = useMemo(
    () => confirmPassword.length > 0 && confirmPassword === password,
    [confirmPassword, password]
  );
  const genderValid = gender !== null;
  const dobValid = useMemo(() => isValidDateOfBirth(dob), [dob]);

  const step1Valid = fullNameValid && emailValid && passwordValid && confirmPasswordValid;
  const step2Valid = genderValid && dobValid;

  const markTouched = (field: FieldName) => setTouched((t) => ({ ...t, [field]: true }));

  // The "Resend confirmation email" link only appears once the user has had
  // a moment to check their inbox, so it doesn't show up before the email
  // could plausibly have arrived.
  useEffect(() => {
    if (step !== 3) return;
    setCanResend(false);
    const timer = setTimeout(() => setCanResend(true), RESEND_AVAILABLE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [step]);

  const goToStep = (target: 1 | 2 | 3) => {
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

  const handleStep1Next = () => {
    if (!step1Valid) return;
    goToStep(2);
  };

  const handleStep2Back = () => {
    if (isLoading) return;
    goToStep(1);
  };

  const handleStep2Next = async () => {
    if (!step2Valid || isLoading || !gender) return;
    setIsLoading(true);
    const [day, month, year] = dob.split("/");
    const payload = {
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      confirmPassword,
      gender,
      dateOfBirth: `${year}-${month}-${day}`,
    };
    try {
      await register(payload);
      setRegisteredEmail(email.trim());
      goToStep(3);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : translate("screens.SignUp.somethingWentWrongPleaseTryAgain");
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (isResending) return;
    setIsResending(true);
    try {
      await resendConfirmationEmail(registeredEmail);
      Alert.alert(translate("screens.SignUp.emailSent"), translate("screens.SignUp.weVeResentTheConfirmationLinkToYourEmail"));
      setCanResend(false);
      setTimeout(() => setCanResend(true), RESEND_AVAILABLE_AFTER_MS);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : translate("screens.SignUp.somethingWentWrongPleaseTryAgain");
      setErrorMessage(message);
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToLoginFromStep3 = () => {
    step3NextRef.current?.measureInWindow((x, y, w, h) => {
      onNext?.({ x: x + w / 2, y: y + h / 2 });
    });
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
            <AnimatedLogo size={110} />

            <Text style={styles.title}>{translate("screens.SignUp.createYourAccount")}</Text>

            <View style={styles.stepDots}>
              <View style={[styles.stepDot, step === 1 && styles.stepDotActive]} />
              <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
              <View style={[styles.stepDot, step === 3 && styles.stepDotActive]} />
            </View>

            <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />

            <Animated.View style={[styles.stepContent, { opacity: stepOpacity }]}>
              {step === 1 && (
                <>
                  <Text style={styles.label}>{translate("screens.SignUp.fullName")}</Text>
                  <View
                    style={[
                      styles.inputRow,
                      touched.fullName && !fullNameValid && styles.inputRowError,
                    ]}
                  >
                    <TextInput
                      style={styles.input}
                      placeholder={translate("screens.SignUp.enterYourFullName")}
                      placeholderTextColor={COLORS.gray}
                      autoCapitalize="words"
                      autoCorrect={false}
                      value={fullName}
                      onChangeText={(text) => {
                        setFullName(text);
                        markTouched("fullName");
                      }}
                    />
                  </View>
                  {touched.fullName && !fullNameValid && (
                    <Text style={styles.errorText}>{translate("screens.SignUp.3150CharactersLettersSpacesHyphensOrApostrophesOnly")}</Text>
                  )}

                  <Text style={[styles.label, styles.labelTight]}>{translate("screens.SignUp.email")}</Text>
                  <View
                    style={[
                      styles.inputRow,
                      touched.email && !emailValid && styles.inputRowError,
                    ]}
                  >
                    <TextInput
                      style={styles.input}
                      placeholder={translate("screens.SignUp.enterYourEmail")}
                      placeholderTextColor={COLORS.gray}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        markTouched("email");
                      }}
                    />
                  </View>
                  {touched.email && !emailValid && (
                    <Text style={styles.errorText}>{translate("screens.SignUp.enterAValidEmailAddress")}</Text>
                  )}

                  <Text style={[styles.label, styles.labelTight]}>{translate("screens.SignUp.password")}</Text>
                  <View
                    style={[
                      styles.inputRow,
                      touched.password && !passwordValid && styles.inputRowError,
                    ]}
                  >
                    <TextInput
                      style={styles.input}
                      placeholder={translate("screens.SignUp.createAPassword")}
                      placeholderTextColor={COLORS.gray}
                      autoCapitalize="none"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        markTouched("password");
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword((v) => !v)}
                      hitSlop={8}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={19}
                        color={COLORS.gray}
                      />
                    </TouchableOpacity>
                  </View>
                  {touched.password && !passwordValid && (
                    <Text style={styles.errorText}>{translate("screens.SignUp.atLeast8CharactersWithAnUppercaseLetterALowercaseLetterAndADigit")}</Text>
                  )}

                  <Text style={[styles.label, styles.labelTight]}>{translate("screens.SignUp.confirmPassword")}</Text>
                  <View
                    style={[
                      styles.inputRow,
                      touched.confirmPassword &&
                        !confirmPasswordValid &&
                        styles.inputRowError,
                    ]}
                  >
                    <TextInput
                      style={styles.input}
                      placeholder={translate("screens.SignUp.reEnterYourPassword")}
                      placeholderTextColor={COLORS.gray}
                      autoCapitalize="none"
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        markTouched("confirmPassword");
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword((v) => !v)}
                      hitSlop={8}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                        size={19}
                        color={COLORS.gray}
                      />
                    </TouchableOpacity>
                  </View>
                  {touched.confirmPassword && !confirmPasswordValid && (
                    <Text style={styles.errorText}>{translate("screens.SignUp.passwordsDoNotMatch")}</Text>
                  )}

                  <TouchableOpacity
                    ref={step1NextRef}
                    style={[styles.nextButton, !step1Valid && styles.nextButtonDisabled]}
                    activeOpacity={0.85}
                    disabled={!step1Valid}
                    onPress={handleStep1Next}
                  >
                    <Text style={styles.nextButtonText}>{translate("screens.SignUp.next")}</Text>
                    <Ionicons name={i18n.language === "ar" ? "arrow-back" : "arrow-forward"} size={18} color={COLORS.white} />
                  </TouchableOpacity>
                </>
              )}

              {step === 2 && (
                <>
                  <Text style={styles.label}>{translate("screens.SignUp.gender")}</Text>
                  <View style={styles.genderRow}>
                    {GENDER_OPTIONS.map((option) => {
                      const selected = gender === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[styles.genderPill, selected && styles.genderPillSelected]}
                          activeOpacity={0.8}
                          onPress={() => {
                            setGender(option.value);
                            setGenderTouched(true);
                          }}
                        >
                          <Text
                            style={[
                              styles.genderPillText,
                              selected && styles.genderPillTextSelected,
                            ]}
                          >
                            {translate(option.label)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {genderTouched && !genderValid && (
                    <Text style={styles.errorText}>{translate("screens.SignUp.pleaseSelectAGender")}</Text>
                  )}

                  <Text style={[styles.label, styles.labelTight]}>{translate("screens.SignUp.dateOfBirth")}</Text>
                  <View
                    style={[styles.inputRow, touched.dob && !dobValid && styles.inputRowError]}
                  >
                    <TextInput
                      style={styles.input}
                      placeholder={translate("screens.SignUp.ddMmYyyy")}
                      placeholderTextColor={COLORS.gray}
                      keyboardType="number-pad"
                      maxLength={10}
                      value={dob}
                      onChangeText={(text) => {
                        const digits = normalizeDigits(text).replace(/\D/g, "").slice(0, 8);
                        let formatted = digits;
                        if (digits.length > 4) {
                          formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
                        } else if (digits.length > 2) {
                          formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
                        }
                        setDob(formatted);
                        markTouched("dob");
                      }}
                    />
                    <Ionicons name="calendar-outline" size={18} color={COLORS.gray} />
                  </View>
                  {touched.dob && !dobValid && (
                    <Text style={styles.errorText}>{translate("screens.SignUp.enterAValidDateDdMmYyyyYouMustBeAtLeast13")}</Text>
                  )}

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.backButton}
                      activeOpacity={0.8}
                      disabled={isLoading}
                      onPress={handleStep2Back}
                    >
                      <Ionicons name={i18n.language === "ar" ? "arrow-forward" : "arrow-back"} size={18} color={COLORS.gray} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      ref={step2NextRef}
                      style={[
                        styles.nextButton,
                        styles.nextButtonInRow,
                        !step2Valid && styles.nextButtonDisabled,
                      ]}
                      activeOpacity={0.85}
                      disabled={!step2Valid || isLoading}
                      onPress={handleStep2Next}
                    >
                      <Text style={styles.nextButtonText}>{translate("screens.SignUp.createAccount")}</Text>
                      <Ionicons name={i18n.language === "ar" ? "arrow-back" : "arrow-forward"} size={18} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {step === 3 && (
                <>
                  <View style={styles.confirmIconWrap}>
                    <Ionicons name="mail-open-outline" size={36} color={COLORS.teal} />
                  </View>
                  <Text style={styles.confirmTitle}>{translate("screens.SignUp.checkYourEmail")}</Text>
                  <Text style={styles.confirmSubtitle}>{translate("screens.SignUp.weSentAConfirmationLinkTo")}{" "}
                    <Text style={styles.confirmEmail}>{registeredEmail}</Text>{translate("screens.SignUp.verifyYourEmailToActivateYourAccount")}</Text>

                  {canResend ? (
                    <TouchableOpacity
                      style={styles.resendWrap}
                      activeOpacity={0.7}
                      disabled={isResending}
                      onPress={handleResend}
                    >
                      <Text style={styles.resendText}>
                        {isResending ? translate("common.sending") : translate("screens.SignUp.resendConfirmationEmail")}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.resendHint}>{translate("screens.SignUp.didnTGetItYouCanResendShortly")}</Text>
                  )}

                  <TouchableOpacity
                    ref={step3NextRef}
                    style={styles.nextButton}
                    activeOpacity={0.85}
                    onPress={handleBackToLoginFromStep3}
                  >
                    <Text style={styles.nextButtonText}>{translate("screens.SignUp.backToLogin")}</Text>
                    <Ionicons name={i18n.language === "ar" ? "arrow-back" : "arrow-forward"} size={18} color={COLORS.white} />
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>{translate("screens.SignUp.alreadyHaveAnAccount")} </Text>
              <TouchableOpacity activeOpacity={0.7} onPress={onBackToLogin}>
                <Text style={styles.loginLink}>{translate("screens.SignUp.logIn")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {isLoading && <LoadingVideoOverlay text={translate("screens.SignUp.creatingYourAccount")} />}
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
    marginTop: 20,
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
  genderPillSelected: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  genderPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.gray,
  },
  genderPillTextSelected: {
    color: COLORS.white,
  },
  nextButton: {
    width: "100%",
    marginTop: 20,
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
    marginTop: 20,
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
  loginRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "center",
  },
  loginText: {
    fontSize: 12.5,
    color: COLORS.gray,
  },
  loginLink: {
    fontSize: 12.5,
    color: COLORS.teal,
    fontWeight: "700",
  },
  confirmIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#E3F7F1",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmTitle: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.black,
  },
  confirmSubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.gray,
    textAlign: "center",
  },
  confirmEmail: {
    fontWeight: "700",
    color: COLORS.black,
  },
  resendWrap: {
    marginTop: 18,
  },
  resendText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.teal,
  },
  resendHint: {
    marginTop: 18,
    fontSize: 12,
    color: COLORS.gray,
  },
});
