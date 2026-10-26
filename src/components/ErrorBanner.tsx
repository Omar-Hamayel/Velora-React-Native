import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
}: {
  message: string | null;
  onDismiss?: () => void;
}) {
  if (!message) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="alert-circle" size={18} color={COLORS.icon} />
      <Text style={styles.text}>{message}</Text>
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
});