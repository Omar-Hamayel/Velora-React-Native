import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text } from "./LocalizedText";
import LocalizedView from "./LocalizedView";
import ErrorBanner from "./ErrorBanner";
import DateInput, { ddmmyyyyToIso, isoToDdmmyyyy, isValidOrEmptyDate } from "./DateInput";
import { translate } from "../localization/core";
import { ApiError, SUPPORTED_CONDITIONS, getDiseaseCatalog, getUserDiseases, addUserDisease,
  updateUserDisease, removeUserDisease, type DiseaseRecord, type DiseaseType, type UserDiseaseRecord } from "../api/authApi";

export default function UserConditions() {
  useTranslation();
  const [records, setRecords] = useState<UserDiseaseRecord[]>([]);
  const [catalog, setCatalog] = useState<DiseaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<{code:DiseaseType;record?:UserDiseaseRecord} | null>(null);
  const [date, setDate] = useState("");
  const [removing, setRemoving] = useState<UserDiseaseRecord | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [saved, choices] = await Promise.all([getUserDiseases(), getDiseaseCatalog()]);
      setRecords(saved); setCatalog(choices); setLoaded(true);
    } catch (failure) { setError(failure instanceof ApiError ? failure.message : translate("errors.server")); }
    finally { setLoading(false); }
  };
  useEffect(() => {void load();}, []);
  const codeFor = (record: UserDiseaseRecord) => record.conditionCode ?? catalog.find(choice => choice.id === record.diseaseId)?.code;
  const labelFor = (record: UserDiseaseRecord) => {
    const known = SUPPORTED_CONDITIONS.find(choice => choice.code === codeFor(record));
    return known ? translate(known.label) : record.diseaseName;
  };
  const legacy = records.filter(record => !SUPPORTED_CONDITIONS.some(choice => choice.code === codeFor(record)));
  const edit = (code: DiseaseType, record?: UserDiseaseRecord) => {
    setEditing({code,record}); setDate(isoToDdmmyyyy(record?.diagnosisDate)); setNotice(null); setError(null);
  };
  const save = async () => {
    if (!editing || busy || !isValidOrEmptyDate(date)) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const saved = editing.record ? await updateUserDisease(editing.record, ddmmyyyyToIso(date)) : await addUserDisease(editing.code, ddmmyyyyToIso(date));
      setRecords(current => [...current.filter(record => record.id !== saved.id), saved]);
      setEditing(null); setNotice(translate("conditionsUi.saved"));
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : translate("errors.server"));
      // A response timeout can happen after a successful commit. Read before another explicit retry.
      await load();
    } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!removing || busy) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await removeUserDisease(removing.id);
      setRecords(current => current.filter(record => record.id !== removing.id));
      if (editing?.record?.id === removing.id) setEditing(null);
      setRemoving(null); setNotice(translate("conditionsUi.removed"));
    } catch (failure) {setRemoving(null);setError(failure instanceof ApiError ? failure.message : translate("errors.server"));await load();}
    finally {setBusy(false);}
  };
  return <View testID="user-conditions" style={styles.card}>
    <View style={styles.heading}><View style={styles.icon}><Ionicons name="heart-outline" size={20} color="#14919B" /></View>
      <View style={{flex:1}}><Text style={styles.title}>{translate("conditionsUi.title")}</Text><Text style={styles.hint}>{translate("conditionsUi.hint")}</Text></View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={translate("conditionsUi.refresh")} disabled={loading||busy}
        onPress={() => {setError(null);void load();}} style={styles.icon}><Ionicons name="refresh-outline" size={20} color="#14919B" /></TouchableOpacity>
    </View>
    <ErrorBanner message={error} onDismiss={() => setError(null)} />
    <ErrorBanner message={notice} tone="success" onDismiss={() => setNotice(null)} />
    {loading && <ActivityIndicator color="#14919B" />}
    {loaded && <>
      {!records.length && <Text style={styles.hint}>{translate("conditionsUi.none")}</Text>}
      {SUPPORTED_CONDITIONS.map(choice => {
        const record = records.find(item => codeFor(item) === choice.code);
        const available = catalog.some(item => item.code === choice.code);
        return <View key={choice.code} style={[styles.row,record&&styles.recordedRow]}>
          <Ionicons name={record ? "checkmark-circle" : "add-circle-outline"} color={record ? "#14919B" : "#80938F"} size={22} />
          <View style={{flex:1,gap:5}}><Text style={styles.name}>{translate(choice.label)}</Text>
            <Text style={[styles.badge,record&&styles.recordedBadge]}>{translate(record ? (record.isDiagnosed ? "conditionsUi.recorded" : "conditionsUi.unconfirmed") : "conditionsUi.notRecorded")}</Text>
            {record?.diagnosisDate && <Text style={styles.hint}>{isoToDdmmyyyy(record.diagnosisDate)}</Text>}
          </View>
          <View style={styles.actions}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={translate(record ? "conditionsUi.editLabel" : "conditionsUi.addLabel",{condition:translate(choice.label)})}
              disabled={busy||loading||!available} style={[styles.actionButton,(!available||busy)&&styles.disabled]} onPress={() => edit(choice.code,record)}>
              <Text style={styles.actionText}>{translate(record ? "conditionsUi.edit" : "conditionsUi.add")}</Text></TouchableOpacity>
            {record && <TouchableOpacity accessibilityRole="button" accessibilityLabel={translate("conditionsUi.removeLabel",{condition:translate(choice.label)})}
              disabled={busy||loading} style={styles.removeButton} onPress={() => setRemoving(record)}><Ionicons name="trash-outline" size={18} color="#B54747" /></TouchableOpacity>}
            {!available && <Text style={styles.hint}>{translate("health.conditionUnavailable")}</Text>}
          </View>
        </View>;
      })}
      {legacy.length>0 && <View style={styles.legacy}><Text style={styles.title}>{translate("conditionsUi.legacyTitle")}</Text>
        <Text style={styles.hint}>{translate("conditionsUi.legacyHint")}</Text>
        {legacy.map(record => <View key={record.id} style={styles.row}><Text style={[styles.name,{flex:1}]}>{record.diseaseName}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={translate("conditionsUi.removeLabel",{condition:record.diseaseName})}
            disabled={busy||loading} style={styles.removeButton} onPress={() => setRemoving(record)}><Ionicons name="trash-outline" size={18} color="#B54747" /></TouchableOpacity></View>)}
      </View>}
      {editing && <View style={styles.form}><Text style={styles.title}>{translate(editing.record ? "conditionsUi.editLabel" : "conditionsUi.addLabel",{condition:translate(SUPPORTED_CONDITIONS.find(choice=>choice.code===editing.code)!.label)})}</Text>
        {!editing.record && <Text style={styles.hint}>{translate("conditionsUi.diagnosedHint")}</Text>}
        <DateInput label={translate("conditionsUi.diagnosisDate")} value={date} onChangeText={setDate} invalid={!isValidOrEmptyDate(date)} />
        <View style={styles.formActions}><TouchableOpacity accessibilityRole="button" onPress={() => setEditing(null)} disabled={busy} style={styles.actionButton}><Text>{translate("common.cancel")}</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={save} disabled={busy||!isValidOrEmptyDate(date)} style={[styles.saveButton,(busy||!isValidOrEmptyDate(date))&&styles.disabled]}>
            {busy ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>{translate("conditionsUi.save")}</Text>}</TouchableOpacity></View>
      </View>}
    </>}
    <Modal visible={removing!==null} transparent animationType="fade" onRequestClose={() => {if(!busy)setRemoving(null);}}>
      <LocalizedView testID="condition-dialog-layout" style={styles.backdrop}><View style={styles.dialog} accessibilityViewIsModal><Text style={styles.title}>{translate("conditionsUi.removeTitle")}</Text>
        <Text style={styles.hint}>{translate("conditionsUi.removePrompt",{condition:removing ? labelFor(removing) : ""})}</Text>
        <View style={styles.formActions}><TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => setRemoving(null)} style={styles.actionButton}><Text>{translate("common.cancel")}</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={remove} style={styles.removeConfirm}>{busy ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>{translate("conditionsUi.confirmRemove")}</Text>}</TouchableOpacity></View>
      </View></LocalizedView>
    </Modal>
  </View>;
}

const styles=StyleSheet.create({
  card:{backgroundColor:"white",borderRadius:22,padding:18,gap:16,marginTop:22},
  heading:{flexDirection:"row",alignItems:"center",gap:10},icon:{minWidth:40,minHeight:40,alignItems:"center",justifyContent:"center",borderRadius:13,backgroundColor:"#E3F7F1"},
  title:{fontSize:15,fontWeight:"700",color:"#1A1A1A"},hint:{fontSize:12,color:"#6B7280",lineHeight:20},
  row:{flexDirection:"row",alignItems:"center",gap:10,padding:12,borderWidth:1,borderColor:"#E4E7E7",borderRadius:15},
  recordedRow:{borderColor:"#B9DED2",backgroundColor:"#F2FAF7"},name:{fontSize:13,fontWeight:"600",color:"#1A1A1A",lineHeight:21},
  badge:{fontSize:11,color:"#6B7280"},recordedBadge:{color:"#0F7A62",fontWeight:"600"},
  actions:{alignItems:"flex-end",gap:6,maxWidth:110},actionButton:{paddingVertical:10,paddingHorizontal:12,borderRadius:11,backgroundColor:"#F0F7F5"},actionText:{color:"#0F7A82",fontSize:12,fontWeight:"600"},
  removeButton:{padding:10,minWidth:40,alignItems:"center"},disabled:{opacity:0.4},legacy:{gap:10,padding:12,borderRadius:15,backgroundColor:"#FFF8EB"},
  form:{padding:14,borderRadius:16,backgroundColor:"#F5F8F7",gap:8},formActions:{flexDirection:"row",justifyContent:"flex-end",gap:12,marginTop:14},
  saveButton:{paddingHorizontal:18,paddingVertical:12,borderRadius:12,backgroundColor:"#14919B"},saveText:{color:"white",fontSize:13,fontWeight:"600"},
  backdrop:{flex:1,backgroundColor:"rgba(0,0,0,0.45)",alignItems:"center",justifyContent:"center",padding:24},dialog:{backgroundColor:"white",width:"100%",maxWidth:380,borderRadius:22,padding:22,gap:14},
  removeConfirm:{paddingHorizontal:18,paddingVertical:12,borderRadius:12,backgroundColor:"#B54747"},
});
