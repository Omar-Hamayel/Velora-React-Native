import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, View, TouchableOpacity, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "./LocalizedText";
import ErrorBanner from "./ErrorBanner";
import { getTodayPlan, getRecommendationHistory, ensureDailyPlan, recommendationTimeZone, retryGeneration, updateRecommendationFeedback, ApiError,
  type RecommendationRecord, type RecommendationPlan } from "../api/authApi";
import { translate, recommendationText, localizedReasons } from "../localization/core";
import { Ionicons } from "@expo/vector-icons";
import LocalizedView from "./LocalizedView";

type Tab = "today" | "completed" | "history";
function timestamp(value?: string | null) {
  if (!value) return "";
  const date = new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

export default function RecommendationList() {
  useTranslation();
  const [plan, setPlan] = useState<RecommendationPlan | null>(null);
  const [tab, setTab] = useState<Tab>("today");
  const [history, setHistory] = useState<RecommendationRecord[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState(0);
  const [details, setDetails] = useState(false);
  const [expanded, setExpanded] = useState<number[]>([]);
  const mounted = useRef(true), version = useRef(0);
  const busy = useRef(false);
  const load = useCallback(async () => {
    const request = ++version.current;
    setLoading(true); setError(null);
    try {
      const result = await getTodayPlan();
      if (mounted.current && request === version.current) { setPlan(result); setRetryAfter(result.retryAfterSeconds); }
      return result;
    } catch (e) {
      if (mounted.current && request === version.current) setError(e instanceof ApiError ? e.message : translate("errors.server"));
      return null;
    } finally { if (mounted.current && request === version.current) setLoading(false); }
  }, []);
  const openPlan = useCallback(async () => {
    const current = await load();
    // Open/day-rollover is an explicit idempotent command. Refresh remains read-only.
    if (current?.isProfileComplete && ((current.isStale && !current.status) || current.timeZoneId !== recommendationTimeZone())) {
      try { await ensureDailyPlan(); await load(); }
      catch (e) { if (mounted.current) setError(e instanceof ApiError ? e.message : translate("errors.server")); }
    }
  }, [load]);
  useEffect(() => {
    mounted.current = true; void openPlan();
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void openPlan(); });
    return () => { mounted.current = false; version.current++; subscription.remove(); };
  }, [openPlan]);
  useEffect(() => {
    if (!plan?.isStale || !plan.isProfileComplete || plan.status === "Failed") return;
    let attempts = 0;
    const timer = setInterval(() => { if (++attempts <= 15) { if (!busy.current) void load(); } else clearInterval(timer); }, 2000);
    return () => clearInterval(timer);
  }, [plan?.isStale, plan?.isProfileComplete, plan?.status === "Failed", load]);
  useEffect(() => {
    if (!plan?.nextRefreshAt) return;
    const delay = new Date(plan.nextRefreshAt).getTime() - Date.now() + 1000;
    if (!Number.isFinite(delay) || delay <= 0) return;
    const timer = setTimeout(() => void openPlan(), Math.min(delay, 2147483647));
    return () => clearTimeout(timer);
  }, [plan?.nextRefreshAt, openPlan]);
  useEffect(() => {
    if (!plan?.isProfileComplete || plan.timeZoneId === recommendationTimeZone()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      if (++attempts <= 3) void openPlan(); else clearInterval(timer);
    }, 4000);
    return () => clearInterval(timer);
  }, [plan?.timeZoneId, plan?.isProfileComplete, openPlan]);
  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = setTimeout(() => setRetryAfter(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [retryAfter]);
  const loadHistory = async (more = false) => {
    if (historyLoading) return;
    setHistoryLoading(true); setError(null);
    try {
      const rows = await getRecommendationHistory(more ? history.length : 0);
      if (mounted.current) { setHistory(existing => more ? [...existing, ...rows] : rows); setHasMore(rows.length === 50); }
    } catch (e) { if (mounted.current) setError(e instanceof ApiError ? e.message : translate("errors.server")); }
    finally { if (mounted.current) setHistoryLoading(false); }
  };
  const feedback = async (item: RecommendationRecord, value: RecommendationRecord["feedback"], completed: boolean) => {
    if (busy.current) return;
    busy.current = true; version.current++; setSaving(item.id); setError(null); setNotice(null);
    try {
      const updated = await updateRecommendationFeedback(item.id, value, completed);
      if (mounted.current) {
        setHistory(rows => rows.map(row => row.id === updated.id ? updated : row));
        if (value === "disliked") setNotice(translate("recommendationUi.hiddenNotice"));
      }
      await load(); // Server remains the authority for completion across batches and for stale plans.
    } catch (e) { if (mounted.current) setError(e instanceof ApiError ? e.message : translate("errors.server")); }
    finally { busy.current = false; if (mounted.current) setSaving(null); }
  };
  const retry = async () => {
    if (busy.current || retryAfter > 0) return;
    busy.current = true; setLoading(true); setError(null);
    let failure: string | null = null;
    try { await retryGeneration(); }
    catch (e) { failure = e instanceof ApiError ? e.message : translate("errors.server"); }
    finally {
      busy.current = false;
      const result = await load();
      // A successful status read must not erase an unsuccessful retry request.
      // Failed plans have their own single, more specific status panel.
      if (mounted.current && failure && result?.status !== "Failed") setError(failure);
    }
  };
  const completed = Array.from(new Map([...(plan?.recommendations ?? []).filter(item => item.isCompleted), ...(plan?.completedToday ?? [])].map(item => [item.id, item])).values());
  const pending = plan?.isStale ? [] : (plan?.recommendations ?? []).filter(item => !item.isCompleted && item.feedback !== "disliked");
  const rows = tab === "history" ? history : tab === "completed" ? completed : pending;
  return <View testID="daily-recommendations" style={styles.list}>
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={styles.heading}>{translate("home.todayRecommendations")}</Text>
        {plan && <Text style={styles.meta}>{plan.planDate}</Text>}
      </View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={translate("common.refresh")} onPress={() => tab === "history" ? void loadHistory() : void load()} disabled={loading || historyLoading || saving !== null} style={styles.refresh}>
        {loading || historyLoading ? <ActivityIndicator color="#14919B" size="small" /> : <Ionicons name="refresh-outline" size={21} color="#14919B" />}
      </TouchableOpacity>
    </View>
    <ErrorBanner message={error} onDismiss={() => setError(null)} />
    <ErrorBanner message={notice} tone="success" onDismiss={() => setNotice(null)} />
    <View style={styles.tabs} accessibilityRole="tablist">
      {(["today", "completed", "history"] as Tab[]).map(key => <TouchableOpacity key={key} accessibilityRole="tab" accessibilityState={{selected: tab === key}} aria-selected={tab === key}
        onPress={() => { setTab(key); setError(null); if (key === "history") void loadHistory(); }} style={[styles.button, styles.tab, tab === key && styles.selected]}>
        <Text style={styles.tabLabel}>{translate(`recommendationUi.tab_${key}`)}{key === "today" ? ` (${pending.length})` : key === "completed" ? ` (${completed.length})` : ""}</Text>
      </TouchableOpacity>)}
    </View>
    {tab === "history" && <Text style={styles.meta}>{translate("recommendationUi.historyHint")}</Text>}
    {((loading && !plan) || historyLoading) && <View accessibilityRole="progressbar"><ActivityIndicator color="#14919B" /></View>}
    {tab === "today" && plan?.isStale && !error && <View testID="plan-state" style={styles.stateCard} accessibilityRole="status">
      <LocalizedView layoutDirection="ltr" style={styles.stateRow}>
        <View testID="plan-state-icon"><Ionicons name={!plan.isProfileComplete ? "person-outline" : plan.status === "Failed" ? "cloud-offline-outline" : "time-outline"} size={25} color="#14919B" /></View>
        <View style={styles.stateCopy}>
          <Text style={styles.title}>{translate(!plan.isProfileComplete ? "recommendationUi.incompleteTitle" : plan.status === "Failed" ? "recommendationUi.failedTitle" : "recommendationUi.pending")}</Text>
          <Text style={styles.bodyText}>{translate(!plan.isProfileComplete ? "recommendationUi.incomplete" : plan.status === "Failed" ? `recommendationUi.failures.${plan.failureCode ?? "generation_failed"}` : "recommendationUi.pendingBody", {defaultValue:translate("recommendationUi.unavailable")})}</Text>
        </View>
      </LocalizedView>
      {plan.isProfileComplete && plan.status === "Failed" && <TouchableOpacity accessibilityRole="button" accessibilityLabel={translate("common.retry")} onPress={retry} disabled={loading || retryAfter > 0 || saving !== null} style={[styles.button, styles.primary, (loading || retryAfter > 0) && styles.disabled]}>
        <Text style={styles.primaryLabel}>{retryAfter > 0 ? translate("recommendationUi.retryAfter", {seconds:retryAfter}) : translate("common.retry")}</Text>
      </TouchableOpacity>}
    </View>}
    {!loading && !historyLoading && !error && rows.length === 0 && (tab !== "today" || !plan?.isStale) && <Text>{translate(tab === "history" ? "recommendationUi.noHistory" : tab === "completed" ? "recommendationUi.noCompleted" : completed.length > 0 ? "recommendationUi.allDone" : "recommendationUi.empty")}</Text>}
    {!loading && !historyLoading && !error && rows.map(item => {
      const explanation = localizedReasons(item);
      return <View key={item.id} testID={`recommendation-${item.id}`} style={styles.card}>
        <Text style={styles.category}>{translate(`categories.${item.category}`, {defaultValue: item.category ?? ""})}</Text>
        <Text style={styles.title}>{recommendationText(item, "title")}</Text>
        <Text style={styles.bodyText}>{recommendationText(item, "description")}</Text>
        {item.recurrence === "weekly" && <Text style={styles.meta}>{translate("recommendationUi.weekly")}</Text>}
        {tab === "history" && <Text style={styles.meta}>{translate("recommendationUi.lastUpdated", {date: timestamp(item.generatedAt)})}</Text>}
        {item.isCompleted && <Text style={styles.meta}>{translate("feedback.completed")}{item.completedAt ? ` · ${timestamp(item.completedAt)}` : ""}</Text>}
        {item.safetyStatus === "caution" && <Text style={styles.caution}>{translate("recommendationUi.caution")}</Text>}
        {(explanation.known.length > 0 || explanation.fallback) && <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:expanded.includes(item.id)}} onPress={() => setExpanded(ids => ids.includes(item.id) ? ids.filter(id => id !== item.id) : [...ids,item.id])}><Text style={styles.detailLink}>{translate(expanded.includes(item.id) ? "recommendationUi.hideReasons" : "recommendationUi.showReasons")}</Text></TouchableOpacity>}
        {expanded.includes(item.id) && <View style={styles.list}>
          {explanation.known.length > 0 && <Text style={styles.reasons}>{explanation.known.join(" ")}</Text>}
          {explanation.fallback && <View><Text style={styles.meta}>{translate("recommendationUi.englishFallback")}</Text><Text contentDirection="ltr" style={styles.bodyText}>{explanation.fallback}</Text></View>}
        </View>}
        <View style={styles.actions}>
          {tab === "today" && <>
            <TouchableOpacity accessibilityRole="button" accessibilityState={{selected:item.feedback === "liked"}} disabled={saving !== null} style={[styles.button,item.feedback === "liked" && styles.selected]} onPress={() => void feedback(item,item.feedback === "liked" ? null : "liked",false)}><Text>{translate("feedback.like")}</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" disabled={saving !== null} style={styles.button} onPress={() => void feedback(item,"disliked",false)}><Text>{translate("feedback.dislike")}</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" disabled={saving !== null} style={styles.button} onPress={() => void feedback(item,item.feedback,true)}><Text>{translate("feedback.complete")}</Text></TouchableOpacity>
          </>}
          {tab === "completed" && <TouchableOpacity accessibilityRole="button" disabled={saving !== null} style={styles.button} onPress={() => void feedback(item,item.feedback,false)}><Text>{translate("recommendationUi.undo")}</Text></TouchableOpacity>}
          {tab === "history" && item.feedback === "disliked" && <TouchableOpacity accessibilityRole="button" disabled={saving !== null} style={styles.button} onPress={() => void feedback(item,null,item.isCompleted)}><Text>{translate("recommendationUi.undoDislike")}</Text></TouchableOpacity>}
        </View>
      </View>;
    })}
    {tab === "history" && hasMore && <TouchableOpacity accessibilityRole="button" disabled={historyLoading} style={styles.button} onPress={() => void loadHistory(true)}><Text>{translate("recommendationUi.more")}</Text></TouchableOpacity>}
    <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:details}} onPress={() => setDetails(value => !value)}><Text style={styles.detailLink}>{translate("recommendationUi.planDetails")}</Text></TouchableOpacity>
    {details && <View style={styles.details}>
      <Text style={styles.meta}>{translate("recommendationUi.refreshHint")}</Text>
      {plan?.generatedAt && <Text style={styles.meta}>{translate("recommendationUi.lastUpdated", {date:timestamp(plan.generatedAt)})}</Text>}
      {plan && <Text style={styles.meta}>{translate("recommendationUi.planDate", {date:plan.planDate,zone:plan.timeZoneId})}</Text>}
      {plan?.generationId && plan.status === "Failed" && <Text contentDirection="ltr" style={styles.meta}>{translate("recommendationUi.reference", {id:plan.generationId})}</Text>}
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  list:{gap:14}, heading:{fontSize:21,fontWeight:"700",color:"#1A1A1A"},
  header:{flexDirection:"row",alignItems:"center",gap:12},headerCopy:{flex:1,gap:4},
  refresh:{width:44,height:44,alignItems:"center",justifyContent:"center",borderRadius:14,backgroundColor:"#E3F7F1"},
  meta:{fontSize:12,color:"#6B7280",lineHeight:20},
  tabs:{flexDirection:"row",gap:6,padding:4,backgroundColor:"#EDF2F0",borderRadius:14},
  tabLabel:{fontSize:12,fontWeight:"600",lineHeight:20},
  tab:{flex:1,alignSelf:"stretch",paddingHorizontal:4,paddingVertical:8,borderColor:"transparent"},
  card:{padding:18,gap:10,backgroundColor:"#FFFFFF",borderRadius:20,borderWidth:1,borderColor:"#E4E7E7"},
  stateCard:{padding:18,gap:16,backgroundColor:"#FFFFFF",borderRadius:18,borderWidth:1,borderColor:"#E4E7E7"},
  stateRow:{flexDirection:"row",gap:12,alignItems:"flex-start"},stateCopy:{flex:1,gap:8},
  category:{color:"#14919B",fontWeight:"600",fontSize:12},title:{fontSize:16,fontWeight:"700",lineHeight:25},
  bodyText:{fontSize:14,color:"#4B5563",lineHeight:23},reasons:{fontSize:13,color:"#6B7280",lineHeight:23},caution:{color:"#805500",lineHeight:23},
  actions:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:4},
  button:{paddingVertical:11,paddingHorizontal:12,borderRadius:12,borderWidth:1,borderColor:"#E4E7E7",alignSelf:"flex-start"},
  selected:{backgroundColor:"#E3F7F1",borderColor:"#14919B"},primary:{backgroundColor:"#14919B",borderColor:"#14919B",alignSelf:"stretch"},primaryLabel:{color:"#FFFFFF",fontWeight:"600",fontSize:13},disabled:{opacity:0.5},
  detailLink:{fontSize:12,color:"#0F7A82",lineHeight:22},details:{gap:6,paddingHorizontal:4},
});
