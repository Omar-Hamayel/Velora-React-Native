import type { ViewInstance } from "react-native";
import { translate } from "../localization/core";
import React, { useRef } from "react";
import {
  Dimensions, Image, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "../components/LocalizedText";
import { LinearGradient } from "expo-linear-gradient";

export type ScreenPoint = { x: number; y: number };

const MAX_CONTENT_WIDTH = 430;
const { width: windowWidth } = Dimensions.get("window");
const width = Math.min(windowWidth, MAX_CONTENT_WIDTH);

const COLORS = {
  teal: "#14919B",
  tealDark: "#0F7A82",
  // Sampled directly from assets/images/logo.png so the illustration
  // background and accent circles match the logo's actual colors.
  logoTeal: "#0DB9AB",
  logoTealDark: "#0C9AA1",
  logoGreen: "#56BB54",
  logoGreenLight: "#A9E0A8",
  black: "#1A1A1A",
  gray: "#6B7280",
  white: "#FFFFFF",
  bg: "#E3F7F1",
  bgGradientStart: "#E3F7F1",
  bgGradientEnd: "#F8FDFB",
};

export default function OnboardingScreen({
  onGetStarted,
}: {
  onGetStarted?: (origin: ScreenPoint) => void;
}) {
  const buttonRef = useRef<ViewInstance>(null);

  const handlePress = () => {
    buttonRef.current?.measureInWindow((x, y, buttonWidth, buttonHeight) => {
      onGetStarted?.({ x: x + buttonWidth / 2, y: y + buttonHeight / 2 });
    });
  };

  return (
    <View style={styles.outer}>
      <View style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />

        <LinearGradient
          colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.illustrationWrap}
        >
          <View style={styles.blobBack} />
          <View style={styles.blobFront} />
          <View style={styles.dotAccentOne} />
          <View style={styles.dotAccentTwo} />
          <View style={styles.imageCard}>
            <Image
              source={require("../../assets/images/healthy-lifestyle.jpg")}
              style={styles.illustrationImage}
              resizeMode="contain"
            />
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.heading}>
            <Text style={styles.headingAccent}>{translate("screens.Onboarding.yourHealth")} </Text>{translate("screens.Onboarding.guidedPersonally")}</Text>

          <Text style={styles.description}>{translate("screens.Onboarding.getPersonalizedLifestyleRecommendationsBasedOnYourHealthGoalsHabitsAndDailyNeeds")}</Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            ref={buttonRef}
            style={styles.button}
            activeOpacity={0.85}
            onPress={handlePress}
          >
            <Text style={styles.buttonText}>{translate("screens.Onboarding.getStarted")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
  },
  safeArea: {
    flex: 1,
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    backgroundColor: COLORS.white,
  },
  illustrationWrap: {
    height: width,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  blobBack: {
    position: "absolute",
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: width * 0.425,
    backgroundColor: COLORS.logoGreenLight,
    opacity: 0.4,
    start: -width * 0.18,
    top: -width * 0.12,
  },
  blobFront: {
    position: "absolute",
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: width * 0.325,
    backgroundColor: COLORS.logoTeal,
    opacity: 0.9,
    end: -width * 0.12,
    bottom: -width * 0.1,
  },
  dotAccentOne: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.logoTeal,
    opacity: 0.5,
    top: width * 0.1,
    end: width * 0.12,
  },
  dotAccentTwo: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.logoTealDark,
    opacity: 0.35,
    bottom: width * 0.14,
    start: width * 0.14,
  },
  imageCard: {
    borderRadius: 32,
    backgroundColor: COLORS.white,
    padding: 10,
    shadowColor: COLORS.tealDark,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  illustrationImage: {
    width: width * 0.66,
    height: width * 0.66,
    borderRadius: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 64,
    alignItems: "center",
  },
  heading: {
    width: "100%",
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.black,
    textAlign: "center",
    lineHeight: 40,
  },
  headingAccent: {
    color: COLORS.teal,
  },
  description: {
    width: "100%",
    marginTop: 18,
    fontSize: 17,
    lineHeight: 25,
    color: COLORS.gray,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  button: {
    backgroundColor: COLORS.teal,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.teal,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "600",
  },
});
