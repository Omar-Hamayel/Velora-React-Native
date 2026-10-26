import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, TouchableOpacity, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "./LocalizedText";
import ErrorBanner from "./ErrorBanner";
import { getRecommendations, getGenerationStatus, retryGeneration, updateRecommendationFeedback, ApiError, type RecommendationRecord, type GenerationState } from "../api/authApi";
import { translate, recommendationText, localizedReasons } from "../localization/core";

export default function RecommendationList() {
  useTranslation();
  const [items, setItems] = useState<RecommendationRecord[]>([]);
  const [status, setStatus] = useState<GenerationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const load = async () => {
    setLoading(true); setError(null);
    try { const [rows, state] = await Promise.all([getRecommendations(), getGenerationStatus()]); setItems(rows); setStatus(state); }
    catch (e) { setError(e instanceof ApiError ? e.message : translate("errors.server")); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (status?.status !== "Pending") return;
    // Bounded reads only. Refresh never generates; retry is an explicit user action.
    let attempts = 0;
    const timer = setInterval(() => { if (++attempts <= 5) void load(); else clearInterval(timer); }, 4000);
    return () => clearInterval(timer);
  }, [status?.status]);
  const feedback = async (item: RecommendationRecord, value: RecommendationRecord["feedback"], completed: boolean) => {
    if (saving !== null) return;
    setSaving(item.id); setError(null);
    try { const updated = await updateRecommendationFeedback(item.id, value, completed); setItems(rows => rows.map(row => row.id === updated.id ? updated : row)); }
    catch (e) { setError(e instanceof ApiError ? e.message : translate("errors.server")); }
    finally { setSaving(null); }
  };
  const retry = async () => { setLoading(true); try { setStatus(await retryGeneration()); await load(); } catch (e) { setError(e instanceof ApiError ? e.message : translate("errors.server")); setLoading(false); } };
  return <View style={styles.list}>
    <Text style={styles.heading}>{translate("home.todayRecommendations")}</Text>
    <ErrorBanner message={error} onDismiss={() => setError(null)} />
    {loading && <View accessibilityRole="progressbar"><ActivityIndicator color="#14919B" /><Text>{translate("common.loading")}</Text></View>}
    <TouchableOpacity accessibilityRole="button" onPress={load} disabled={loading} style={styles.button}><Text>{translate("common.refresh")}</Text></TouchableOpacity>
    {status?.status === "Pending" && <Text>{translate("recommendationUi.pending")}</Text>}
    {status && status.status === "Failed" && <View><Text>{translate("recommendationUi.unavailable")}</Text><TouchableOpacity accessibilityRole="button" onPress={retry} disabled={loading} style={styles.button}><Text>{translate("common.retry")}</Text></TouchableOpacity></View>}
    {!loading && items.length === 0 && <Text>{translate("recommendationUi.empty")}</Text>}
    {items.map(item => {
      const explanation = localizedReasons(item);
      return <View key={item.id} style={styles.card}>
        <Text style={styles.category}>{translate(`categories.${item.category}`, {defaultValue: item.category ?? ""})}</Text>
        <Text style={styles.title}>{recommendationText(item, "title")}</Text>
        <Text>{recommendationText(item, "description")}</Text>
        {item.safetyStatus === "caution" && <Text style={styles.caution}>{translate("recommendationUi.caution")}</Text>}
        {explanation.known.length > 0 && <Text style={styles.reasons}>{explanation.known.join(" ")}</Text>}
        {explanation.fallback && <View><Text>{translate("recommendationUi.englishFallback")}</Text><Text style={{writingDirection:"ltr",textAlign:"left"}}>{explanation.fallback}</Text></View>}
        <View style={styles.actions}>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{selected:item.feedback === "liked"}} disabled={saving !== null} style={[styles.button,item.feedback === "liked" && styles.selected]} onPress={() => feedback(item, item.feedback === "liked" ? null : "liked", item.isCompleted)}><Text>{translate("feedback.like")}</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{selected:item.feedback === "disliked"}} disabled={saving !== null} style={[styles.button,item.feedback === "disliked" && styles.selected]} onPress={() => feedback(item, item.feedback === "disliked" ? null : "disliked", item.isCompleted)}><Text>{translate("feedback.dislike")}</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{selected:item.isCompleted}} disabled={saving !== null} style={[styles.button,item.isCompleted && styles.selected]} onPress={() => feedback(item, item.feedback, !item.isCompleted)}><Text>{translate(item.isCompleted ? "feedback.completed" : "feedback.complete")}</Text></TouchableOpacity>
        </View>
      </View>;
    })}
  </View>;
}
const styles = StyleSheet.create({list:{gap:12},heading:{fontSize:19,fontWeight:"700",color:"#1A1A1A"},card:{padding:18,gap:10,backgroundColor:"#FFFFFF",borderRadius:20},category:{color:"#14919B",fontWeight:"600"},title:{fontSize:17,fontWeight:"700"},reasons:{color:"#6B7280",lineHeight:22},caution:{color:"#805500"},actions:{flexDirection:"row",flexWrap:"wrap",gap:8},button:{padding:10,borderRadius:10,borderWidth:1,borderColor:"#E4E7E7",alignSelf:"flex-start"},selected:{backgroundColor:"#E3F7F1",borderColor:"#14919B"}});
