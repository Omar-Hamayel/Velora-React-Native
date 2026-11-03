import { translate, i18n, medicalNumber } from "../localization/core";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "../components/LocalizedText";
import { Ionicons } from "@expo/vector-icons";
import ErrorBanner from "../components/ErrorBanner";
import LabeledInput from "../components/LabeledInput";
import DateInput, {
  ddmmyyyyToIso,
  isoToDdmmyyyy,
  isValidOrEmptyDate,
} from "../components/DateInput";
import {
  ApiError,
  deleteBloodPressureReading,
  getBloodPressureReadings,
  submitBloodPressureReading,
  updateBloodPressureReading,
  type BloodPressureReadingRecord,
  type BloodPressureReadingRequest,
} from "../api/authApi";
import type { ScreenPoint } from "./OnboardingScreen";

const MAX_CONTENT_WIDTH = 430;
const HEADER_TOP_INSET = Platform.OS === "ios" ? 54 : (StatusBar.currentHeight ?? 24) + 12;

const COLORS = {
  teal: "#14919B",
  tealDark: "#0F7A82",
  tealTint: "#E3F7F1",
  black: "#1A1A1A",
  gray: "#6B7280",
  grayLight: "#9CA3AF",
  border: "#E4E7E7",
  white: "#FFFFFF",
  background: "#F5F8F7",
  error: "#D64545",
};

const SYSTOLIC_MIN = 50;
const SYSTOLIC_MAX = 300;
const DIASTOLIC_MIN = 30;
const DIASTOLIC_MAX = 200;

function numberInRange(value: string, min: number, max: number): boolean {
  if (value.trim() === "") return false;
  const num = medicalNumber(value);
  return Number.isFinite(num) && num >= min && num <= max;
}

type FormState = { systolic: string; diastolic: string; pulse: string; measuredAt: string; notes: string };
const EMPTY_FORM: FormState = { systolic: "", diastolic: "", pulse: "", measuredAt: "", notes: "" };

function recordToForm(record: BloodPressureReadingRecord): FormState {
  return {
    systolic: String(record.systolic),
    diastolic: String(record.diastolic),
    pulse: record.pulse != null ? String(record.pulse) : "",
    measuredAt: isoToDdmmyyyy(record.measuredAt),
    notes: record.notes ?? "",
  };
}

function formToPayload(form: FormState): BloodPressureReadingRequest {
  return {
    systolic: medicalNumber(form.systolic),
    diastolic: medicalNumber(form.diastolic),
    pulse: form.pulse.trim() === "" ? undefined : medicalNumber(form.pulse),
    measuredAt: ddmmyyyyToIso(form.measuredAt),
    notes: form.notes.trim() === "" ? undefined : form.notes.trim(),
  };
}

export default function BloodPressureScreen({
  onBack,
}: {
  onBack?: (origin: ScreenPoint) => void;
}) {
  const [records, setRecords] = useState<BloodPressureReadingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const loadRecords = () => {
    setIsLoading(true);
    getBloodPressureReadings()
      .then((list) => setRecords([...list].reverse()))
      .catch((err) => {
        setErrorMessage(err instanceof ApiError ? err.message : translate("screens.BloodPressure.couldnTLoadBloodPressureReadings"));
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(loadRecords, []);

  const startAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId("new");
    setErrorMessage(null);
  };

  const startEdit = (record: BloodPressureReadingRecord) => {
    setForm(recordToForm(record));
    setEditingId(record.id);
    setErrorMessage(null);
  };

  const cancelForm = () => {
    setEditingId(null);
    setConfirmingDelete(false);
    setErrorMessage(null);
  };

  const formValid =
    numberInRange(form.systolic, SYSTOLIC_MIN, SYSTOLIC_MAX) &&
    numberInRange(form.diastolic, DIASTOLIC_MIN, DIASTOLIC_MAX) &&
    isValidOrEmptyDate(form.measuredAt);

  const save = async () => {
    if (!formValid || isSaving || editingId === null) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const payload = formToPayload(form);
      if (editingId === "new") {
        await submitBloodPressureReading(payload);
      } else {
        await updateBloodPressureReading(editingId, payload);
      }
      setEditingId(null);
      loadRecords();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : translate("screens.BloodPressure.couldnTSaveThisReading"));
    } finally {
      setIsSaving(false);
    }
  };

  const performDelete = async () => {
    if (typeof editingId !== "number") return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteBloodPressureReading(editingId);
      setEditingId(null);
      setConfirmingDelete(false);
      loadRecords();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : translate("screens.BloodPressure.couldnTDeleteThisReading"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={styles.outer}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            hitSlop={8}
            accessibilityRole="button" accessibilityLabel={translate("common.back")} onPress={(e) => onBack?.({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
            style={styles.backButton}
          >
            <Ionicons name={i18n.language === "ar" ? "arrow-forward" : "arrow-back"} size={20} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{translate("screens.BloodPressure.bloodPressure")}</Text>
          <TouchableOpacity activeOpacity={0.85} hitSlop={8} accessibilityRole="button" accessibilityLabel={translate("screens.BloodPressure.addReading")} onPress={startAdd} style={styles.addButton}>
            <Ionicons name="add" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
        >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />

          {editingId !== null && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{editingId === "new" ? translate("screens.BloodPressure.addReading") : translate("screens.BloodPressure.editReading")}</Text>
              <LabeledInput label={translate("screens.BloodPressure.systolicMmhg")} value={form.systolic} onChangeText={(v) => setForm((f) => ({ ...f, systolic: v }))} keyboardType="numeric" placeholder={translate("screens.BloodPressure.eG120")} />
              <LabeledInput label={translate("screens.BloodPressure.diastolicMmhg")} value={form.diastolic} onChangeText={(v) => setForm((f) => ({ ...f, diastolic: v }))} keyboardType="numeric" placeholder={translate("screens.BloodPressure.eG80")} />
              <LabeledInput label={translate("screens.BloodPressure.pulseBpm")} value={form.pulse} onChangeText={(v) => setForm((f) => ({ ...f, pulse: v }))} keyboardType="numeric" placeholder={translate("screens.BloodPressure.eG72")} />
              <DateInput
                label={translate("screens.BloodPressure.dateMeasured")}
                value={form.measuredAt}
                onChangeText={(v) => setForm((f) => ({ ...f, measuredAt: v }))}
                invalid={!isValidOrEmptyDate(form.measuredAt)}
              />
              <LabeledInput label={translate("screens.BloodPressure.notes")} value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} placeholder={translate("screens.BloodPressure.eGMorningReading")} />

              <View style={styles.formButtonRow}>
                <TouchableOpacity activeOpacity={0.8} style={styles.cancelButton} onPress={cancelForm}>
                  <Text style={styles.cancelButtonText}>{translate("screens.BloodPressure.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.saveButton, (!formValid || isSaving) && styles.saveButtonDisabled]}
                  onPress={save}
                  disabled={!formValid || isSaving}
                >
                  {isSaving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveButtonText}>{translate("screens.BloodPressure.save")}</Text>}
                </TouchableOpacity>
              </View>

              {typeof editingId === "number" && !confirmingDelete && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.deleteButton}
                  onPress={() => setConfirmingDelete(true)}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                  <Text style={styles.deleteButtonText}>{translate("screens.BloodPressure.deleteReading")}</Text>
                </TouchableOpacity>
              )}

              {typeof editingId === "number" && confirmingDelete && (
                <View style={styles.confirmDeleteWrap}>
                  <Text style={styles.confirmDeleteText}>{translate("screens.BloodPressure.deleteThisReadingThisCanTBeUndone")}</Text>
                  <View style={styles.formButtonRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.cancelButton}
                      onPress={() => setConfirmingDelete(false)}
                    >
                      <Text style={styles.cancelButtonText}>{translate("screens.BloodPressure.cancel")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[styles.confirmDeleteButton, isDeleting && styles.saveButtonDisabled]}
                      onPress={performDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <ActivityIndicator color={COLORS.white} />
                      ) : (
                        <Text style={styles.saveButtonText}>{translate("screens.BloodPressure.yesDelete")}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {isLoading ? (
            <ActivityIndicator style={styles.loadingIndicator} color={COLORS.teal} />
          ) : records.length === 0 && editingId === null ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="heart-outline" size={36} color={COLORS.grayLight} />
              <Text style={styles.emptyText}>{translate("screens.BloodPressure.noBloodPressureReadingsYetTapToAddOne")}</Text>
            </View>
          ) : (
            records.map((record) => (
              <TouchableOpacity
                key={record.id}
                activeOpacity={0.85}
                style={styles.recordCard}
                onPress={() => startEdit(record)}
              >
                <View style={styles.recordCardHeader}>
                  <Text style={styles.recordReading}>
                    {record.systolic}/{record.diastolic} <Text style={styles.recordUnit}>{translate("screens.BloodPressure.mmhg")}</Text>
                  </Text>
                  <Ionicons name="pencil-outline" size={16} color={COLORS.gray} />
                </View>
                <View style={styles.recordMetaRow}>
                  {record.pulse != null && (
                    <Text style={styles.recordMeta}>{translate("screens.BloodPressure.pulse")} {record.pulse}{translate("screens.BloodPressure.bpm")}</Text>
                  )}
                  {record.measuredAt && !record.measuredAt.startsWith("0001") && (
                    <Text style={styles.recordMeta}>{record.measuredAt.slice(0, 10)}</Text>
                  )}
                </View>
                {record.notes ? <Text style={styles.recordNotes}>{record.notes}</Text> : null}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1, width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },
  keyboardAvoider: { flex: 1 },
  header: {
    paddingTop: HEADER_TOP_INSET,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: COLORS.black },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#04372F",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardTitle: { fontSize: 14.5, fontWeight: "700", color: COLORS.black },
  formButtonRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  cancelButtonText: { fontSize: 13.5, fontWeight: "700", color: COLORS.gray },
  saveButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.teal,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { fontSize: 13.5, fontWeight: "700", color: COLORS.white },
  deleteButton: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: COLORS.error,
  },
  deleteButtonText: { fontSize: 13, fontWeight: "700", color: COLORS.error },
  confirmDeleteWrap: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FDECEC",
    borderWidth: 1,
    borderColor: "#F3B7B7",
  },
  confirmDeleteText: { fontSize: 12.5, fontWeight: "600", color: COLORS.error },
  confirmDeleteButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.error,
  },
  loadingIndicator: { marginTop: 30 },
  emptyWrap: { alignItems: "center", justifyContent: "center", marginTop: 50, gap: 10 },
  emptyText: { width: "100%", fontSize: 13, color: COLORS.gray, textAlign: "center" },
  recordCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#04372F",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  recordCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recordReading: { fontSize: 17, fontWeight: "800", color: COLORS.tealDark },
  recordUnit: { fontSize: 12, fontWeight: "600", color: COLORS.gray },
  recordMetaRow: { marginTop: 6, flexDirection: "row", gap: 14 },
  recordMeta: { fontSize: 12, color: COLORS.gray },
  recordNotes: { marginTop: 6, fontSize: 12.5, color: COLORS.black },
});
