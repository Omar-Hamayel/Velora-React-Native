import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  black: "#1A1A1A",
  gray: "#6B7280",
  grayLight: "#9CA3AF",
  border: "#E4E7E7",
  error: "#D64545",
  white: "#FFFFFF",
};

const DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;

// Same digit-only auto-formatting used for Date of Birth in sign-up, so a
// user can never type an unpadded/ambiguous date like "2026-10-5" — typing
// is always coerced into a complete DD/MM/YYYY shape.
export function formatDateDigits(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

// This app's dates are always optional on these forms (unlike DOB), so an
// empty value is valid — only a partially/incorrectly filled date is not.
export function isValidOrEmptyDate(value: string): boolean {
  if (value.trim() === "") return true;
  const match = DATE_REGEX.exec(value);
  if (!match) return false;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

// Converts a valid "DD/MM/YYYY" to the "YYYY-MM-DD" the API expects.
export function ddmmyyyyToIso(value: string): string | undefined {
  const match = DATE_REGEX.exec(value);
  if (!match) return undefined;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

// Converts an ISO date ("YYYY-MM-DDT...") back to "DD/MM/YYYY" for display.
export function isoToDdmmyyyy(iso: string | null | undefined): string {
  if (!iso || iso.startsWith("0001")) return "";
  const [year, month, day] = iso.slice(0, 10).split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}

export default function DateInput({
  label,
  value,
  onChangeText,
  invalid = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  invalid?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, invalid && styles.inputRowError]}>
        <TextInput
          style={styles.input}
          placeholder="DD/MM/YYYY"
          placeholderTextColor={COLORS.grayLight}
          keyboardType="number-pad"
          maxLength={10}
          value={value}
          onChangeText={(text) => onChangeText(formatDateDigits(text))}
        />
        <Ionicons name="calendar-outline" size={18} color={COLORS.gray} />
      </View>
      {invalid && <Text style={styles.errorText}>Enter a valid date (DD/MM/YYYY).</Text>}
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
  inputRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    backgroundColor: COLORS.white,
    gap: 8,
  },
  inputRowError: {
    borderColor: COLORS.error,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.black,
    height: "100%",
  },
  errorText: {
    marginTop: 5,
    fontSize: 11.5,
    color: COLORS.error,
  },
});