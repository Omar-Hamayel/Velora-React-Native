import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "./LocalizedText";
import { selectLanguage, nativeRestartRequired, restartForDirection } from "../localization/runtime";
import { translate, type Language } from "../localization/core";
export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const choose = async (language: Language) => {
    setBusy(true); setError(false);
    try { await selectLanguage(language); } catch { setError(true); } finally { setBusy(false); }
  };
  return <View style={styles.box}>
    <Text>{translate("settings.language")}</Text>
    <View style={styles.row}>{(["en", "ar"] as Language[]).map(language => <TouchableOpacity key={language} accessibilityRole="button" accessibilityState={{selected: i18n.language === language, disabled: busy}} disabled={busy} onPress={() => choose(language)} style={[styles.option, i18n.language === language && styles.selected]}><Text>{language === "ar" ? "العربية" : "English"}</Text></TouchableOpacity>)}</View>
    {error && <Text accessibilityRole="alert">{translate("settings.syncFailed")}</Text>}
    {Platform.OS !== "web" && nativeRestartRequired && <TouchableOpacity onPress={restartForDirection}><Text>{translate("settings.restart")}</Text></TouchableOpacity>}
  </View>;
}
const styles = StyleSheet.create({ box: {padding: 12, gap: 8, backgroundColor: "#FFFFFF", borderRadius: 13}, row: {flexDirection: "row", gap: 10}, option: {padding: 9, borderRadius: 9, borderWidth: 1, borderColor: "#E4E7E7"}, selected: {borderColor: "#14919B", backgroundColor: "#E3F7F1"} });
