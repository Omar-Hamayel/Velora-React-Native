import React from "react";
import { Platform, View, type ViewProps } from "react-native";
import { useTranslation } from "react-i18next";
import { direction } from "../localization/core";

// Set direction on each layout root, including Modals, which have their own native root.
// RN Web uses `dir` for both CSS layout and logical start/end style resolution.
export default function LocalizedView({ style, layoutDirection, ...props }: ViewProps & {layoutDirection?: "ltr" | "rtl"}) {
  const { i18n } = useTranslation();
  const dir = layoutDirection ?? direction(i18n.language);
  return <View {...props} {...(Platform.OS === "web" ? { dir } : {})} style={[style, Platform.OS !== "web" && { direction: dir }]} />;
}
