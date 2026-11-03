import { translate, normalizeDigits, i18n } from "../localization/core";
import React, { useState } from "react";
import { Keyboard, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, TextInput } from "./LocalizedText";
import LocalizedView from "./LocalizedView";
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
  const digits = normalizeDigits(text).replace(/\D/g, "").slice(0, 8);
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
  minimumDate,
  maximumDate,
  initialDate,
  errorMessage,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  invalid?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  initialDate?: Date;
  errorMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date());
  const [mode, setMode] = useState<"days" | "months" | "years">("days");
  const locale = i18n.language === "ar" ? "ar" : "en";
  const dateNumber = (date: Date) => date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const allowed = (date: Date) => (!minimumDate || dateNumber(date) >= dateNumber(minimumDate)) && (!maximumDate || dateNumber(date) <= dateNumber(maximumDate));
  const openCalendar = () => {
    Keyboard.dismiss();
    const iso = value && isValidOrEmptyDate(value) ? ddmmyyyyToIso(value) : undefined;
    let selected = iso ? new Date(Number(iso.slice(0,4)), Number(iso.slice(5,7))-1, Number(iso.slice(8,10)), 12) : initialDate ?? new Date();
    if (maximumDate && dateNumber(selected) > dateNumber(maximumDate)) selected = maximumDate;
    if (minimumDate && dateNumber(selected) < dateNumber(minimumDate)) selected = minimumDate;
    setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1, 12));
    setMode("days"); setOpen(true);
  };
  const year = month.getFullYear(), monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const dayCount = new Date(year, monthIndex + 1, 0).getDate();
  const yearStart = minimumDate?.getFullYear() ?? 1900;
  const yearEnd = maximumDate?.getFullYear() ?? Math.max(new Date().getFullYear() + 20, year);
  const monthAllowed = (targetYear: number, targetMonth: number) =>
    (!minimumDate || dateNumber(new Date(targetYear, targetMonth + 1, 0)) >= dateNumber(minimumDate)) &&
    (!maximumDate || dateNumber(new Date(targetYear, targetMonth, 1)) <= dateNumber(maximumDate));
  const selectedDate = (day: number) => `${String(day).padStart(2,"0")}/${String(monthIndex+1).padStart(2,"0")}/${year}`;
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, invalid && styles.inputRowError]}>
        <TextInput
          accessibilityLabel={label}
          style={styles.input}
          placeholder={translate("screens.DateInput.ddMmYyyy")}
          placeholderTextColor={COLORS.grayLight}
          keyboardType="number-pad"
          maxLength={10}
          value={value}
          onChangeText={(text) => onChangeText(formatDateDigits(text))}
        />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={translate("dateUi.open", {field:label})}
          onPress={openCalendar} style={styles.calendarButton} hitSlop={8}>
          <Ionicons name="calendar-outline" size={21} color="#14919B" />
        </TouchableOpacity>
      </View>
      {invalid && <Text style={styles.errorText}>{errorMessage ?? translate("screens.DateInput.enterAValidDateDdMmYyyy")}</Text>}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <LocalizedView style={styles.backdrop}><View testID="date-calendar" style={styles.calendar} accessibilityViewIsModal>
          <Text style={styles.calendarTitle}>{label}</Text>
          <View style={styles.calendarHeader}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={translate("dateUi.previousMonth")}
              disabled={!monthAllowed(year,monthIndex-1)} style={[styles.calendarButton,!monthAllowed(year,monthIndex-1)&&styles.disabled]}
              onPress={() => {setMonth(new Date(year,monthIndex-1,1,12));setMode("days");}}>
              <Ionicons name={locale === "ar" ? "chevron-forward" : "chevron-back"} size={22} color="#14919B" />
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={translate("dateUi.chooseMonth")}
              onPress={() => setMode("months")} style={styles.headingButton}>
              <Text style={styles.monthHeading}>{new Intl.DateTimeFormat(locale,{month:"long"}).format(month)}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={translate("dateUi.chooseYear")}
              onPress={() => setMode("years")} style={styles.headingButton}><Text style={styles.monthHeading}>{year}</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={translate("dateUi.nextMonth")}
              disabled={!monthAllowed(year,monthIndex+1)} style={[styles.calendarButton,!monthAllowed(year,monthIndex+1)&&styles.disabled]}
              onPress={() => {setMonth(new Date(year,monthIndex+1,1,12));setMode("days");}}>
              <Ionicons name={locale === "ar" ? "chevron-back" : "chevron-forward"} size={22} color="#14919B" />
            </TouchableOpacity>
          </View>
          {mode === "years" ? <ScrollView style={styles.choicesScroll}><View style={styles.choicesGrid}>
            {Array.from({length:yearEnd-yearStart+1},(_,index)=>yearEnd-index).map(option =>
              <TouchableOpacity accessibilityRole="button" key={option} accessibilityLabel={String(option)}
                style={[styles.choice,option===year&&styles.chosen]} onPress={() => {setMonth(new Date(option,monthIndex,1,12));setMode("months");}}>
                <Text>{option}</Text></TouchableOpacity>)}
          </View></ScrollView> : mode === "months" ? <View style={styles.choicesGrid}>
            {Array.from({length:12},(_,index)=>index).map(option => <TouchableOpacity accessibilityRole="button" key={option}
              disabled={!monthAllowed(year,option)} style={[styles.choice,!monthAllowed(year,option)&&styles.disabled,option===monthIndex&&styles.chosen]}
              onPress={() => {setMonth(new Date(year,option,1,12));setMode("days");}}>
              <Text>{new Intl.DateTimeFormat(locale,{month:"short"}).format(new Date(year,option,1))}</Text></TouchableOpacity>)}
          </View> : <View style={styles.daysGrid}>
            {Array.from({length:7},(_,index)=>index).map(index => <View key={`week-${index}`} style={styles.day}>
              <Text style={styles.weekday}>{new Intl.DateTimeFormat(locale,{weekday:"short"}).format(new Date(2024,0,7+index))}</Text></View>)}
            {Array.from({length:firstDay},(_,index)=><View key={`empty-${index}`} style={styles.day} />)}
            {Array.from({length:dayCount},(_,index)=>index+1).map(day => {
              const date = new Date(year,monthIndex,day,12), disabled = !allowed(date);
              return <TouchableOpacity key={day} accessibilityRole="button" accessibilityLabel={`${translate("dateUi.chooseDay")} ${ddmmyyyyToIso(selectedDate(day))}`}
                accessibilityState={{selected:value===selectedDate(day),disabled}} disabled={disabled}
                style={[styles.day,value===selectedDate(day)&&styles.chosen,disabled&&styles.disabled]}
                onPress={() => {onChangeText(selectedDate(day));setOpen(false);}}><Text>{day}</Text></TouchableOpacity>;
            })}
          </View>}
          <TouchableOpacity accessibilityRole="button" onPress={() => setOpen(false)} style={styles.closeButton}>
            <Text style={styles.monthHeading}>{translate("common.cancel")}</Text>
          </TouchableOpacity>
        </View></LocalizedView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  calendarButton: {minWidth:40,minHeight:40,alignItems:"center",justifyContent:"center"},
  backdrop: {flex:1,backgroundColor:"rgba(0,0,0,0.45)",alignItems:"center",justifyContent:"center",padding:20},
  calendar: {width:"100%",maxWidth:380,backgroundColor:"white",borderRadius:24,padding:20,gap:12},
  calendarTitle: {fontSize:16,fontWeight:"700",color:COLORS.black},
  calendarHeader: {flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:2},
  headingButton: {paddingVertical:10,paddingHorizontal:4},
  monthHeading: {fontSize:14,fontWeight:"700",color:"#14919B"},
  daysGrid: {flexDirection:"row",flexWrap:"wrap"},
  day: {width:"14.2857%",height:42,alignItems:"center",justifyContent:"center",borderRadius:12},
  weekday: {fontSize:11,color:COLORS.gray},
  choicesScroll: {maxHeight:280},
  choicesGrid: {flexDirection:"row",flexWrap:"wrap"},
  choice: {width:"33.3333%",minHeight:44,alignItems:"center",justifyContent:"center",borderRadius:12},
  chosen: {backgroundColor:"#DDF3ED"},
  disabled: {opacity:0.3},
  closeButton: {alignSelf:"flex-end",paddingHorizontal:14,paddingVertical:12},
  wrap: {
    width: "100%",
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
