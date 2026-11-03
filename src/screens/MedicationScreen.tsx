import { translate, i18n } from "../localization/core";
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
  deleteMedication,
  getMedications,
  submitMedication,
  updateMedication,
  type MedicationRecord,
  type MedicationRequest,
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

type FormState = {
  name: string;
  dose: string;
  frequency: string;
  relatedDisease: string;
  startDate: string;
  endDate: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  dose: "",
  frequency: "",
  relatedDisease: "",
  startDate: "",
  endDate: "",
  notes: "",
};

function recordToForm(record: MedicationRecord): FormState {
  return {
    name: record.name,
    dose: record.dose ?? "",
    frequency: record.frequency ?? "",
    relatedDisease: record.relatedDisease ?? "",
    startDate: isoToDdmmyyyy(record.startDate),
    endDate: isoToDdmmyyyy(record.endDate),
    notes: record.notes ?? "",
  };
}

function formToPayload(form: FormState): MedicationRequest {
  return {
    name: form.name.trim(),
    dose: form.dose.trim() === "" ? undefined : form.dose.trim(),
    frequency: form.frequency.trim() === "" ? undefined : form.frequency.trim(),
    relatedDisease: form.relatedDisease.trim() === "" ? undefined : form.relatedDisease.trim(),
    startDate: ddmmyyyyToIso(form.startDate),
    endDate: ddmmyyyyToIso(form.endDate),
    notes: form.notes.trim() === "" ? undefined : form.notes.trim(),
  };
}

export default function MedicationScreen({
  onBack,
}: {
  onBack?: (origin: ScreenPoint) => void;
}) {
  const [records, setRecords] = useState<MedicationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const loadRecords = () => {
    setIsLoading(true);
    getMedications()
      .then((list) => setRecords([...list].reverse()))
      .catch((err) => {
        setErrorMessage(err instanceof ApiError ? err.message : translate("screens.Medication.couldnTLoadMedications"));
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(loadRecords, []);

  const startAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId("new");
    setErrorMessage(null);
  };

  const startEdit = (record: MedicationRecord) => {
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
    form.name.trim() !== "" &&
    isValidOrEmptyDate(form.startDate) &&
    isValidOrEmptyDate(form.endDate);

  const save = async () => {
    if (!formValid || isSaving || editingId === null) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const payload = formToPayload(form);
      if (editingId === "new") {
        await submitMedication(payload);
      } else {
        await updateMedication(editingId, payload);
      }
      setEditingId(null);
      loadRecords();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : translate("screens.Medication.couldnTSaveThisMedication"));
    } finally {
      setIsSaving(false);
    }
  };

  const performDelete = async () => {
    if (typeof editingId !== "number") return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteMedication(editingId);
      setEditingId(null);
      setConfirmingDelete(false);
      loadRecords();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : translate("screens.Medication.couldnTDeleteThisMedication"));
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
          <Text style={styles.headerTitle}>{translate("screens.Medication.medication")}</Text>
          <TouchableOpacity activeOpacity={0.85} hitSlop={8} accessibilityRole="button" accessibilityLabel={translate("screens.Medication.addMedication")} onPress={startAdd} style={styles.addButton}>
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
              <Text style={styles.cardTitle}>{editingId === "new" ? translate("screens.Medication.addMedication") : translate("screens.Medication.editMedication")}</Text>
              <LabeledInput label={translate("screens.Medication.name")} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder={translate("screens.Medication.eGMetformin")} />
              <LabeledInput label={translate("screens.Medication.dose")} value={form.dose} onChangeText={(v) => setForm((f) => ({ ...f, dose: v }))} placeholder={translate("screens.Medication.eG500mg")} />
              <LabeledInput label={translate("screens.Medication.frequency")} value={form.frequency} onChangeText={(v) => setForm((f) => ({ ...f, frequency: v }))} placeholder={translate("screens.Medication.eGTwiceDaily")} />
              <LabeledInput label={translate("screens.Medication.relatedCondition")} value={form.relatedDisease} onChangeText={(v) => setForm((f) => ({ ...f, relatedDisease: v }))} placeholder={translate("screens.Medication.eGDiabetes")} />
              <DateInput
                label={translate("screens.Medication.startDate")}
                value={form.startDate}
                onChangeText={(v) => setForm((f) => ({ ...f, startDate: v }))}
                invalid={!isValidOrEmptyDate(form.startDate)}
              />
              <DateInput
                label={translate("screens.Medication.endDate")}
                value={form.endDate}
                onChangeText={(v) => setForm((f) => ({ ...f, endDate: v }))}
                invalid={!isValidOrEmptyDate(form.endDate)}
              />
              <LabeledInput label={translate("screens.Medication.notes")} value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} placeholder={translate("screens.Medication.optionalNotes")} />

              <View style={styles.formButtonRow}>
                <TouchableOpacity activeOpacity={0.8} style={styles.cancelButton} onPress={cancelForm}>
                  <Text style={styles.cancelButtonText}>{translate("screens.Medication.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.saveButton, (!formValid || isSaving) && styles.saveButtonDisabled]}
                  onPress={save}
                  disabled={!formValid || isSaving}
                >
                  {isSaving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveButtonText}>{translate("screens.Medication.save")}</Text>}
                </TouchableOpacity>
              </View>

              {typeof editingId === "number" && !confirmingDelete && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.deleteButton}
                  onPress={() => setConfirmingDelete(true)}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                  <Text style={styles.deleteButtonText}>{translate("screens.Medication.deleteMedication")}</Text>
                </TouchableOpacity>
              )}

              {typeof editingId === "number" && confirmingDelete && (
                <View style={styles.confirmDeleteWrap}>
                  <Text style={styles.confirmDeleteText}>{translate("screens.Medication.deleteThisMedicationThisCanTBeUndone")}</Text>
                  <View style={styles.formButtonRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.cancelButton}
                      onPress={() => setConfirmingDelete(false)}
                    >
                      <Text style={styles.cancelButtonText}>{translate("screens.Medication.cancel")}</Text>
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
                        <Text style={styles.saveButtonText}>{translate("screens.Medication.yesDelete")}</Text>
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
              <Ionicons name="medkit-outline" size={36} color={COLORS.grayLight} />
              <Text style={styles.emptyText}>{translate("screens.Medication.noMedicationsYetTapToAddOne")}</Text>
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
                  <Text style={styles.recordName}>{record.name}</Text>
                  <Ionicons name="pencil-outline" size={16} color={COLORS.gray} />
                </View>
                <View style={styles.recordMetaRow}>
                  {record.dose ? <Text style={styles.recordMeta}>{record.dose}</Text> : null}
                  {record.frequency ? <Text style={styles.recordMeta}>{record.frequency}</Text> : null}
                </View>
                {record.relatedDisease ? (
                  <Text style={styles.recordTag}>{translate("screens.Medication.for")} {record.relatedDisease}</Text>
                ) : null}
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
  recordName: { fontSize: 15, fontWeight: "700", color: COLORS.black },
  recordMetaRow: { marginTop: 6, flexDirection: "row", gap: 14 },
  recordMeta: { fontSize: 12.5, color: COLORS.gray },
  recordTag: {
    marginTop: 8,
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.tealDark,
    backgroundColor: COLORS.tealTint,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 8,
  },
});
