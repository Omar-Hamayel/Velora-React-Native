import React, { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
// Must load before expo-video: on web, expo-video's player class extends
// globalThis.expo.SharedObject, which this import installs as a side effect.
import "expo-modules-core";
import BrandVideo from "../components/BrandVideo";

const VIDEO_SOURCE = require("../../assets/video/VeLora.mp4");
const VIDEO_ASPECT_RATIO = 1024 / 576;

const MAX_CONTENT_WIDTH = 430;
const { width: windowWidth } = Dimensions.get("window");
const width = Math.min(windowWidth, MAX_CONTENT_WIDTH);
const videoWidth = width;
// Slightly shorter than the video's natural aspect-fit height, so it fills
// the full screen width while taking up a bit less vertical space.
const videoHeight = (videoWidth / VIDEO_ASPECT_RATIO) * 0.82;

const COLORS = {
  videoBackground: "#FFFFFF",
};

export default function SplashVideoScreen({ onFinish }: { onFinish: () => void }) {
  useEffect(() => { const timer = setTimeout(onFinish, 20000); return () => clearTimeout(timer); }, [onFinish]);

  return (
    <View style={styles.container}>
      <BrandVideo
        style={styles.video}
        source={VIDEO_SOURCE} onFinish={onFinish}
        contentFit="cover"
        
        
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.videoBackground,
  },
  video: {
    width: videoWidth,
    height: videoHeight,
  },
});
