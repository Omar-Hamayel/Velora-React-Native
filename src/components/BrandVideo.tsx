import React, { useEffect } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import "expo-modules-core";
import { useVideoPlayer, VideoView } from "expo-video";
export default function BrandVideo({source,loop=false,onFinish,style,contentFit="contain"}:{source:number;loop?:boolean;onFinish?:()=>void;style?:StyleProp<ViewStyle>;contentFit?:"contain"|"cover"}) {
  const player=useVideoPlayer(source,p=>{p.muted=true;p.loop=loop;});
  useEffect(()=>{const listener=player.addListener("playToEnd",()=>onFinish?.());player.play();return()=>listener.remove();},[player,onFinish]);
  return <VideoView player={player} style={style} contentFit={contentFit} nativeControls={false} fullscreenOptions={{ enable: false }} />;
}
