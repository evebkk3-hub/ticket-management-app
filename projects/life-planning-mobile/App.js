import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text as NativeText, TextInput as NativeInput, View, useWindowDimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NotoSansThai_400Regular, NotoSansThai_600SemiBold, NotoSansThai_700Bold, useFonts } from "@expo-google-fonts/noto-sans-thai";
import { calculateLifePlan } from "./src/api";

const BLUE = "#1769aa";
const LIGHT = "#eef6fc";
const YELLOW = "#fff2cc";
const initialPlan = {
  product: "UWB", currentAge: 30, coverageAge: 99, payEndAge: 59,
  retirementEnabled: true, retirementStartAge: 70, retirementEndAge: 99,
  retirementAmount: 10000, retirementFrequency: "monthly", riderAnnualPremium: 0,
  segments: [
    { startAge: 30, endAge: 39, regularPremium: 50000, topUpPremium: 10000 },
    { startAge: 40, endAge: 49, regularPremium: 40000, topUpPremium: 0 },
    { startAge: 50, endAge: 59, regularPremium: 100000, topUpPremium: 0 }
  ]
};

const Text = ({ style, ...props }) => <NativeText {...props} style={[styles.text, style]} />;
const Input = ({ value, onChange, style, ...props }) => <NativeInput value={String(value)} onChangeText={onChange} {...props} style={[styles.input, style]} />;
const money = (value) => `${Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })} บาท`;

export default function App() {
  const [fontsLoaded] = useFonts({ NotoSansThai_400Regular, NotoSansThai_600SemiBold, NotoSansThai_700Bold });
  const [plan, setPlan] = useState(initialPlan);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const { width } = useWindowDimensions();
  const isTablet = width >= 900;

  useEffect(() => { AsyncStorage.getItem("lifePlanDraft").then((raw) => raw && setPlan(JSON.parse(raw))).catch(() => {}); }, []);
  const coverageYears = Math.max(0, plan.coverageAge - plan.currentAge + 1);
  const payYears = Math.max(0, plan.payEndAge - plan.currentAge + 1);
  const firstYearPremium = useMemo(() => {
    const row = plan.segments.find((item) => plan.currentAge >= item.startAge && plan.currentAge <= item.endAge);
    return (row?.regularPremium || 0) + (row?.topUpPremium || 0);
  }, [plan]);

  if (!fontsLoaded) return <SafeAreaView style={styles.loading}><NativeText>กำลังเตรียม Life Planning...</NativeText></SafeAreaView>;
  const setNumber = (key, value) => setPlan((old) => ({ ...old, [key]: Number(value.replace(/[^0-9.]/g, "")) || 0 }));
  const updateSegment = (index, key, value) => setPlan((old) => ({ ...old, segments: old.segments.map((row, i) => i === index ? { ...row, [key]: Number(value.replace(/[^0-9.]/g, "")) || 0 } : row) }));
  const regenerate = () => {
    const rows = []; let age = plan.currentAge;
    while (age <= plan.payEndAge) { const endAge = Math.min(age + 9, plan.payEndAge); rows.push({ startAge: age, endAge, regularPremium: 0, topUpPremium: 0 }); age = endAge + 1; }
    setPlan((old) => ({ ...old, segments: rows })); setResult(null);
  };
  const saveDraft = async () => { await AsyncStorage.setItem("lifePlanDraft", JSON.stringify(plan)); Alert.alert("บันทึกแล้ว", "บันทึกร่างไว้บน iPad เครื่องนี้แล้ว"); };
  const calculate = async () => {
    setBusy(true); try { setResult(await calculateLifePlan(plan)); } catch (error) { Alert.alert("เชื่อมต่อไม่ได้", `${error.message}\nตรวจ EXPO_PUBLIC_API_URL และ Java server`); } finally { setBusy(false); }
  };

  return <SafeAreaView style={styles.app}><StatusBar style="light" />
    <View style={styles.header}><View><Text style={styles.title}>Life Planning</Text><Text style={styles.subtitle}>Self Design Tool · iPad 11-inch</Text></View><View style={styles.headerActions}><Button label="บันทึกร่าง" secondary onPress={saveDraft} /><Button label={busy ? "กำลังคำนวณ..." : "คำนวณแผน"} onPress={calculate} disabled={busy} /></View></View>
    <View style={[styles.shell, !isTablet && styles.shellPhone]}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Card title="1. ข้อมูลผลิตภัณฑ์และระยะเวลา">
          <View style={styles.formGrid}>
            <Field label="ผลิตภัณฑ์"><Input value={plan.product} onChange={(product) => setPlan((old) => ({ ...old, product }))} /></Field>
            <Field label="อายุปัจจุบัน"><Input keyboardType="number-pad" value={plan.currentAge} onChange={(v) => setNumber("currentAge", v)} /></Field>
            <Field label="คุ้มครองถึงอายุ"><Input keyboardType="number-pad" value={plan.coverageAge} onChange={(v) => setNumber("coverageAge", v)} /></Field>
            <Field label="ชำระเบี้ยถึงอายุ"><Input keyboardType="number-pad" value={plan.payEndAge} onChange={(v) => setNumber("payEndAge", v)} /></Field>
            <Metric label="ระยะเวลาคุ้มครอง" value={`${coverageYears} ปี`} /><Metric label="ระยะเวลาชำระเบี้ย" value={`${payYears} ปี`} />
          </View>
        </Card>
        <Card title="2. กำหนดเบี้ยประกันภัย" action={<Button label="สร้างช่วงอายุใหม่" small secondary onPress={regenerate} />}>
          <View style={styles.tableHeader}><Text style={styles.cellAge}>อายุเริ่ม</Text><Text style={styles.cellAge}>อายุสิ้นสุด</Text><Text style={styles.cellMoney}>RP/ปี</Text><Text style={styles.cellMoney}>Top-up/ปี</Text></View>
          {plan.segments.map((row, index) => <View key={index} style={styles.tableRow}>
            <Input style={styles.cellAge} keyboardType="number-pad" value={row.startAge} onChange={(v) => updateSegment(index, "startAge", v)} />
            <Input style={styles.cellAge} keyboardType="number-pad" value={row.endAge} onChange={(v) => updateSegment(index, "endAge", v)} />
            <Input style={styles.cellMoney} keyboardType="number-pad" value={row.regularPremium} onChange={(v) => updateSegment(index, "regularPremium", v)} />
            <Input style={styles.cellMoney} keyboardType="number-pad" value={row.topUpPremium} onChange={(v) => updateSegment(index, "topUpPremium", v)} />
          </View>)}
        </Card>
        <Card title="3. เป้าหมายเกษียณและสัญญาเพิ่มเติม">
          <View style={styles.switchRow}><Text style={styles.label}>วางแผนรับเงินเกษียณ</Text><Switch value={plan.retirementEnabled} onValueChange={(retirementEnabled) => setPlan((old) => ({ ...old, retirementEnabled }))} trackColor={{ true: BLUE }} /></View>
          <View style={styles.formGrid}>
            <Field label="เริ่มรับเงินอายุ"><Input editable={plan.retirementEnabled} keyboardType="number-pad" value={plan.retirementStartAge} onChange={(v) => setNumber("retirementStartAge", v)} /></Field>
            <Field label="รับเงินถึงอายุ"><Input editable={plan.retirementEnabled} keyboardType="number-pad" value={plan.retirementEndAge} onChange={(v) => setNumber("retirementEndAge", v)} /></Field>
            <Field label="เงินเกษียณต่อเดือน"><Input editable={plan.retirementEnabled} keyboardType="number-pad" value={plan.retirementAmount} onChange={(v) => setNumber("retirementAmount", v)} /></Field>
            <Field label="เบี้ย Rider ต่อปี"><Input keyboardType="number-pad" value={plan.riderAnnualPremium} onChange={(v) => setNumber("riderAnnualPremium", v)} /></Field>
          </View>
        </Card>
        {result?.errors?.length ? <View style={styles.errorBox}>{result.errors.map((error) => <Text key={error} style={styles.errorText}>• {error}</Text>)}</View> : null}
      </ScrollView>
      <View style={[styles.summary, !isTablet && styles.summaryPhone]}><Text style={styles.summaryTitle}>สรุปแผน</Text>
        <SummaryRow label="ผลิตภัณฑ์" value={plan.product} /><SummaryRow label="เบี้ยปีแรก" value={money(firstYearPremium)} /><SummaryRow label="จำนวนช่วงเบี้ย" value={`${plan.segments.length} ช่วง`} />
        <View style={styles.divider} />
        <SummaryRow label="สถานะ" value={result ? (result.valid ? "คำนวณแล้ว" : "ต้องแก้ไข") : "รอคำนวณ"} highlight />
        <SummaryRow label="เบี้ยรวม" value={result?.valid ? money(result.totalPremium) : "-"} /><SummaryRow label="เงินเกษียณรวม" value={result?.valid ? money(result.retirementPaid) : "-"} /><SummaryRow label="Account Value สิ้นสุด" value={result?.valid ? money(result.finalAccountValue) : "-"} /><SummaryRow label="Death Benefit" value={result?.valid ? money(result.deathBenefit) : "-"} />
      </View>
    </View>
  </SafeAreaView>;
}

function Card({ title, action, children }) { return <View style={styles.card}><View style={styles.cardHeader}><Text style={styles.cardTitle}>{title}</Text>{action}</View><View style={styles.cardBody}>{children}</View></View>; }
function Field({ label, children }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text>{children}</View>; }
function Metric({ label, value }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={styles.metric}><Text style={styles.metricText}>{value}</Text></View></View>; }
function Button({ label, onPress, secondary, small, disabled }) { return <Pressable disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.buttonSecondary, small && styles.buttonSmall, disabled && styles.disabled]}><Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{label}</Text></Pressable>; }
function SummaryRow({ label, value, highlight }) { return <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{label}</Text><Text style={[styles.summaryValue, highlight && styles.highlight]}>{value}</Text></View>; }

const styles = StyleSheet.create({
  text:{fontFamily:"NotoSansThai_400Regular",color:"#25364a"},app:{flex:1,backgroundColor:"#f2f5f8"},loading:{flex:1,alignItems:"center",justifyContent:"center"},header:{height:86,backgroundColor:BLUE,paddingHorizontal:28,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},title:{fontFamily:"NotoSansThai_700Bold",fontSize:25,color:"white"},subtitle:{color:"#dceeff",fontSize:12},headerActions:{flexDirection:"row",gap:10},shell:{flex:1,flexDirection:"row"},shellPhone:{flexDirection:"column"},content:{flex:1},contentInner:{padding:20,gap:16},card:{backgroundColor:"white",borderRadius:12,borderWidth:1,borderColor:"#c8d9e8",overflow:"hidden"},cardHeader:{minHeight:54,backgroundColor:LIGHT,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},cardTitle:{fontFamily:"NotoSansThai_700Bold",fontSize:16,color:BLUE},cardBody:{padding:18},formGrid:{flexDirection:"row",flexWrap:"wrap",gap:14},field:{width:"31%",minWidth:180,gap:6},label:{fontFamily:"NotoSansThai_600SemiBold",fontSize:12,color:"#52677d"},input:{height:44,borderWidth:1,borderColor:"#aabdd0",borderRadius:8,paddingHorizontal:11,backgroundColor:YELLOW,fontFamily:"NotoSansThai_400Regular",fontSize:15,color:"#213247"},metric:{height:44,borderRadius:8,backgroundColor:"#e6e9ed",justifyContent:"center",paddingHorizontal:11},metricText:{fontFamily:"NotoSansThai_600SemiBold"},switchRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:14},tableHeader:{flexDirection:"row",gap:8,marginBottom:7},tableRow:{flexDirection:"row",gap:8,marginBottom:8},cellAge:{flex:0.65},cellMoney:{flex:1},button:{backgroundColor:"#f05a28",borderRadius:8,paddingHorizontal:18,height:42,alignItems:"center",justifyContent:"center"},buttonSecondary:{backgroundColor:"white",borderWidth:1,borderColor:"#8eb8d8"},buttonSmall:{height:34,paddingHorizontal:12},buttonText:{fontFamily:"NotoSansThai_700Bold",color:"white",fontSize:13},buttonSecondaryText:{color:BLUE},disabled:{opacity:.55},summary:{width:340,backgroundColor:"white",borderLeftWidth:1,borderLeftColor:"#ccd9e5",padding:22},summaryPhone:{width:"100%",borderLeftWidth:0,borderTopWidth:1,borderTopColor:"#ccd9e5"},summaryTitle:{fontFamily:"NotoSansThai_700Bold",fontSize:19,color:BLUE,marginBottom:14},summaryRow:{flexDirection:"row",justifyContent:"space-between",gap:12,paddingVertical:10,borderBottomWidth:1,borderBottomColor:"#edf1f5"},summaryLabel:{color:"#6a7888",fontSize:12,flex:1},summaryValue:{fontFamily:"NotoSansThai_600SemiBold",textAlign:"right",flex:1.2},highlight:{color:"#14804a"},divider:{height:12},errorBox:{backgroundColor:"#fff0f0",borderWidth:1,borderColor:"#ffcaca",borderRadius:10,padding:14},errorText:{color:"#b42318",marginBottom:4}
});
