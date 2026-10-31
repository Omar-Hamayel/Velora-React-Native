import React, { useState } from "react";
import { ActivityIndicator, Keyboard, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text } from "./LocalizedText";
import { nativeRestartRequired, restartForDirection, selectLanguage } from "../localization/runtime";
import { translate, type Language } from "../localization/core";

const LANGUAGES: { code: Language; name: string }[] = [
  { code: "en", name: "English" },
  { code: "ar", name: "العربية" },
];

export default function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const rtl = i18n.language === "ar";

  const choose = async (language: Language) => {
    setBusy(true);
    setError(false);
    try {
      await selectLanguage(language);
      if (Platform.OS === "web" || !nativeRestartRequired) setOpen(false);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={compact ? styles.compact : styles.settingRow}>
      {!compact && <View style={styles.settingText}><Text style={styles.settingTitle}>{translate("settings.language")}</Text></View>}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translate("settings.changeLanguage")}
        accessibilityState={{ expanded: open, disabled: busy }}
        disabled={busy}
        onPress={() => { Keyboard.dismiss(); setOpen(true); }}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <Ionicons name="globe-outline" size={18} color="#0F7A82" />
        <Text style={styles.triggerText}>{rtl ? "العربية" : "English"}</Text>
        <Ionicons name="chevron-down" size={13} color="#0F7A82" />
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={[styles.modalRoot, { direction: rtl ? "rtl" : "ltr" }]}>
          <Pressable style={styles.backdrop} accessibilityRole="button" accessibilityLabel={translate("common.cancel")} onPress={() => setOpen(false)} />
          <View style={styles.dialog} accessibilityViewIsModal>
            <View style={styles.dialogHeader}>
              <View style={styles.dialogIcon}><Ionicons name="language-outline" size={23} color="#14919B" /></View>
              <Text style={styles.dialogTitle}>{translate("settings.chooseLanguage")}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={translate("common.cancel")} onPress={() => setOpen(false)} hitSlop={10} style={styles.closeButton}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </Pressable>
            </View>
            {LANGUAGES.map(language => {
              const selected = i18n.language === language.code;
              return (
                <Pressable
                  key={language.code}
                  accessibilityRole="radio"
                  accessibilityLabel={language.name}
                  accessibilityState={{ checked: selected, disabled: busy }}
                  disabled={busy}
                  onPress={() => void choose(language.code)}
                  style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed]}
                >
                  <Text style={[styles.optionName, selected && styles.selectedText]}>{language.name}</Text>
                  {busy && selected ? <ActivityIndicator size="small" color="#14919B" /> : <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={22} color={selected ? "#14919B" : "#CCD5D5"} />}
                </Pressable>
              );
            })}
            {error && <Text accessibilityRole="alert" style={styles.message}>{translate("settings.syncFailed")}</Text>}
            {Platform.OS !== "web" && nativeRestartRequired && <Pressable onPress={() => void restartForDirection()} style={styles.restartButton}><Text style={styles.restartText}>{translate("settings.restart")}</Text></Pressable>}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  compact: { flexShrink: 0 },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, gap: 12 },
  settingText: { flex: 1 },
  settingTitle: { fontSize: 14, fontWeight: "600", color: "#1A1A1A", lineHeight: 22 },
  trigger: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 11, borderRadius: 20, borderWidth: 1, borderColor: "#D5EAE7", backgroundColor: "#F0F8F6" },
  triggerText: { fontSize: 12.5, fontWeight: "600", color: "#0F7A82", lineHeight: 20 },
  pressed: { opacity: 0.7 },
  modalRoot: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(8, 33, 31, 0.38)" },
  dialog: { width: "100%", maxWidth: 350, padding: 22, borderRadius: 24, backgroundColor: "#FFFFFF", shadowColor: "#04372F", shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8, gap: 10 },
  dialogHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  dialogIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#EAF7F2", alignItems: "center", justifyContent: "center" },
  dialogTitle: { flex: 1, fontSize: 17, lineHeight: 26, fontWeight: "700", color: "#173D39" },
  closeButton: { padding: 5 },
  option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 56, paddingHorizontal: 16, borderWidth: 1, borderColor: "#E5EBE9", borderRadius: 14, backgroundColor: "#FFFFFF" },
  selected: { borderColor: "#14919B", backgroundColor: "#EEF9F5" },
  optionName: { fontSize: 16, lineHeight: 25, color: "#3F5552", fontWeight: "500" },
  selectedText: { color: "#0F7A82", fontWeight: "700" },
  message: { marginTop: 5, fontSize: 12, lineHeight: 20, color: "#9A492C" },
  restartButton: { paddingVertical: 12, alignItems: "center" },
  restartText: { color: "#0F7A82", fontWeight: "600", lineHeight: 22 },
});
