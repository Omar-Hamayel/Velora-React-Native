import React from "react";
import { Asset } from "expo-asset";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
export default function BrandVideo({source,loop=false,onFinish,style,contentFit="contain"}:{source:number;loop?:boolean;onFinish?:()=>void;style?:StyleProp<ViewStyle>;contentFit?:"contain"|"cover"}) {
  // Browser autoplay owns playback. No dangling imperative play() promise when a loading overlay unmounts.
  return <video src={Asset.fromModule(source).uri} autoPlay muted playsInline loop={loop} onEnded={onFinish} onError={onFinish} style={{...StyleSheet.flatten(style) as React.CSSProperties,objectFit:contentFit}} />;
}
