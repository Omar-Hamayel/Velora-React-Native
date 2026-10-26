import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
  deleteLabResult,
  getLabResults,
  submitLabResult,
  updateLabResult,
  type LabResultRecord,
  type LabResultRequest,
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
  hbA1c: string;
  fastingGlucose: string;
  randomGlucose: string;
  ogtt: string;
  totalCholesterol: string;
  ldl: string;
  hdl: string;
  triglycerides: string;
  fastingInsulin: string;
  testDate: string;
};

const EMPTY_FORM: FormState = {
  hbA1c: "",
  fastingGlucose: "",
  randomGlucose: "",
  ogtt: "",
  totalCholesterol: "",
  ldl: "",
  hdl: "",
  triglycerides: "",
  fastingInsulin: "",
  testDate: "",
};

function recordToForm(record: LabResultRecord): FormState {
  return {
    hbA1c: record.hbA1c != null ? String(record.hbA1c) : "",
    fastingGlucose: record.fastingGlucose != null ? String(record.fastingGlucose) : "",
    randomGlucose: record.randomGlucose != null ? String(record.randomGlucose) : "",
    ogtt: record.ogtt != null ? String(record.ogtt) : "",
    totalCholesterol: record.totalCholesterol != null ? String(record.totalCholesterol) : "",
    ldl: record.ldl != null ? String(record.ldl) : "",
    hdl: record.hdl != null ? String(record.hdl) : "",
    triglycerides: record.triglycerides != null ? String(record.triglycerides) : "",
    fastingInsulin: record.fastingInsulin != null ? String(record.fastingInsulin) : "",
    testDate: isoToDdmmyyyy(record.testDate),
  };
}

function formToPayload(form: FormState): LabResultRequest {
  const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
  return {
    hbA1c: num(form.hbA1c),
    fastingGlucose: num(form.fastingGlucose),
    randomGlucose: num(form.randomGlucose),
    ogtt: num(form.ogtt),
    totalCholesterol: num(form.totalCholesterol),
    ldl: num(form.ldl),
    hdl: num(form.hdl),
    triglycerides: num(form.triglycerides),
    fastingInsulin: num(form.fastingInsulin),
    testDate: ddmmyyyyToIso(form.testDate),
  };
}

function hasAtLeastOneMeasurement(form: FormState): boolean {
  return (
    form.hbA1c.trim() !== "" ||
    form.fastingGlucose.trim() !== "" ||
    form.randomGlucose.trim() !== "" ||
    form.ogtt.trim() !== "" ||
    form.totalCholesterol.trim() !== "" ||
    form.ldl.trim() !== "" ||
    form.hdl.trim() !== "" ||
    form.triglycerides.trim() !== "" ||
    form.fastingInsulin.trim() !== ""
  );
}

export default function LabResultsScreen({
  onBack,
}: {
  onBack?: (origin: ScreenPoint) => void;
}) {
  const [records, setRecords] = useState<LabResultRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const loadRecords = () => {
    setIsLoading(true);
    getLabResults()
      .then((list) => setRecords([...list].reverse()))
      .catch((err) => {
        setErrorMessage(err instanceof ApiError ? err.message : "Couldn't load lab results.");
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(loadRecords, []);

  const startAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId("new");
    setErrorMessage(null);
  };

  const startEdit = (record: LabResultRecord) => {
    setForm(recordToForm(record));
    setEditingId(record.id);
    setErrorMessage(null);
  };

  const cancelForm = () => {
    setEditingId(null);
    setConfirmingDelete(false);
    setErrorMessage(null);
  };

  const formValid = hasAtLeastOneMeasurement(form) && isValidOrEmptyDate(form.testDate);

  const save = async () => {
    if (!formValid || isSaving || editingId === null) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const payload = formToPayload(form);
      if (editingId === "new") {
        await submitLabResult(payload);
      } else {
        await updateLabResult(editingId, payload);
      }
      setEditingId(null);
      loadRecords();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Couldn't save this lab result.");
    } finally {
      setIsSaving(false);
    }
  };

  const performDelete = async () => {
    if (typeof editingId !== "number") return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteLabResult(editingId);
      setEditingId(null);
      setConfirmingDelete(false);
      loadRecords();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Couldn't delete this lab result.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={styles.outer}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            hitSlop={8}
            onPress={(e) => onBack?.({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lab Results</Text>
          <TouchableOpacity activeOpacity={0.85} hitSlop={8} onPress={startAdd} style={styles.addButton}>
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
              <Text style={styles.cardTitle}>
                {editingId === "new" ? "Add Lab Result" : "Edit Lab Result"}
              </Text>
              <LabeledInput label="HbA1c (%)" value={form.hbA1c} onChangeText={(v) => setForm((f) => ({ ...f, hbA1c: v }))} keyboardType="numeric" placeholder="e.g. 5.6" />
              <LabeledInput label="Fasting Glucose (mg/dL)" value={form.fastingGlucose} onChangeText={(v) => setForm((f) => ({ ...f, fastingGlucose: v }))} keyboardType="numeric" placeholder="e.g. 95" />
              <LabeledInput label="Random Glucose (mg/dL)" value={form.randomGlucose} onChangeText={(v) => setForm((f) => ({ ...f, randomGlucose: v }))} keyboardType="numeric" placeholder="e.g. 110" />
              <LabeledInput label="OGTT (mg/dL)" value={form.ogtt} onChangeText={(v) => setForm((f) => ({ ...f, ogtt: v }))} keyboardType="numeric" placeholder="e.g. 140" />
              <LabeledInput label="Total Cholesterol (mg/dL)" value={form.totalCholesterol} onChangeText={(v) => setForm((f) => ({ ...f, totalCholesterol: v }))} keyboardType="numeric" placeholder="e.g. 180" />
              <LabeledInput label="LDL (mg/dL)" value={form.ldl} onChangeText={(v) => setForm((f) => ({ ...f, ldl: v }))} keyboardType="numeric" placeholder="e.g. 100" />
              <LabeledInput label="HDL (mg/dL)" value={form.hdl} onChangeText={(v) => setForm((f) => ({ ...f, hdl: v }))} keyboardType="numeric" placeholder="e.g. 50" />
              <LabeledInput label="Triglycerides (mg/dL)" value={form.triglycerides} onChangeText={(v) => setForm((f) => ({ ...f, triglycerides: v }))} keyboardType="numeric" placeholder="e.g. 120" />
              <LabeledInput label="Fasting Insulin (µIU/mL)" value={form.fastingInsulin} onChangeText={(v) => setForm((f) => ({ ...f, fastingInsulin: v }))} keyboardType="numeric" placeholder="e.g. 8.5" />
              <DateInput
                label="Test Date"
                value={form.testDate}
                onChangeText={(v) => setForm((f) => ({ ...f, testDate: v }))}
                invalid={!isValidOrEmptyDate(form.testDate)}
              />

              <View style={styles.formButtonRow}>
                <TouchableOpacity activeOpacity={0.8} style={styles.cancelButton} onPress={cancelForm}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.saveButton, (!formValid || isSaving) && styles.saveButtonDisabled]}
                  onPress={save}
                  disabled={!formValid || isSaving}
                >
                  {isSaving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveButtonText}>Save</Text>}
                </TouchableOpacity>
              </View>

              {typeof editingId === "number" && !confirmingDelete && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.deleteButton}
                  onPress={() => setConfirmingDelete(true)}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                  <Text style={styles.deleteButtonText}>Delete Lab Result</Text>
                </TouchableOpacity>
              )}

              {typeof editingId === "number" && confirmingDelete && (
                <View style={styles.confirmDeleteWrap}>
                  <Text style={styles.confirmDeleteText}>
                    Delete this lab result? This can't be undone.
                  </Text>
                  <View style={styles.formButtonRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.cancelButton}
                      onPress={() => setConfirmingDelete(false)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
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
                        <Text style={styles.saveButtonText}>Yes, Delete</Text>
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
              <Ionicons name="flask-outline" size={36} color={COLORS.grayLight} />
              <Text style={styles.emptyText}>No lab results yet. Tap + to add one.</Text>
            </View>
          ) : (
            records.map((record) => {
              const fields: { label: string; value: number | null }[] = [
                { label: "HbA1c", value: record.hbA1c ?? null },
                { label: "Fasting Glucose", value: record.fastingGlucose ?? null },
                { label: "Random Glucose", value: record.randomGlucose ?? null },
                { label: "OGTT", value: record.ogtt ?? null },
                { label: "Total Cholesterol", value: record.totalCholesterol ?? null },
                { label: "LDL", value: record.ldl ?? null },
                { label: "HDL", value: record.hdl ?? null },
                { label: "Triglycerides", value: record.triglycerides ?? null },
                { label: "Fasting Insulin", value: record.fastingInsulin ?? null },
                { label: "HOMA-IR", value: record.homair ?? null },
              ].filter((f) => f.value !== null);

              return (
                <TouchableOpacity
                  key={record.id}
                  activeOpacity={0.85}
                  style={styles.recordCard}
                  onPress={() => startEdit(record)}
                >
                  <View style={styles.recordCardHeader}>
                    <Text style={styles.recordDate}>
                      {record.testDate && !record.testDate.startsWith("0001")
                        ? record.testDate.slice(0, 10)
                        : "No date"}
                    </Text>
                    <Ionicons name="pencil-outline" size={16} color={COLORS.gray} />
                  </View>
                  <View style={styles.recordFieldGrid}>
                    {fields.map((f) => (
                      <View key={f.label} style={styles.recordFieldItem}>
                        <Text style={styles.recordFieldLabel}>{f.label}</Text>
                        <Text style={styles.recordFieldValue}>{f.value}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })
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
  emptyText: { fontSize: 13, color: COLORS.gray, textAlign: "center" },
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
  recordDate: { fontSize: 12.5, fontWeight: "700", color: COLORS.tealDark },
  recordFieldGrid: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  recordFieldItem: {
    minWidth: "45%",
    backgroundColor: COLORS.tealTint,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  recordFieldLabel: { fontSize: 10.5, color: COLORS.gray, fontWeight: "600" },
  recordFieldValue: { fontSize: 13.5, color: COLORS.black, fontWeight: "700", marginTop: 1 },
});