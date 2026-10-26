import React from "react";
import { Text as NativeText, TextInput as NativeInput, type TextProps, type TextInputProps } from "react-native";
import { normalizeDigits } from "../localization/core";
import { useTranslation } from "react-i18next";
export function Text({ style, ...props }: TextProps) {
  const { i18n } = useTranslation();
  const rtl = i18n.language === "ar";
  return <NativeText {...props} style={[{ writingDirection: rtl ? "rtl" : "ltr", textAlign: rtl ? "right" : "left" }, style]} />;
}
export function TextInput({ style, keyboardType, onChangeText, ...props }: TextInputProps) {
  const { i18n } = useTranslation();
  const numeric = ["decimal-pad", "number-pad", "numeric", "phone-pad"].includes(keyboardType ?? "");
  const ltr = numeric || keyboardType === "email-address" || props.secureTextEntry;
  return <NativeInput {...props} keyboardType={keyboardType} onChangeText={value => onChangeText?.(numeric ? normalizeDigits(value) : value)} style={[{ writingDirection: ltr || i18n.language !== "ar" ? "ltr" : "rtl", textAlign: ltr || i18n.language !== "ar" ? "left" : "right" }, style]} />;
}
