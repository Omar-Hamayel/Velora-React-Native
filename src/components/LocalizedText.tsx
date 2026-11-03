import React from "react";
import { Platform, Text as NativeText, TextInput as NativeInput, type TextProps, type TextInputProps } from "react-native";
import { normalizeDigits } from "../localization/core";
import { useTranslation } from "react-i18next";
import { localizedTextLayout } from "../localization/layout";
type ContentDirection = { contentDirection?: "ltr" | "rtl" };

export function Text({ style, contentDirection, ...props }: TextProps & ContentDirection) {
  const { i18n } = useTranslation();
  const rtl = i18n.language === "ar";
  const writingDirection = contentDirection ?? (rtl ? "rtl" : "ltr");
  // Apply the Arabic policy last so screen-specific left/center styles cannot override it.
  // Content direction is separate: an English fallback can still read LTR while aligned right.
  return <NativeText {...props} {...(Platform.OS === "web" ? { dir: writingDirection } : {})}
    style={[{ textAlign: "left" }, style, { writingDirection }, rtl && localizedTextLayout(true, Platform.OS === "web")]} />;
}
export function TextInput({ style, keyboardType, onChangeText, contentDirection, ...props }: TextInputProps & ContentDirection) {
  const { i18n } = useTranslation();
  const numeric = ["decimal-pad", "number-pad", "numeric", "phone-pad"].includes(keyboardType ?? "");
  const rtl = i18n.language === "ar";
  const ltr = contentDirection === "ltr" || numeric || keyboardType === "email-address" || props.secureTextEntry;
  // Arabic placeholders start at the right; email, password and numeric values retain their order.
  const value = props.value ?? props.defaultValue ?? "";
  const writingDirection = rtl && !value ? "rtl" : ltr ? "ltr" : contentDirection ?? (rtl ? "rtl" : "ltr");
  return <NativeInput {...props} {...(Platform.OS === "web" ? { dir: writingDirection } : {})}
    keyboardType={keyboardType} onChangeText={value => onChangeText?.(numeric ? normalizeDigits(value) : value)}
    style={[style, { writingDirection }, localizedTextLayout(rtl, Platform.OS === "web")]} />;
}
