import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, StyleSheet } from "react-native";
// Must load before expo-video: on web, expo-video's player class extends
// globalThis.expo.SharedObject, which this import installs as a side effect.
import "expo-modules-core";
import { useVideoPlayer, VideoView } from "expo-video";

const LOGO_VIDEO_SOURCE = require("../../assets/video/VeLora.mp4");
const LOGO_IMAGE_SOURCE = require("../../assets/images/logo.png");
const CROSSFADE_DURATION = 500;

export default function AnimatedLogo({ size = 96 }: { size?: number }) {
  const [videoMounted, setVideoMounted] = useState(true);
  const [imageMounted, setImageMounted] = useState(false);
  const videoOpacity = useRef(new Animated.Value(1)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;

  const player = useVideoPlayer(LOGO_VIDEO_SOURCE, (p) => {
    p.muted = true;
    p.loop = false;
  });

  useEffect(() => {
    const subscription = player.addListener("playToEnd", () => {
      setImageMounted(true);
      Animated.parallel([
        Animated.timing(videoOpacity, {
          toValue: 0,
          duration: CROSSFADE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(imageOpacity, {
          toValue: 1,
          duration: CROSSFADE_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => setVideoMounted(false));
    });
    // On web the player has no video element to play() until VideoView below
    // has mounted and registered with it, which happens just before this
    // effect runs (child effects commit before parent effects).
    player.play();
    return () => subscription.remove();
  }, [player, videoOpacity, imageOpacity]);

  return (
    <Animated.View style={{ width: size, height: size }}>
      {videoMounted && (
        <Animated.View style={[styles.layer, { opacity: videoOpacity }]}>
          <VideoView
            style={styles.fill}
            player={player}
            contentFit="contain"
            nativeControls={false}
            allowsFullscreen={false}
          />
        </Animated.View>
      )}
      {imageMounted && (
        <Animated.View style={[styles.layer, { opacity: imageOpacity }]}>
          <Image source={LOGO_IMAGE_SOURCE} style={styles.fill} resizeMode="contain" />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  fill: {
    width: "100%",
    height: "100%",
  },
});