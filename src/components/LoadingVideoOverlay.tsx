import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { Text } from "./LocalizedText";
import { LinearGradient } from "expo-linear-gradient";
// Must load before expo-video: on web, expo-video's player class extends
// globalThis.expo.SharedObject, which this import installs as a side effect.
import "expo-modules-core";
import BrandVideo from "./BrandVideo";
import { translate } from "../localization/core";

const LOADING_VIDEO_SOURCE = require("../../assets/video/loading.mp4");
const LOADING_VIDEO_SIZE = 150;
const VIDEO_RING_WIDTH = 10;

// Same teal -> green gradient sampled from assets/images/logo.png, used
// throughout the app, so the backdrop reads as the logo's own color.
const COLORS = {
  white: "#FFFFFF",
  tealDark: "#0F7A82",
  videoRing: "#14919B",
  gradientStart: "rgba(13, 185, 171, 0.92)",
  gradientEnd: "rgba(86, 187, 84, 0.92)",
};

export default function LoadingVideoOverlay({
  text = translate("common.loading"),
}: {
  text?: string;
}) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.88)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 7,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();

    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    breatheLoop.start();
    return () => breatheLoop.stop();
  }, [overlayOpacity, cardScale, breathe]);

  const breatheScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] });

  return (
    <Animated.View style={[styles.overlayWrap, { opacity: overlayOpacity }]}>
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.overlay}
      >
        <Animated.View
          style={[
            styles.card,
            { transform: [{ scale: Animated.multiply(cardScale, breatheScale) }] },
          ]}
        >
          <View style={styles.videoRing}>
            <View style={styles.videoMask}>
              <BrandVideo
                style={styles.video}
                source={LOADING_VIDEO_SOURCE} loop
                contentFit="cover"
                
                
              />
            </View>
          </View>
          <Text style={styles.text}>{text}</Text>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlayWrap: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
  },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: 216,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    alignItems: "center",
    shadowColor: COLORS.tealDark,
    shadowOpacity: 0.2,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  videoRing: {
    width: LOADING_VIDEO_SIZE,
    height: LOADING_VIDEO_SIZE,
    borderRadius: LOADING_VIDEO_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.videoRing,
  },
  videoMask: {
    width: LOADING_VIDEO_SIZE - VIDEO_RING_WIDTH * 2,
    height: LOADING_VIDEO_SIZE - VIDEO_RING_WIDTH * 2,
    borderRadius: (LOADING_VIDEO_SIZE - VIDEO_RING_WIDTH * 2) / 2,
    overflow: "hidden",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  text: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.tealDark,
    letterSpacing: 0.2,
  },
});
