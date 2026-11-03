import type { ViewInstance } from "react-native";
import { translate } from "../localization/core";
import LanguageSelector from "../components/LanguageSelector";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions, Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, TextInput } from "../components/LocalizedText";
import { Ionicons } from "@expo/vector-icons";
import ErrorBanner from "../components/ErrorBanner";
import LoadingVideoOverlay from "../components/LoadingVideoOverlay";
import type { ScreenPoint } from "./OnboardingScreen";
import { ApiError, forgotPassword, login, resendConfirmationEmail } from "../api/authApi";

const MAX_CONTENT_WIDTH = 430;
const { height: windowHeight } = Dimensions.get("window");
const headerHeight = Math.min(400, Math.max(260, Math.round(windowHeight * 0.43)));
const SHEET_OVERLAP = 28;

const COLORS = {
  teal: "#14919B",
  tealDark: "#0F7A82",
  black: "#1A1A1A",
  gray: "#6B7280",
  border: "#E4E7E7",
  white: "#FFFFFF",
};

export default function WelcomeScreen({
  onSignUp,
  onLoginSuccess,
}: {
  onSignUp?: (origin: ScreenPoint) => void;
  onLoginSuccess?: (
    origin: ScreenPoint,
    requiresProfileCompletion: boolean,
    nextStep?: string | null
  ) => void;
}) {
  useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [isResendLoading, setIsResendLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Hidden until a login attempt actually fails because the email isn't
  // confirmed yet — showing it unconditionally would offer "resend" before
  // there's any known reason to need it.
  const [showResendLink, setShowResendLink] = useState(false);
  const signUpRef = useRef<ViewInstance>(null);
  const continueRef = useRef<ViewInstance>(null);

  const handleForgotPassword = async () => {
    if (isForgotLoading) return;
    setSuccessMessage(null);
    setErrorMessage(null);
    if (!email.trim()) {
      setErrorMessage(translate("screens.Welcome.enterYourEmailAboveThenTapForgotPasswordAgain"));
      return;
    }
    setIsForgotLoading(true);
    try {
      await forgotPassword(email.trim());
      setSuccessMessage(translate("screens.Welcome.ifAnAccountExistsForThatEmailWeVeSentPasswordResetInstructions"));
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : translate("screens.Welcome.somethingWentWrongPleaseTryAgain");
      setErrorMessage(message);
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleSignUpPress = () => {
    signUpRef.current?.measureInWindow((x, y, w, h) => {
      onSignUp?.({ x: x + w / 2, y: y + h / 2 });
    });
  };

  const handleResendFromLogin = async () => {
    if (isResendLoading) return;
    setSuccessMessage(null);
    setErrorMessage(null);
    if (!email.trim()) {
      setErrorMessage(translate("screens.Welcome.enterYourEmailAboveThenTapResendConfirmationEmailAgain"));
      return;
    }
    setIsResendLoading(true);
    try {
      await resendConfirmationEmail(email.trim());
      setSuccessMessage(translate("screens.Welcome.weVeResentTheConfirmationLinkToYourEmail"));
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : translate("screens.Welcome.somethingWentWrongPleaseTryAgain");
      setErrorMessage(message);
    } finally {
      setIsResendLoading(false);
    }
  };

  const handleContinuePress = async () => {
    if (isLoading) return;
    setSuccessMessage(null);
    setErrorMessage(null);
    if (!email.trim() || !password) {
      setErrorMessage(translate("screens.Welcome.enterYourEmailAndPasswordToContinue"));
      return;
    }
    setIsLoading(true);
    setShowResendLink(false);
    try {
      const result = await login({ email: email.trim(), password }, { rememberMe });
      continueRef.current?.measureInWindow((x, y, w, h) => {
        const origin = { x: x + w / 2, y: y + h / 2 };
        onLoginSuccess?.(origin, result.requiresProfileCompletion, result.nextStep);
      });
    } catch (err) {
      // Two distinct cases, per product decision: wrong email and wrong
      // password are collapsed into one generic message (so a login attempt
      // never reveals which field was wrong), while an unconfirmed email
      // gets its own message plus reveals the "Resend Confirmation Email"
      // link next to "Forgot Password?" (hidden until this exact case).
      // There's no documented error code for "email not confirmed" from the
      // backend, so this is detected heuristically via status 403 or the
      // word "confirm" in the server's message — adjust if your API uses a
      // different signal.
      if (err instanceof ApiError) {
        const isEmailNotConfirmed =
          err.message === translate("auth.confirmEmail");
        if (isEmailNotConfirmed) {
          setErrorMessage(translate("screens.Welcome.pleaseConfirmYourEmailBeforeLoggingIn"));
          setShowResendLink(true);
        } else {
          setErrorMessage(err.status === 400 ? translate("auth.invalidLogin") : err.message);
        }
      } else {
        setErrorMessage(translate("screens.Welcome.somethingWentWrongPleaseTryAgain"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.outer}>
      <View style={styles.safeArea}>
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
          bounces={false}
        >
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/welcome.png")}
            style={styles.headerImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.sheet}>
          <View style={styles.sheetHeading}>
            <Text style={styles.title}>{translate("screens.Welcome.signInTitle")}</Text>
            <LanguageSelector compact />
          </View>

          <Text style={styles.label}>{translate("screens.Welcome.emailOrPhoneNumber")}</Text>
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={18} color="#80938F" />
            <TextInput
              style={styles.input}
              placeholder={translate("screens.Welcome.enterEmailOrPhoneNumber")}
              placeholderTextColor={COLORS.gray}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <Text style={[styles.label, styles.labelTight]}>{translate("screens.Welcome.password")}</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color="#80938F" />
            <TextInput
              style={styles.input}
              contentDirection="ltr"
              placeholder={translate("screens.Welcome.enterYourPassword")}
              placeholderTextColor={COLORS.gray}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={translate(showPassword ? "auth.hidePassword" : "auth.showPassword")}
              onPress={() => setShowPassword((v) => !v)}
              style={styles.eyeButton}
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

          <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />
          <ErrorBanner message={successMessage} tone="success" onDismiss={() => setSuccessMessage(null)} />

          <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel={translate("accountUi.rememberMe")}
            accessibilityState={{checked:rememberMe}} aria-checked={rememberMe} onPress={() => setRememberMe(value => !value)}
            style={styles.rememberRow} disabled={isLoading} activeOpacity={0.7}>
            <Ionicons testID="remember-mark" name={rememberMe ? "checkbox" : "square-outline"} size={23} color={COLORS.teal} />
            <View testID="remember-copy" style={styles.rememberCopy}>
              <Text style={styles.rememberLabel}>{translate("accountUi.rememberMe")}</Text>
              <Text style={styles.rememberHint}>{translate("accountUi.rememberHint")}</Text>
            </View>
          </TouchableOpacity>

          <View
            style={[
              styles.linkRow,
              !showResendLink && styles.linkRowSingle,
            ]}
          >
            {showResendLink && (
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={isResendLoading}
                onPress={handleResendFromLogin}
              >
                <Text style={styles.forgotText}>
                  {isResendLoading ? translate("common.sending") : translate("screens.Welcome.resendConfirmationEmail")}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              disabled={isForgotLoading}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotText}>
                {isForgotLoading ? translate("common.sending") : translate("screens.Welcome.forgotPassword")}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            ref={continueRef}
            style={styles.continueButton}
            activeOpacity={0.85}
            onPress={handleContinuePress}
          >
            <Text style={styles.continueButtonText}>{translate("screens.Welcome.continue")}</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{translate("screens.Welcome.orContinueWith")}</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialCircleDark} activeOpacity={0.8}>
              <Ionicons name="logo-apple" size={20} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialCircleLight} activeOpacity={0.8}>
              <Ionicons name="logo-google" size={18} color="#EA4335" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialCircleLight} activeOpacity={0.8}>
              <Ionicons name="logo-facebook" size={20} color="#1877F2" />
            </TouchableOpacity>
          </View>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>{translate("screens.Welcome.donTHaveAnAccount")} </Text>
            <TouchableOpacity ref={signUpRef} activeOpacity={0.7} onPress={handleSignUpPress}>
              <Text style={styles.signupLink}>{translate("screens.Welcome.signUp")}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.helpWrap} activeOpacity={0.7}>
            <Text style={styles.helpText}>{translate("screens.Welcome.needHelp")}</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {isLoading && <LoadingVideoOverlay text={translate("screens.Welcome.loading")} />}
    </View>
  );
}

const styles = StyleSheet.create({
  rememberRow: {flexDirection:"row",alignItems:"center",gap:10,marginTop:18,paddingVertical:6},
  rememberCopy: {flex:1,minWidth:0,alignItems:"stretch"},
  rememberLabel: {width:"100%",fontSize:13,fontWeight:"600",color:COLORS.black},
  rememberHint: {width:"100%",fontSize:11.5,color:COLORS.gray,marginTop:3,lineHeight:18},
  outer: {
    flex: 1,
    backgroundColor: COLORS.white,
    alignItems: "center",
  },
  safeArea: {
    flex: 1,
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    backgroundColor: COLORS.white,
  },
  keyboardAvoider: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    height: headerHeight,
    width: "100%",
  },
  headerImage: {
    width: "100%",
    height: "100%",
  },
  sheet: {
    flex: 1,
    marginTop: -SHEET_OVERLAP,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: COLORS.white,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 24,
  },
  sheetHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    color: "#173D39",
    lineHeight: 34,
  },
  label: {
    marginTop: 14,
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.black,
    lineHeight: 22,
  },
  labelTight: {
    marginTop: 16,
  },
  inputRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: "#FAFCFB",
    paddingHorizontal: 14,
    height: 52,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    color: COLORS.black,
    height: "100%",
  },
  eyeButton: {
    width: 28,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  linkRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  linkRowSingle: {
    justifyContent: "flex-end",
  },
  forgotText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.teal,
    lineHeight: 22,
  },
  continueButton: {
    marginTop: 16,
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
  continueButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 24,
  },
  dividerRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 20,
  },
  socialRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
  },
  socialCircleDark: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
  },
  socialCircleLight: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  signupRow: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    justifyContent: "center",
  },
  signupText: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 22,
  },
  signupLink: {
    fontSize: 13,
    color: COLORS.teal,
    fontWeight: "700",
    lineHeight: 22,
  },
  helpWrap: {
    marginTop: 12,
    alignItems: "center",
  },
  helpText: {
    fontSize: 12.5,
    color: COLORS.teal,
    fontWeight: "600",
  },
});
