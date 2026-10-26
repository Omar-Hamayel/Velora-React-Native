import { I18nextProvider, useTranslation } from "react-i18next";
import { i18n, direction } from "./src/localization/core";
import { initializeLocalization, synchronizeLanguage } from "./src/localization/runtime";
import { getOnboardingStatus } from "./src/api/authApi";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Easing, PanResponder, StyleSheet, View } from "react-native";
import OnboardingScreen, { ScreenPoint } from "./src/screens/OnboardingScreen";
import SplashVideoScreen from "./src/screens/SplashVideoScreen";
import WelcomeScreen from "./src/screens/WelcomeScreen";
import SignUpScreen from "./src/screens/SignUpScreen";
import HealthInfoScreen from "./src/screens/HealthInfoScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import LabResultsScreen from "./src/screens/LabResultsScreen";
import BloodPressureScreen from "./src/screens/BloodPressureScreen";
import MedicationScreen from "./src/screens/MedicationScreen";
import { loadPersistedSession, mapNextStepToUiStep } from "./src/api/authApi";

const FADE_DURATION = 500;
const BUBBLE_BASE_SIZE = 36;
// Sampled directly from assets/images/logo.png so the transition circle
// matches the logo's actual teal, not the app's generic accent color.
const BUBBLE_COLOR = "#0DB9AB";
const BUBBLE_GROW_DURATION = 650;
const BUBBLE_FADE_DURATION = 400;

const MAX_CONTENT_WIDTH = 430;
const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
const contentWidth = Math.min(windowWidth, MAX_CONTENT_WIDTH);
const contentLeft = (windowWidth - contentWidth) / 2;
const contentRight = contentLeft + contentWidth;

// Distance from the bubble's origin to the farthest corner of the visible
// content area — the radius the bubble must reach to fully cover the screen.
function getRequiredRadius(origin: ScreenPoint): number {
  const corners = [
    { x: contentLeft, y: 0 },
    { x: contentRight, y: 0 },
    { x: contentLeft, y: windowHeight },
    { x: contentRight, y: windowHeight },
  ];
  return Math.max(...corners.map((c) => Math.hypot(c.x - origin.x, c.y - origin.y)));
}

type Screen =
  | "onboarding"
  | "welcome"
  | "signup"
  | "healthInfo"
  | "home"
  | "profile"
  | "labResults"
  | "bloodPressure"
  | "medication";

// The flow branches from "welcome" (to either "signup" or "healthInfo"), so
// "previous screen" is a lookup rather than a simple linear order. Onboarding
// has no entry, so it has no previous screen. "home" is the app's landing
// destination once sign-up is complete, so it has no swipe-back target either.
// The three record screens are reachable from both Home and Profile, so
// their "previous" isn't a fixed lookup — it's resolved from recordsOrigin
// inside getPreviousScreen below instead of this table.
const PREVIOUS_SCREEN: Partial<Record<Screen, Screen>> = {
  welcome: "onboarding",
  signup: "welcome",
  healthInfo: "welcome",
  profile: "home",
};

const SWIPE_DISTANCE_THRESHOLD = 80;
const SWIPE_DIRECTION_TOLERANCE = 60;

export default function App() { return <I18nextProvider i18n={i18n}><AppContent /></I18nextProvider>; }
function AppContent() {
  const { i18n: locale } = useTranslation();
  const [initialized, setInitialized] = useState(false);
  const [splashMounted, setSplashMounted] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  const [screen, setScreen] = useState<Screen>("onboarding");
  const screenRef = useRef(screen);
  screenRef.current = screen;

  // Restores a previous login (if any) during the splash screen — content
  // stays invisible (opacity 0) until the splash finishes regardless, so
  // there's no visible flicker between "onboarding" and "home" here.
  useEffect(() => {
    void (async () => {
      try {
        await initializeLocalization();
        if (await loadPersistedSession()) {
          const status = await getOnboardingStatus();
          setOnboardingStartStep(mapNextStepToUiStep(status.nextStep));
          setScreen(status.requiresProfileCompletion ? "healthInfo" : "home");
          await synchronizeLanguage().catch(() => undefined);
        }
      } catch { /* The existing login UI remains available on expired sessions or offline startup. */ }
      finally { setInitialized(true); }
    })();
  }, []);

  // Lab Results / Blood Pressure / Medication are reachable from both Home
  // and Profile — this remembers which one to return to.
  const [recordsOrigin, setRecordsOrigin] = useState<"home" | "profile">("home");
  const recordsOriginRef = useRef(recordsOrigin);
  recordsOriginRef.current = recordsOrigin;

  function getPreviousScreen(current: Screen): Screen | null {
    if (current === "labResults" || current === "bloodPressure" || current === "medication") {
      return recordsOriginRef.current;
    }
    return PREVIOUS_SCREEN[current] ?? null;
  }

  const [bubbleVisible, setBubbleVisible] = useState(false);
  const bubbleVisibleRef = useRef(bubbleVisible);
  bubbleVisibleRef.current = bubbleVisible;

  const [bubbleOrigin, setBubbleOrigin] = useState<ScreenPoint>({ x: 0, y: 0 });
  const bubbleScale = useRef(new Animated.Value(1)).current;
  const bubbleOpacity = useRef(new Animated.Value(1)).current;

  // Which onboarding step to resume at, from the login response's
  // `nextStep` — lets a user who already completed some steps pick up where
  // they left off instead of restarting from Body Info.
  const [onboardingStartStep, setOnboardingStartStep] = useState<1 | 2 | 3>(1);

  const handleSplashFinish = () => {
    Animated.parallel([
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => setSplashMounted(false));
  };

  const transitionTo = (target: Screen) => (origin: ScreenPoint) => {
    const targetScale = (getRequiredRadius(origin) * 2 * 1.05) / BUBBLE_BASE_SIZE;

    bubbleScale.setValue(1);
    bubbleOpacity.setValue(1);
    setBubbleOrigin(origin);
    setBubbleVisible(true);

    Animated.timing(bubbleScale, {
      toValue: targetScale,
      duration: BUBBLE_GROW_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setScreen(target);
      Animated.timing(bubbleOpacity, {
        toValue: 0,
        duration: BUBBLE_FADE_DURATION,
        delay: 80,
        useNativeDriver: true,
      }).start(() => setBubbleVisible(false));
    });
  };

  const handleGetStarted = transitionTo("welcome");
  const handleSignUp = transitionTo("signup");
  const handleBackToLogin = transitionTo("welcome");
  // SignUpScreen's "Next" also lands back on the login page for now, until
  // there's a real account-creation step to send it to instead.
  const handleSignUpNext = transitionTo("welcome");
  const handleHealthInfoNext = transitionTo("home");
  const handleGoToProfile = transitionTo("profile");
  const handleGoToHome = transitionTo("home");
  // Logout has no press-origin of its own to grow the bubble from — centers
  // it on the visible content area, same as the sign-up "back to login" flow.
  const handleLogout = () =>
    transitionTo("welcome")({ x: contentLeft + contentWidth / 2, y: windowHeight / 2 });

  // Shared entry point for Lab Results / Blood Pressure / Medication —
  // records which screen (Home or Profile) launched it, so the back button
  // and swipe-back return to the right place.
  const goToRecordsScreen = (target: "labResults" | "bloodPressure" | "medication") => (
    origin: ScreenPoint
  ) => {
    setRecordsOrigin(screenRef.current === "profile" ? "profile" : "home");
    transitionTo(target)(origin);
  };
  const handleGoToLabResults = goToRecordsScreen("labResults");
  const handleGoToBloodPressure = goToRecordsScreen("bloodPressure");
  const handleGoToMedication = goToRecordsScreen("medication");
  const handleRecordsBack = (origin: ScreenPoint) => transitionTo(recordsOriginRef.current)(origin);

  // Login branches: a profile that's already complete skips straight to
  // Home, otherwise onboarding resumes at whatever step the backend says
  // the user last completed. `nextStep` is a named string ("BodyInformation",
  // "Diseases", or null) — confirmed via a real login response — mapped to
  // this app's 3-step UI by mapNextStepToUiStep.
  const handleLoginSuccess = (
    origin: ScreenPoint,
    requiresProfileCompletion: boolean,
    nextStep?: string | null
  ) => {
    void synchronizeLanguage().catch(() => undefined);
    if (requiresProfileCompletion) {
      setOnboardingStartStep(mapNextStepToUiStep(nextStep));
      transitionTo("healthInfo")(origin);
    } else {
      transitionTo("home")(origin);
    }
  };

  // Swipe right anywhere (except the splash video) to go back a screen —
  // an alternative to a visible back button. Ignored while a transition is
  // already animating, or on Onboarding, which has no previous screen.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gestureState) => {
          if (splashMounted || bubbleVisibleRef.current) return false;
          if (!getPreviousScreen(screenRef.current)) return false;
          return gestureState.dx * (i18n.language === "ar" ? -1 : 1) > 24 && Math.abs(gestureState.dy) < 24;
        },
        onPanResponderRelease: (evt, gestureState) => {
          const previous = getPreviousScreen(screenRef.current);
          if (
            previous &&
            gestureState.dx * (i18n.language === "ar" ? -1 : 1) > SWIPE_DISTANCE_THRESHOLD &&
            Math.abs(gestureState.dy) < SWIPE_DIRECTION_TOLERANCE
          ) {
            transitionTo(previous)({ x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY });
          }
        },
      }),
    [splashMounted]
  );

  if (!initialized) return <View style={styles.container} />;
  return (
    <View style={[styles.container, {direction: direction(locale.language)}]} {...panResponder.panHandlers}>
      <Animated.View style={[styles.layer, { opacity: contentOpacity }]}>
        {screen === "onboarding" && <OnboardingScreen onGetStarted={handleGetStarted} />}
        {screen === "welcome" && (
          <WelcomeScreen onSignUp={handleSignUp} onLoginSuccess={handleLoginSuccess} />
        )}
        {screen === "signup" && (
          <SignUpScreen
            onBackToLogin={() =>
              handleBackToLogin({ x: contentLeft + contentWidth / 2, y: windowHeight })
            }
            onNext={handleSignUpNext}
          />
        )}
        {screen === "healthInfo" && (
          <HealthInfoScreen initialStep={onboardingStartStep} onNext={handleHealthInfoNext} />
        )}
        {screen === "home" && (
          <HomeScreen
            onGoToProfile={handleGoToProfile}
            onGoToLabResults={handleGoToLabResults}
            onGoToBloodPressure={handleGoToBloodPressure}
            onGoToMedication={handleGoToMedication}
          />
        )}
        {screen === "profile" && (
          <ProfileScreen
            onGoToHome={handleGoToHome}
            onGoToLabResults={handleGoToLabResults}
            onGoToBloodPressure={handleGoToBloodPressure}
            onGoToMedication={handleGoToMedication}
            onLogout={handleLogout}
          />
        )}
        {screen === "labResults" && (
          <LabResultsScreen
            onBack={() =>
              handleRecordsBack({ x: contentLeft + 30, y: 60 })
            }
          />
        )}
        {screen === "bloodPressure" && (
          <BloodPressureScreen
            onBack={() =>
              handleRecordsBack({ x: contentLeft + 30, y: 60 })
            }
          />
        )}
        {screen === "medication" && (
          <MedicationScreen
            onBack={() =>
              handleRecordsBack({ x: contentLeft + 30, y: 60 })
            }
          />
        )}
      </Animated.View>

      {splashMounted && (
        <Animated.View
          style={[styles.layer, { opacity: splashOpacity, pointerEvents: "none" }]}
        >
          <SplashVideoScreen onFinish={handleSplashFinish} />
        </Animated.View>
      )}

      {bubbleVisible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.bubble,
            {
              left: bubbleOrigin.x - BUBBLE_BASE_SIZE / 2,
              top: bubbleOrigin.y - BUBBLE_BASE_SIZE / 2,
              opacity: bubbleOpacity,
              transform: [{ scale: bubbleScale }],
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  bubble: {
    position: "absolute",
    width: BUBBLE_BASE_SIZE,
    height: BUBBLE_BASE_SIZE,
    borderRadius: BUBBLE_BASE_SIZE / 2,
    backgroundColor: BUBBLE_COLOR,
  },
});