import React from "react";
import { KeyboardTypeOptions, StyleSheet, Text, TextInput, View } from "react-native";

const COLORS = {
  black: "#1A1A1A",
  gray: "#6B7280",
  grayLight: "#9CA3AF",
  border: "#E4E7E7",
  white: "#FFFFFF",
};

export default function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.grayLight}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 14,
  },
  label: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.black,
  },
  input: {
    marginTop: 7,
    height: 44,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    fontSize: 14,
    color: COLORS.black,
    backgroundColor: COLORS.white,
  },
});