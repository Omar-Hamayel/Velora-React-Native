import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "./LocalizedText";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  background: "#FDECEC",
  border: "#F3B7B7",
  text: "#B42318",
  icon: "#D64545",
};

export default function ErrorBanner({
  message,
  onDismiss,
  tone = "error",
}: {
  message: string | null;
  onDismiss?: () => void;
  tone?: "error" | "success";
}) {
  if (!message) return null;

  return (
    <View accessibilityRole="alert" style={[styles.banner, tone === "success" && styles.successBanner]}>
      <Ionicons name={tone === "success" ? "checkmark-circle" : "alert-circle"} size={18} color={tone === "success" ? "#1E7A52" : COLORS.icon} />
      <Text style={[styles.text, tone === "success" && styles.successText]}>{message}</Text>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} hitSlop={8} activeOpacity={0.7}>
          <Ionicons name="close" size={16} color={COLORS.icon} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: "100%",
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  text: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.text,
  },
  successBanner: {
    backgroundColor: "#EAF7F0",
    borderColor: "#B6DECA",
  },
  successText: {
    color: "#1E7A52",
  },
});
