import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  useWindowDimensions,
  View
} from "react-native";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import {
  NotoSansThai_400Regular,
  NotoSansThai_500Medium,
  NotoSansThai_600SemiBold,
  NotoSansThai_700Bold,
  useFonts
} from "@expo-google-fonts/noto-sans-thai";
import QRCode from "react-native-qrcode-svg";
import { captureRef } from "react-native-view-shot";
import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { bootstrapApplication } from "./src/services/bootstrap";
import { getPaymentDetails, listPaymentHistory } from "./src/repositories/paymentRepository";

const BLUE = "#008bd2";
const TEXT = "#3a3f44";
const MUTED = "#7b858d";
const SOFT_BLUE = "#e2f7ff";
const PAGE_BG = "#f2f4f5";
const DESIGN_WIDTH = 1194;
const DESIGN_HEIGHT = 834;
const FONT_FAMILY = "NotoSansThai_400Regular";
const Stack = createNativeStackNavigator();

function resolveThaiFont(style) {
  const flattened = StyleSheet.flatten(style) || {};
  const rawWeight = flattened.fontWeight;
  const numericWeight = rawWeight === "bold" ? 700 : Number(rawWeight || 400);
  if (numericWeight >= 700) return "NotoSansThai_700Bold";
  if (numericWeight >= 600) return "NotoSansThai_600SemiBold";
  if (numericWeight >= 500) return "NotoSansThai_500Medium";
  return FONT_FAMILY;
}

const Text = React.forwardRef(({ style, ...props }, ref) => (
  <NativeText ref={ref} {...props} style={[style, { fontFamily: resolveThaiFont(style), fontWeight: "normal" }]} />
));
Text.displayName = "Text";

const TextInput = React.forwardRef(({ style, ...props }, ref) => (
  <NativeTextInput ref={ref} {...props} style={[style, { fontFamily: resolveThaiFont(style), fontWeight: "normal" }]} />
));
TextInput.displayName = "TextInput";

const paymentRows = [
  ["male", "ธนาธิป รุ่งมี...", "082-345-6789", "1234567891", "01/12", "999,999,999", "13 ส.ค. 69", "wait", "รอชำระเบี้ย", "ครบกำหนด", true],
  ["male", "ธนาธิป รุ่งมี...", "082-345-6789", "1234567892", "02/03", "100,000", "14 ส.ค. 69", "wait", "รอชำระเบี้ย", "เหลืออีก 1 วัน", true],
  ["female", "วารุณี ศิริพ...", "082-345-6790", "1234567891", "02/04", "300,000", "15 ส.ค. 69", "wait", "รอชำระเบี้ย", "เหลืออีก 2 วัน", true],
  ["female", "พรชนย์ ใจ้...", "082-345-6791", "1234567891", "02/05", "500,000", "16 ส.ค. 69", "wait", "รอชำระเบี้ย", "เหลืออีก 3 วัน", true],
  ["male", "ธนาธิป รุ่งมี...", "082-345-6792", "1234567891", "02/06", "500,000", "17 ส.ค. 69", "wait", "รอชำระเบี้ย", "ไม่สามารถชำระผ่านแอปได้", false],
  ["female", "ณัชภา อิ่ม...", "082-345-6793", "1234567891", "02/07", "300,000", "18 ส.ค. 69", "auto", "รอทำชำระเบี้ยอัตโนมัติ", "พักชำระเพื่อไม่สำเร็จ", false],
  ["female", "จุฑามาศ ดำ...", "082-345-6794", "1234567891", "02/08", "20,000,000", "19 ส.ค. 69", "auto", "รอทำชำระเบี้ยอัตโนมัติ", "พักชำระเพื่อไม่สำเร็จ", false],
  ["female", "อิสรา สมทรั...", "082-345-6795", "1234567891", "02/09", "100,000", "20 ส.ค. 69", "auto", "รอทำชำระเบี้ยอัตโนมัติ", "", false],
  ["male", "จิรัญญา นรร...", "082-345-6796", "1234567891", "02/10", "500,000", "21 ส.ค. 69", "auto", "รอทำชำระเบี้ยอัตโนมัติ", "", false],
  ["female", "เพชร วงศ์สุว...", "082-345-6797", "1234567891", "02/11", "100,000", "22 ส.ค. 69", "auto", "รอทำชำระเบี้ยอัตโนมัติ", "", false]
];

const paymentHistoryRows = [
  ["male", "ธนาธิป รุ่งปัญญกิจพัฒน์", "082-345-6789", "1234567891", "9,999,999,999", "18 มิ.ย. 69", "pending", 1],
  ["male", "ธนาธิป รุ่งปัญญกิจพัฒน์", "-", "1234567892", "100,000", "17 มิ.ย. 69", "pending", 1],
  ["female", "จุฑามาศ อภิคุณมงคล", "082-345-6790", "1234567893", "300,000", "16 มิ.ย. 69", "pending", 1],
  ["female", "วารุณี ศิริทิพยากานต์", "082-345-6791", "1234567894", "500,000", "15 มิ.ย. 69", "pending", 1],
  ["female", "ณัชภา อิ่มเก่งวิศิรพร", "082-345-6792", "1234567895", "500,000", "14 มิ.ย. 69", "success", 1],
  ["male", "วรัญญู บรรณาการ", "082-345-6793", "1234567896", "300,000", "13 มิ.ย. 69", "success", 2, "UWB"],
  ["male", "พัชร วงศ์สุวรรณ", "082-345-6794", "1234567897", "20,000,000", "12 มิ.ย. 69", "success", 1],
  ["female", "สุทธิดา สุดประเสริฐ", "082-345-6795", "1234567898", "100,000", "11 มิ.ย. 69", "success", 1],
  ["female", "นภัสสร สวัสดีโพศาล", "082-345-6796", "1234567899", "500,000", "10 มิ.ย. 69", "success", 1],
  ["female", "วารุณี ศิริทิพยากานต์", "082-345-6797", "1234567810", "100,000", "9 ก.ค. 69", "success", 1]
];

const provinces = [
  {
    name: "กรุงเทพฯ",
    districtLabel: "เขต",
    subdistrictLabel: "แขวง",
    areas: [
      { name: "บางกะปิ", count: 40, subdistricts: ["ป้อมปราบ", "วัดเทพศิรินทร์", "คลองมหานาค", "บ้านบาตร"] },
      { name: "คลองเตย", count: 24, subdistricts: ["คลองเตย", "คลองตัน", "พระโขนง"] },
      { name: "พระนคร", count: 18, subdistricts: ["พระบรมมหาราชวัง", "วังบูรพาภิรมย์", "วัดราชบพิธ"] }
    ]
  },
  {
    name: "นครราชสีมา",
    districtLabel: "อำเภอ",
    subdistrictLabel: "ตำบล",
    areas: [
      { name: "เมืองนครราชสีมา", count: 40, subdistricts: ["ในเมือง", "โพธิ์กลาง", "หนองจะบก", "โคกสูง", "มะเริง", "หนองระเวียง", "ปรุใหญ่", "หมื่นไวย", "พลกรัง", "หนองไข่น้ำ", "หัวทะเล", "บ้านเกาะ", "บ้านใหม่", "พุดซา"] },
      { name: "ปากช่อง", count: 32, subdistricts: ["ปากช่อง", "กลางดง", "จันทึก", "วังกะทะ", "หมูสี"] },
      { name: "สีคิ้ว", count: 21, subdistricts: ["สีคิ้ว", "มิตรภาพ", "กฤษณา", "ลาดบัวขาว"] }
    ]
  }
];

const paymentAreaAssignments = paymentRows.map((_, index) => {
  const province = provinces[index < 5 ? 0 : 1];
  const area = province.areas[index % province.areas.length];
  return {
    province: province.name,
    district: area.name,
    subdistrict: area.subdistricts[index % area.subdistricts.length]
  };
});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSansThai_400Regular,
    NotoSansThai_500Medium,
    NotoSansThai_600SemiBold,
    NotoSansThai_700Bold
  });
  const [databaseHistoryRows, setDatabaseHistoryRows] = useState(null);
  const [databaseError, setDatabaseError] = useState("");
  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [areaFilter, setAreaFilter] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const canvasScale = Math.min(viewportWidth / DESIGN_WIDTH, viewportHeight / DESIGN_HEIGHT, 1);
  const scaledLeft = (viewportWidth - DESIGN_WIDTH) / 2;
  const scaledTop = (viewportHeight - DESIGN_HEIGHT) / 2;

  useEffect(() => {
    let active = true;
    bootstrapApplication()
      .then(() => listPaymentHistory({ pageSize: 50 }))
      .then((rows) => {
        if (!active) return;
        setDatabaseHistoryRows(rows.map((row, index) => [
          index % 3 === 2 ? "female" : "male", row.customerFullName, row.customerMobileNo || "-", row.policyNo,
          row.totalPremium.toLocaleString("en-US"), new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "2-digit" }).format(new Date(row.payDate)),
          row.paymentStatus === "SUCCESS" ? "success" : "pending", row.installmentCount || 1, row.planCode, row.id
        ]));
      })
      .catch((error) => active && setDatabaseError(String(error)));
    return () => { active = false; };
  }, []);

  if (fontError) {
    return <View style={styles.startupState}><NativeText style={styles.startupError}>โหลดแบบอักษรไม่สำเร็จ กรุณาเปิดแอปใหม่</NativeText></View>;
  }

  if (!fontsLoaded) {
    return <View style={styles.startupState}><NativeText style={styles.startupText}>กำลังเตรียมข้อมูล...</NativeText></View>;
  }

  function drawerNavigate(navigation, nextScreen) {
    if (nextScreen === "history") {
      navigation.navigate("Payments", { initialTab: "history", navigationRequest: Date.now() });
    } else {
      const routes = { dashboard: "Dashboard", list: "Payments", customers: "Customers", confirm: "Confirm", qr: "QrPayment" };
      navigation.navigate(routes[nextScreen] || "Dashboard");
    }
    setMenuVisible(false);
  }

  function page(content, activeScreen, navigation) {
    return (
      <SafeAreaView style={styles.app}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.designCanvas, { left: scaledLeft, top: scaledTop, transform: [{ scale: canvasScale }] }]}>{content}</View>
        <AreaFilterModal visible={areaModalVisible} onClose={() => setAreaModalVisible(false)} onApply={(filter) => { setAreaFilter(filter); setAreaModalVisible(false); }} />
        <NavigationDrawer visible={menuVisible} activeScreen={activeScreen} onClose={() => setMenuVisible(false)} onNavigate={(next) => drawerNavigate(navigation, next)} />
        {databaseError ? <View style={styles.databaseWarning}><Text style={styles.databaseWarningText}>ใช้ข้อมูลสำรอง: SQLite ยังไม่พร้อมบนอุปกรณ์นี้</Text></View> : null}
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Dashboard" screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen name="Dashboard">{({ navigation }) => page(<DashboardScreen onOpenRenewal={(initialSummary = "ready") => navigation.navigate("Payments", { initialTab: "payments", initialSummary, navigationRequest: Date.now() })} onOpenCustomers={() => navigation.navigate("Customers")} />, "dashboard", navigation)}</Stack.Screen>
        <Stack.Screen name="Payments">{({ navigation, route }) => page(<PaymentListScreen initialTab={route.params?.initialTab} initialSummary={route.params?.initialSummary} navigationRequest={route.params?.navigationRequest} areaFilter={areaFilter} historyRecords={databaseHistoryRows || paymentHistoryRows} onBack={() => navigation.goBack()} onPay={(payment) => navigation.navigate("Confirm", { payment })} onOpenHistory={(record) => navigation.navigate("HistoryDetail", { record })} onMenu={() => setMenuVisible(true)} onOpenAreaFilter={() => setAreaModalVisible(true)} />, route.params?.initialTab === "history" ? "history" : "list", navigation)}</Stack.Screen>
        <Stack.Screen name="HistoryDetail">{({ navigation, route }) => page(<PaymentHistoryDetailScreen record={route.params?.record} onBack={() => navigation.goBack()} onMenu={() => setMenuVisible(true)} />, "historyDetail", navigation)}</Stack.Screen>
        <Stack.Screen name="Confirm">{({ navigation, route }) => page(<PaymentConfirmScreen payment={route.params?.payment} onBack={() => navigation.goBack()} onConfirm={(checkout) => navigation.navigate("QrPayment", checkout)} onMenu={() => setMenuVisible(true)} />, "confirm", navigation)}</Stack.Screen>
        <Stack.Screen name="QrPayment">{({ navigation, route }) => page(<QrPaymentScreen payment={route.params?.payment} installmentCount={route.params?.installmentCount} onBack={() => navigation.goBack()} onMenu={() => setMenuVisible(true)} />, "qr", navigation)}</Stack.Screen>
        <Stack.Screen name="Customers">{({ navigation }) => page(<CustomerListScreen onBack={() => navigation.goBack()} onMenu={() => setMenuVisible(true)} onOpenPayment={(payment) => navigation.navigate("Confirm", { payment })} />, "customers", navigation)}</Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function DashboardScreen({ onOpenRenewal, onOpenCustomers }) {
  const statuses = [
    ["24", "ครบกำหนด\nชำระเบี้ย"], ["10", "อยู่ในระยะเวลา\nผ่อนผัน"], ["4", "ใกล้สิ้นสุดเวลา\nผ่อนผัน"],
    ["3", "เกินระยะเวลา\nผ่อนผัน"], ["10", "รอตรวจสอบ\nการชำระเบี้ย"], ["2", "หักอัตโนมัติ\nไม่สำเร็จ"]
  ];
  const menu = [["home-outline", "หน้าหลัก"], ["document-text-outline", "เสนอขาย"], ["gift-outline", "สิทธิพิเศษ"], ["heart-outline", "ดูแลลูกค้า"], ["trending-up-outline", "บริหารทีม"], ["person-add-outline", "ขยายทีม"], ["play-circle-outline", "เรียนรู้"], ["hand-left-outline", "สนับสนุน"]];
  return (
    <View style={styles.dashboard}>
      <View style={styles.dashboardSidebar}>
        {menu.map(([icon, label], index) => (
          <Pressable key={label} onPress={() => index === 3 ? onOpenCustomers() : index === 0 ? null : Alert.alert(label, "เปิดเมนู " + label)} style={[styles.dashboardMenuItem, index === 3 && styles.dashboardMenuActive]}>
            <Ionicons name={icon} size={25} color="#fff" /><Text style={styles.dashboardMenuText}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView style={styles.dashboardBody} contentContainerStyle={styles.dashboardContent}>
        <View style={styles.dashboardProfile}>
          <Avatar gender="male" size={48} />
          <View><Text style={styles.dashboardProfileName}>คุณวินัย พิศสารนาวาพิเลิศรัตน์</Text><Text style={styles.dashboardProfileMeta}>ตัวแทน (71) | สาขา ถนนพัทธิ์ภูมิภาค หาดใหญ่   เลขที่ใบอนุญาต : 5700000888</Text></View>
          <Pressable style={styles.dashboardBell} onPress={() => Alert.alert("การแจ้งเตือน", "คุณมี 33 รายการใหม่")}><Ionicons name="notifications-outline" size={25} color="#173f52" /><View style={styles.dashboardBadge}><Text style={styles.dashboardBadgeText}>33+</Text></View></Pressable>
        </View>
        <View style={styles.dashboardGrid}>
          <View style={styles.dashboardMainColumn}>
            <View style={styles.dashboardCard}>
              <View style={styles.dashboardCardTitle}><Ionicons name="document-text-outline" size={22} color="#073f55" /><Text style={styles.dashboardCardTitleText}>เมนูลัด</Text></View>
              <Pressable onPress={() => onOpenRenewal("ready")} style={({ pressed }) => [styles.dashboardRenewalWidget, pressed && styles.copyPressed]}>
                <Ionicons name="hand-left-outline" size={33} color={BLUE} /><Text style={styles.dashboardRenewalText}>ชำระเบี้ยปีต่อ</Text>
              </Pressable>
            </View>
            <View style={styles.dashboardCard}>
              <View style={styles.dashboardCardHeader}><View style={styles.dashboardCardTitle}><Ionicons name="cash-outline" size={22} color="#073f55" /><Text style={styles.dashboardCardTitleText}>ชำระเบี้ยปีต่อ</Text></View><Pressable onPress={() => onOpenRenewal("ready")}><Text style={styles.dashboardAll}>ทั้งหมด  〉</Text></Pressable></View>
              <View style={styles.dashboardStatuses}>{statuses.map(([count, label], index) => <Pressable key={label} onPress={() => onOpenRenewal(index < 3 ? "ready" : index === 3 ? "overdue" : "lapsed")} style={({ pressed }) => [styles.dashboardStatus, pressed && styles.copyPressed]}><Text style={styles.dashboardStatusCount}>{count}</Text><Text style={styles.dashboardStatusLabel}>{label}</Text></Pressable>)}</View>
            </View>
          </View>
          <View style={styles.dashboardFamilyCard}>
            <View style={styles.dashboardCardTitle}><Ionicons name="id-card-outline" size={22} color="#073f55" /><Text style={styles.dashboardCardTitleText}>บัญชีครอบครัว Life Verse</Text></View>
            <View style={styles.dashboardFamilyActions}><Pressable onPress={onOpenCustomers} style={styles.dashboardFamilyAction}><Text style={styles.dashboardFamilyText}>จัดการ\nบัญชีครอบครัว</Text><Ionicons name="chevron-forward" size={22} color={BLUE} /></Pressable><Pressable onPress={() => onOpenRenewal("ready")} style={styles.dashboardFamilyAction}><Text style={styles.dashboardFamilyText}>รายการ\nกำลังดำเนินการ</Text><Ionicons name="chevron-forward" size={22} color={BLUE} /></Pressable></View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function AppHeader({ title, onBack, onMenu, rightAction }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeftControls}>
        <Pressable style={styles.menuButton} onPress={onMenu}>
          <Ionicons name="menu-outline" size={31} color={BLUE} />
        </Pressable>
        <Pressable style={styles.headerBackButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={32} color={BLUE} />
        </Pressable>
      </View>
      <Text style={styles.headerTitle}>{title}</Text>
      {rightAction ? (
        <Pressable style={styles.headerRightAction} onPress={rightAction.onPress}>
          <Ionicons name="share-outline" size={25} color={BLUE} />
          <Text style={styles.headerRightActionText}>{rightAction.label}</Text>
        </Pressable>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );
}

function CustomerListScreen({ onBack, onMenu, onOpenPayment }) {
  const [customerQuery, setCustomerQuery] = useState("");
  const [submittedCustomerQuery, setSubmittedCustomerQuery] = useState("");
  const [customerSegment, setCustomerSegment] = useState("all");
  const customerSegments = [
    ["all", "ทั้งหมด"], ["waiting", "รอชำส่งเบี้ย"], ["sending", "รอนำส่งเบี้ย"], ["blocked", "ไม่สามารถชำระบน TL After+"]
  ];
  const customers = useMemo(() => {
    const needle = submittedCustomerQuery.trim().toLocaleLowerCase("th");
    return paymentRows.filter((row) => {
      const matchesQuery = !needle || row[1].toLocaleLowerCase("th").includes(needle) || row[3].includes(needle);
      const matchesSegment = customerSegment === "all"
        || (customerSegment === "waiting" && row[7] === "wait")
        || (customerSegment === "sending" && row[7] === "auto")
        || (customerSegment === "blocked" && !row[10]);
      return matchesQuery && matchesSegment;
    });
  }, [customerSegment, submittedCustomerQuery]);

  return (
    <View style={styles.screen}>
      <View style={styles.customerHeader}>
        <Pressable style={styles.customerHeaderButton} onPress={onMenu}>
          <Ionicons name="menu-outline" size={31} color={BLUE} />
        </Pressable>
        <Pressable style={styles.customerHeaderButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={32} color={BLUE} />
        </Pressable>
        <Text style={styles.customerHeaderTitle}>รายชื่อลูกค้า</Text>
        <View style={styles.customerHeaderTail} />
      </View>
      <ScrollView style={styles.pageScroll} contentContainerStyle={styles.customerPageContent}>
        <View style={styles.customerPanel}>
          <View style={styles.customerToolbar}>
            <View style={styles.customerSearchBox}>
              <Ionicons name="search-outline" size={28} color="#75818a" />
              <TextInput
                value={customerQuery}
                onChangeText={setCustomerQuery}
                onSubmitEditing={() => setSubmittedCustomerQuery(customerQuery)}
                style={styles.customerSearchInput}
                placeholder="ค้นหาชื่อ นามสกุล หรือเลขที่กรมธรรม์"
                placeholderTextColor="#9aa4ad"
              />
            </View>
            <Pressable style={styles.customerSearchButton} onPress={() => setSubmittedCustomerQuery(customerQuery)}>
              <Text style={styles.customerSearchButtonText}>ค้นหา</Text>
            </Pressable>
            <View style={styles.customerSegment}>
              {customerSegments.map(([key, label], index) => (
                <React.Fragment key={key}>
                  {index ? <View style={styles.customerSegmentDivider} /> : null}
                  <Pressable style={[styles.customerSegmentItem, customerSegment === key && styles.customerSegmentActive]} onPress={() => setCustomerSegment(key)}>
                    <Text style={[styles.customerSegmentText, customerSegment === key && styles.customerSegmentTextActive]}>{label}</Text>
                  </Pressable>
                </React.Fragment>
              ))}
            </View>
          </View>

          <Text style={styles.customerCountTitle}>
            ใบคำขอทั้งหมด <Text style={styles.blueText}>{customers.length}</Text> รายการ
          </Text>

          <View style={styles.customerTable}>
            <View style={styles.customerTableHeader}>
              <Text style={[styles.customerTh, styles.customerApplicantCol]}>ผู้ทำประกันภัย</Text>
              <Text style={[styles.customerTh, styles.customerPolicyNoCol]}>เลขที่กรมธรรม์</Text>
              <Text style={[styles.customerTh, styles.customerPremiumCol]}>ยอดชำระเบี้ยประกันภัย</Text>
              <Text style={[styles.customerTh, styles.customerPayStatusCol]}>สถานะการชำระ</Text>
              <Text style={[styles.customerTh, styles.customerDueStatusCol]}>วันที่ครบกำหนดชำระ สถานะกรมธรรม์</Text>
            </View>
            {customers.length ? customers.map((row, index) => (
              <CustomerRow key={`${row[3]}-${index}`} row={row} onOpenPayment={onOpenPayment} />
            )) : (
              <View style={styles.emptyCustomerState}>
                <View style={styles.emptyDocument}>
                  <View style={styles.emptyPaperBack} />
                  <View style={styles.emptyPaperFront} />
                </View>
                <Text style={styles.emptyCustomerText}>ไม่พบข้อมูล</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function CustomerRow({ row, onOpenPayment }) {
  const [gender, name, phone, policy, , premium, due, statusType, status, note, enabled] = row;
  return (
    <Pressable
      style={({ pressed }) => [styles.customerDataRow, pressed && styles.copyPressed]}
      onPress={() => enabled ? onOpenPayment(row) : Alert.alert("ไม่สามารถชำระได้", note || "รายการนี้ยังไม่พร้อมชำระผ่านแอป")}
    >
      <View style={[styles.customerDataCell, styles.customerApplicantCol]}>
        <Avatar gender={gender} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={styles.historyResultName} numberOfLines={1}>{name}</Text>
          <View style={styles.phoneLine}><Ionicons name="call-outline" size={14} color={MUTED} /><Text style={styles.historyPhone}>{phone}</Text></View>
        </View>
      </View>
      <Text style={[styles.customerDataText, styles.customerPolicyNoCol]}>{policy}</Text>
      <Text style={[styles.customerDataText, styles.customerPremiumCol]}>{premium} บาท</Text>
      <View style={[styles.customerDataCell, styles.customerPayStatusCol]}>
        <View style={[styles.statusPill, statusType === "auto" ? styles.statusAuto : styles.statusWait]}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>
      <View style={[styles.customerDataCell, styles.customerDueStatusCol]}>
        <Text style={styles.customerDueText}>ครบกำหนด {due}</Text>
        <Text style={[styles.customerDueNote, !enabled && styles.customerDueBlocked]}>{enabled ? "แตะเพื่อชำระเบี้ย" : note || "ยังไม่พร้อมชำระ"}</Text>
      </View>
    </Pressable>
  );
}

function PaymentListScreen({ initialTab = "payments", initialSummary = "ready", navigationRequest, areaFilter, historyRecords, onBack, onPay, onOpenHistory, onMenu, onOpenAreaFilter }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [sorts, setSorts] = useState([]);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [activeSummary, setActiveSummary] = useState(initialSummary);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setActiveTab(initialTab || "payments");
    setActiveSummary(initialSummary || "ready");
    setPage(1);
  }, [initialTab, initialSummary, navigationRequest]);
  const sortedRows = useMemo(() => {
    const categoryRows = activeSummary === "ready" ? paymentRows : activeSummary === "overdue" ? paymentRows.slice(0, 6) : paymentRows.slice(6);
    const areaRows = areaFilter ? categoryRows.filter((row) => {
      const area = paymentAreaAssignments[paymentRows.indexOf(row)];
      return area
        && area.province === areaFilter.province
        && (!areaFilter.districts.length || areaFilter.districts.includes(area.district))
        && (!areaFilter.subdistricts.length || areaFilter.subdistricts.includes(area.subdistrict));
    }) : categoryRows;
    const needle = submittedQuery.trim().toLocaleLowerCase("th");
    const searchableRows = needle ? areaRows.filter((row) => row[1].toLocaleLowerCase("th").includes(needle) || row[3].includes(needle)) : areaRows;
    if (!sorts.length) return searchableRows;
    const fieldIndexes = {
      customer: 1,
      policy: 3,
      period: 4,
      premium: 5,
      due: 6,
      status: 8
    };
    return [...searchableRows].sort((left, right) => {
      for (const sort of sorts) {
        let a = left[fieldIndexes[sort.key]];
        let b = right[fieldIndexes[sort.key]];
        if (sort.key === "premium") {
          a = Number(String(a).replaceAll(",", ""));
          b = Number(String(b).replaceAll(",", ""));
        }
        const comparison = String(a).localeCompare(String(b), "th", { numeric: true });
        if (comparison !== 0) {
          return comparison * (sort.direction === "asc" ? 1 : -1);
        }
      }
      return 0;
    });
  }, [sorts, submittedQuery, activeSummary, areaFilter]);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const visibleRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  function toggleSort(key) {
    setSorts((current) => {
      const existingIndex = current.findIndex((item) => item.key === key);
      if (existingIndex < 0) {
        return [...current, { key, direction: "asc" }];
      }
      if (current[existingIndex].direction === "desc") {
        return current.filter((item) => item.key !== key);
      }
      return current.map((item, index) =>
        index === existingIndex
          ? { ...item, direction: "desc" }
          : item
      );
    });
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="ชำระเบี้ยปีต่อ" onBack={onBack} onMenu={onMenu} />
      <ScrollView style={styles.pageScroll} contentContainerStyle={styles.listContent}>
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === "payments" && styles.tabActive]}
            onPress={() => setActiveTab("payments")}
          >
            <Text style={activeTab === "payments" ? styles.tabActiveText : styles.tabText}>รายการชำระเบี้ย</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "history" && styles.tabActive]}
            onPress={() => setActiveTab("history")}
          >
            <Text style={activeTab === "history" ? styles.tabActiveText : styles.tabText}>ประวัติการชำระเบี้ย</Text>
          </Pressable>
        </View>
        {activeTab === "history" ? (
          <PaymentHistoryPanel records={historyRecords} onOpenHistory={onOpenHistory} />
        ) : (
          <View style={styles.listCard}>
          <View style={styles.toolbar}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={27} color="#75818a" />
              <TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => setSubmittedQuery(query)} style={styles.searchInput} placeholder="ค้นหาชื่อ นามสกุล  หรือเลขที่กรมธรรม์" placeholderTextColor="#9aa4ad" />
            </View>
            <Pressable style={styles.searchButton} onPress={() => setSubmittedQuery(query)}>
              <Text style={styles.searchButtonText}>ค้นหา</Text>
            </Pressable>
            <Pressable style={styles.filterLink} onPress={() => {
              setActiveSummary((current) => current === "ready" ? "overdue" : current === "overdue" ? "lapsed" : "ready");
              setPage(1);
            }}>
              <Ionicons name="options-outline" size={25} color={BLUE} />
              <Text style={styles.filterText}>ตัวกรอง: {activeSummary === "ready" ? "พร้อมชำระ" : activeSummary === "overdue" ? "เกินกำหนด" : "พ้นผ่อนผัน"}</Text>
            </Pressable>
            <Pressable style={styles.areaLink} onPress={onOpenAreaFilter}>
              <Ionicons name="location-outline" size={25} color={BLUE} />
              <Text style={styles.filterText}>{areaFilter ? `พื้นที่: ${areaFilter.province}` : "กรองตามพื้นที่"}</Text>
            </Pressable>
          </View>

          <View style={styles.summaryGrid}>
            <SummaryTile active={activeSummary === "ready"} label="พร้อมชำระ" value={`${paymentRows.length} รายการ`} onPress={() => { setActiveSummary("ready"); setPage(1); }} />
            <SummaryTile active={activeSummary === "overdue"} label="เกินกำหนดชำระ" value={`${paymentRows.slice(0, 6).length} รายการ`} onPress={() => { setActiveSummary("overdue"); setPage(1); }} />
            <SummaryTile active={activeSummary === "lapsed"} label="เกินระยะเวลาผ่อนผัน" value={`${paymentRows.slice(6).length} รายการ`} onPress={() => { setActiveSummary("lapsed"); setPage(1); }} />
          </View>

          <Text style={styles.sectionTitle}>
            {activeSummary === "ready" ? "พร้อมชำระ" : activeSummary === "overdue" ? "เกินกำหนดชำระ" : "เกินระยะเวลาผ่อนผัน"} <Text style={styles.blueText}>{sortedRows.length}</Text> รายการ
          </Text>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <SortableHeader label="ผู้ขอเอาประกันภัย" columnStyle={styles.customerCol} sortKey="customer" sorts={sorts} onSort={toggleSort} />
              <SortableHeader label="เลขที่ กธ." columnStyle={styles.policyCol} sortKey="policy" sorts={sorts} onSort={toggleSort} />
              <SortableHeader label="ปีที่/งวดที่" columnStyle={styles.periodCol} sortKey="period" sorts={sorts} onSort={toggleSort} />
              <SortableHeader label="เบี้ย" columnStyle={styles.premiumCol} sortKey="premium" sorts={sorts} onSort={toggleSort} />
              <SortableHeader label="ครบกำหนด" columnStyle={styles.dueCol} sortKey="due" sorts={sorts} onSort={toggleSort} />
              <SortableHeader label="สถานะ" columnStyle={styles.statusCol} sortKey="status" sorts={sorts} onSort={toggleSort} />
              <Text style={[styles.th, styles.actionCol]}>การจัดการ</Text>
            </View>
            {visibleRows.map((row, index) => (
              <PaymentRow key={`${row[3]}-${(page - 1) * pageSize + index}`} row={row} onPay={onPay} />
            ))}
          </View>

          <View style={styles.pagination}>
            <Text style={styles.paginationText}>จำนวนรายการ/หน้า  {pageSize}  จาก {sortedRows.length} รายการ</Text>
            <View style={styles.paginationActions}>
              <Pressable disabled={page <= 1} onPress={() => setPage((current) => Math.max(1, current - 1))}><Text style={[styles.nextText, page <= 1 && styles.paginationDisabled]}>‹ ก่อนหน้า</Text></Pressable>
              <Text style={styles.paginationText}>หน้า {page}/{totalPages}</Text>
              <Pressable disabled={page >= totalPages} onPress={() => setPage((current) => Math.min(totalPages, current + 1))}><Text style={[styles.nextText, page >= totalPages && styles.paginationDisabled]}>ถัดไป ›</Text></Pressable>
            </View>
          </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function PaymentHistoryPanel({ records, onOpenHistory }) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [sortDirection, setSortDirection] = useState("desc");
  const [statusFilter, setStatusFilter] = useState("all");
  const [historyPage, setHistoryPage] = useState(1);
  const pageSize = 10;
  const rows = useMemo(() => {
    const needle = submittedQuery.trim().toLocaleLowerCase("th");
    const statusRows = statusFilter === "all" ? records : records.filter((row) => row[6] === statusFilter);
    const filtered = needle ? statusRows.filter((row) =>
      row[1].toLocaleLowerCase("th").includes(needle) || row[3].includes(needle)
    ) : statusRows;
    return [...filtered].sort((a, b) => a[5].localeCompare(b[5], "th", { numeric: true }) * (sortDirection === "asc" ? 1 : -1));
  }, [records, submittedQuery, sortDirection, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visibleRows = rows.slice((historyPage - 1) * pageSize, historyPage * pageSize);

  useEffect(() => {
    setHistoryPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  return (
    <View style={styles.listCard}>
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={27} color="#75818a" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => setSubmittedQuery(query)}
            style={styles.searchInput}
            placeholder="ค้นหาชื่อ นามสกุล หรือเลขที่กรมธรรม์"
            placeholderTextColor="#98a1a6"
          />
        </View>
        <Pressable style={styles.searchButton} onPress={() => setSubmittedQuery(query)}>
          <Text style={styles.searchButtonText}>ค้นหา</Text>
        </Pressable>
        <Pressable style={styles.filterLink} onPress={() => {
          const next = statusFilter === "all" ? "pending" : statusFilter === "pending" ? "success" : "all";
          setStatusFilter(next);
          setHistoryPage(1);
        }}>
          <Ionicons name="options-outline" size={25} color={BLUE} />
          <Text style={styles.filterText}>ตัวกรอง{statusFilter === "pending" ? ": รอตรวจสอบ" : statusFilter === "success" ? ": สำเร็จ" : ""}</Text>
        </Pressable>
      </View>

      <View style={styles.historySummary}>
        <Text style={styles.sectionTitle}>ประวัติการชำระเบี้ย <Text style={styles.blueText}>{rows.length}</Text> รายการ</Text>
        <Text style={styles.historyAsOf}>ข้อมูล ณ วันที่ 14 มิ.ย. 69</Text>
      </View>

      <View style={styles.historyEmptyTable}>
        <View style={styles.historyTableHeader}>
          <Text style={[styles.historyTh, { width: 380, textAlign: "left" }]}>ผู้ขอเอาประกันภัย  ↕</Text>
          <Text style={[styles.historyTh, { width: 150 }]}>เลขที่ กธ.</Text>
          <Text style={[styles.historyTh, { width: 150 }]}>เบี้ยประกันภัย</Text>
          <Pressable style={{ width: 150 }} onPress={() => setSortDirection((value) => value === "asc" ? "desc" : "asc")}>
            <Text style={styles.historyTh}>วันที่ชำระ  {sortDirection === "asc" ? "↑" : "↓"}</Text>
          </Pressable>
          <Text style={[styles.historyTh, { width: 252 }]}>สถานะ</Text>
        </View>
        {visibleRows.length ? visibleRows.map((row, index) => (
          <Pressable key={`${row[3]}-${(historyPage - 1) * pageSize + index}`} style={styles.historyResultRow} onPress={() => onOpenHistory(row)}>
            <View style={[styles.historyResultCell, { width: 380 }]}>
              <Avatar gender={row[0]} size={54} />
              <View>
                <Text style={styles.historyResultName}>{row[1]}</Text>
                <View style={styles.phoneLine}><Ionicons name="call-outline" size={15} color={MUTED} /><Text style={styles.historyPhone}>{row[2]}</Text></View>
              </View>
            </View>
            <Text style={[styles.historyResultText, { width: 150 }]}>{row[3]}</Text>
            <Text style={[styles.historyResultText, { width: 150, textAlign: "right" }]}>{row[4]}</Text>
            <Text style={[styles.historyResultText, { width: 150 }]}>{row[5]}</Text>
            <View style={{ width: 252, alignItems: "center" }}>
              <View style={[styles.historyStatusPill, row[6] === "success" ? styles.historyStatusSuccess : styles.historyStatusPending]}>
                <Ionicons name={row[6] === "success" ? "checkmark-circle-outline" : "hourglass-outline"} size={16} color={row[6] === "success" ? "#297a47" : "#8055a5"} />
                <Text style={styles.historyStatusText}>{row[6] === "success" ? "ชำระสำเร็จ" : "รอตรวจสอบจากทางการเงิน"}</Text>
              </View>
            </View>
          </Pressable>
        )) : (
          <View style={styles.historyEmptyState}>
            <View style={styles.emptyDocument}>
              <View style={styles.emptyPaperBack} />
              <View style={styles.emptyPaperFront} />
            </View>
            <Text style={styles.historyEmptyText}>ไม่พบข้อมูล</Text>
          </View>
        )}
      </View>
      <View style={styles.historyPagination}>
        <Text style={styles.paginationText}>จำนวนรายการ/หน้า   <Text style={styles.historySelect}> {pageSize} </Text>   จาก {rows.length} รายการ</Text>
        <View style={styles.paginationActions}>
          <Pressable disabled={historyPage <= 1} onPress={() => setHistoryPage((current) => Math.max(1, current - 1))}><Text style={[styles.nextText, historyPage <= 1 && styles.paginationDisabled]}>‹ ก่อนหน้า</Text></Pressable>
          <Text style={styles.paginationText}>หน้า {historyPage}/{totalPages}</Text>
          <Pressable disabled={historyPage >= totalPages} onPress={() => setHistoryPage((current) => Math.min(totalPages, current + 1))}><Text style={[styles.nextText, historyPage >= totalPages && styles.paginationDisabled]}>ถัดไป ›</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

function PaymentHistoryDetailScreen({ record, onBack, onMenu }) {
  const [toastMessage, setToastMessage] = useState("");
  const [databaseDetails, setDatabaseDetails] = useState([]);
  const isPending = record?.[6] === "pending";
  const installmentCount = record?.[7] || 1;
  const isUwb = record?.[8] === "UWB";
  const customerName = record?.[1] || "ธนาธิป รุ่งปัญญกิจพัฒน์";
  const phone = record?.[2] && record[2] !== "-" ? record[2] : "-";
  const policyNo = record?.[3] || "1234567890";

  useEffect(() => {
    let active = true;
    const historyId = record?.[9];
    if (historyId) getPaymentDetails(historyId).then((details) => active && setDatabaseDetails(details)).catch(() => {});
    return () => { active = false; };
  }, [record]);

  const detailRows = databaseDetails.length ? databaseDetails : Array.from({ length: installmentCount }, (_, index) => ({
    id: index + 1, payPeriod: `01/${String(index + 1).padStart(2, "0")}`, receiptNo: "123450000012", payDate: "2026-02-20",
    lifePremium: 15000, riderPremium: 2500, extraPremium: isUwb ? 2500 : 0, totalPremium: 20000
  }));
  const databaseTotalPaid = detailRows.reduce((sum, detail) => sum + detail.totalPremium, 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  async function copyDetailPhone() {
    await Clipboard.setStringAsync(phone);
    setToastMessage("คัดลอกเบอร์โทรแล้ว");
    setTimeout(() => setToastMessage(""), 2200);
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="ประวัติการทำรายการ" onBack={onBack} onMenu={onMenu} />
      <ScrollView style={styles.pageScroll} contentContainerStyle={styles.historyDetailContent}>
        <View style={styles.historyDetailCard}>
          <Text style={styles.historyDetailTitle}>ประวัติการชำระเบี้ยปีต่อ</Text>
          <Text style={styles.historyDetailSubtitle}>รายละเอียดชำระเบี้ยปีต่อ  ⓘ</Text>
          <View style={styles.historyLead}>
            <Avatar gender={record?.[0] || "male"} size={64} />
            <View style={{ flex: 1 }}>
              <Text style={styles.historyLeadName}>นาย {customerName}</Text>
              <Text style={styles.historyLeadPolicy}>เลขที่กรมธรรม์ <Text style={styles.blueText}>{policyNo}</Text> {isUwb ? "ทีแอล ยูนิเวอร์แซลไลฟ์ 90/90 [UWB]" : "ทรัพย์ปันผล 20/20 [EL]"}</Text>
            </View>
          </View>
          <View style={styles.historyDetailRows}>
            <View style={styles.historyDetailLine}>
              <Text style={styles.historyDetailLabel}>เบอร์โทรศัพท์มือถือ :</Text>
              <Pressable disabled={phone === "-"} accessibilityRole="button" accessibilityLabel={`คัดลอกเบอร์โทร ${phone}`} style={({ pressed }) => [styles.historyCopyValue, phone === "-" && styles.copyDisabled, pressed && styles.copyPressed]} onPress={copyDetailPhone}>
                <Text style={styles.historyCopyText}>{phone}</Text>
                <Ionicons name="copy-outline" size={19} color={BLUE} />
              </Pressable>
            </View>
            <DetailLine label="อีเมล :" value="example@gmail.com" />
            <View style={styles.historyDetailLine}>
              <Text style={styles.historyDetailLabel}>สถานะการชำระเบี้ย :</Text>
              <View style={{ flex: 1, alignItems: "flex-start" }}>
                <View style={[styles.historyStatusPill, isPending ? styles.historyStatusPending : styles.historyStatusSuccess]}>
                  <Ionicons name={isPending ? "hourglass-outline" : "checkmark-circle-outline"} size={16} color={isPending ? "#8055a5" : "#297a47"} />
                  <Text style={styles.historyStatusText}>{isPending ? "รอตรวจสอบจากทางการเงิน" : "ชำระสำเร็จ"}</Text>
                </View>
                {isPending ? (
                  <Pressable style={styles.historyCheckStatus} onPress={() => Alert.alert("ตรวจสอบสถานะ", "ส่งคำขอตรวจสอบสถานะการชำระเงินแล้ว")}>
                    <Ionicons name="refresh-outline" size={27} color={BLUE} /><Text style={styles.historyCheckStatusText}>ตรวจสอบสถานะ</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        </View>
        <View style={styles.historyPaymentCard}>
          <Text style={styles.historyDetailSubtitle}>ข้อมูลการชำระเบี้ย</Text>
          {detailRows.map((detail, index) => (
            <View key={detail.id} style={[styles.historyPaymentInfo, index > 0 && styles.historyPaymentInfoSpacing]}>
              <View style={styles.historyPaymentHeadline}>
                <Ionicons name="receipt-outline" size={28} color={BLUE} style={styles.historyReceiptIcon} />
                <Text style={styles.historyPaymentPeriod}>ปีที่/งวดที่ :  <Text style={styles.historyStrong}>{detail.payPeriod}</Text></Text>
                <Text style={styles.historyPaymentAmount}>{detail.totalPremium.toLocaleString("en-US", { minimumFractionDigits: 2 })} บาท</Text>
              </View>
              <DetailLine label="เลขที่ใบเสร็จ :" value={detail.receiptNo || "-"} />
              <DetailLine label="วันที่ชำระ :" value={detail.payDate ? new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(detail.payDate)) : "-"} />
              <DetailLine label="เบี้ยประกันภัยหลัก :" value={`${detail.lifePremium.toLocaleString("en-US", { minimumFractionDigits: 2 })} บาท`} />
              <DetailLine label="เบี้ยประกันภัยสัญญาเพิ่มเติม :" value={`${detail.riderPremium.toLocaleString("en-US", { minimumFractionDigits: 2 })} บาท`} />
              {detail.extraPremium > 0 ? <DetailLine label="เบี้ยประกันภัยเพิ่มพิเศษชีวิต (เบี้ย Extra) :" value={`${detail.extraPremium.toLocaleString("en-US", { minimumFractionDigits: 2 })} บาท`} /> : null}
            </View>
          ))}
          <View style={styles.historyPaymentTotal}>
            <Text style={styles.historyPaymentTotalText}>เบี้ยประกันภัยรวม <Text style={styles.blueText}>{databaseTotalPaid}</Text> บาท</Text>
          </View>
        </View>
      </ScrollView>
      {toastMessage ? (
        <View pointerEvents="none" style={styles.toast}><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={styles.toastText}>{toastMessage}</Text></View>
      ) : null}
    </View>
  );
}

function DetailLine({ label, value }) {
  return (
    <View style={styles.historyDetailLine}>
      <Text style={styles.historyDetailLabel}>{label}</Text>
      <Text style={styles.historyDetailValue}>{value}</Text>
    </View>
  );
}

function SortableHeader({ label, columnStyle, sortKey, sorts, onSort }) {
  const sortIndex = sorts.findIndex((item) => item.key === sortKey);
  const activeSort = sortIndex >= 0 ? sorts[sortIndex] : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`เรียงตาม${label}`}
      style={[styles.sortableHeader, columnStyle]}
      onPress={() => onSort(sortKey)}
    >
      <Text style={styles.th}>{label}</Text>
      <Text style={[styles.sortIcon, activeSort && styles.sortIconActive]}>
        {activeSort ? (activeSort.direction === "asc" ? "↑" : "↓") : "↕"}
      </Text>
    </Pressable>
  );
}

function SummaryTile({ active, label, value, onPress }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.summaryTile, active && styles.summaryTileActive, pressed && styles.summaryTilePressed]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </Pressable>
  );
}

function Avatar({ gender, size = 54 }) {
  const female = gender === "female";
  if (!female) {
    return (
      <Image
        source={require("./assets/avatars/avatar-agent.png")}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <View style={[styles.avatarHairBack, female && styles.avatarHairBackFemale]} />
      <View style={styles.avatarNeck} />
      <View style={styles.avatarShirt} />
      <View style={styles.avatarFace} />
      <View style={[styles.avatarHair, female && styles.avatarHairFemale]} />
      <View style={[styles.avatarFringe, female && styles.avatarFringeFemale]} />
    </View>
  );
}

function PaymentRow({ row, onPay }) {
  const [gender, name, phone, policy, period, premium, due, statusType, status, note, enabled] = row;

  return (
    <View style={styles.tableRow}>
      <View style={[styles.td, styles.customerCol]}>
        <View style={styles.customerCell}>
          <Avatar gender={gender} />
          <View style={styles.customerInfo}>
            <Text style={styles.nameText} numberOfLines={1}>{name}</Text>
            <View style={styles.phoneLine}><Ionicons name="call-outline" size={14} color={MUTED} /><Text style={styles.phoneText}>{phone}</Text></View>
          </View>
        </View>
      </View>
      <Text style={[styles.td, styles.policyCol]}>{policy}</Text>
      <Text style={[styles.td, styles.periodCol]}>{period}</Text>
      <Text style={[styles.td, styles.premiumCol]}>{premium}</Text>
      <Text style={[styles.td, styles.dueCol]}>{due}</Text>
      <View style={[styles.td, styles.statusCol]}>
        <View style={[styles.statusPill, statusType === "auto" ? styles.statusAuto : styles.statusWait]}>
          <View style={styles.inlineStatus}><Ionicons name="hourglass-outline" size={14} color="#4a4f54" /><Text style={styles.statusText}>{status}</Text></View>
        </View>
        {note ? <Text style={styles.statusNote}>{note}</Text> : null}
      </View>
      <View style={[styles.td, styles.actionCol]}>
        <Pressable style={[styles.payButton, !enabled && styles.payButtonDisabled]} onPress={enabled ? () => onPay(row) : undefined}>
          <Text style={[styles.payButtonText, !enabled && styles.payButtonTextDisabled]}>ชำระเบี้ย</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PaymentConfirmScreen({ payment, onBack, onConfirm, onMenu }) {
  const selectedPayment = payment || paymentRows[0];
  const [installmentInput, setInstallmentInput] = useState("1");
  const [showMore, setShowMore] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const installmentCount = Number(installmentInput);
  const validInstallmentCount = Number.isInteger(installmentCount) && installmentCount >= 1 && installmentCount <= 24;
  const premiumAmount = Number(String(selectedPayment[5]).replaceAll(",", ""));
  const totalAmount = validInstallmentCount ? premiumAmount * installmentCount : 0;
  const formattedPremium = premiumAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formattedTotal = totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function confirmPayment() {
    if (!validInstallmentCount) {
      Alert.alert("กรุณาตรวจสอบจำนวนงวด", "ระบุจำนวนงวดเป็นตัวเลขตั้งแต่ 1–24 งวด");
      return;
    }
    onConfirm({ payment: selectedPayment, installmentCount });
  }

  async function copyConfirmPhone(phone) {
    if (!phone || phone === "-") return;
    await Clipboard.setStringAsync(phone);
    setToastMessage("คัดลอกเบอร์โทรแล้ว");
    setTimeout(() => setToastMessage(""), 2200);
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="ยืนยันชำระเบี้ยปีต่อ" onBack={onBack} onMenu={onMenu} />
      <ScrollView style={styles.pageScroll} contentContainerStyle={styles.confirmContent}>
        <View style={styles.confirmCard}>
          <Text style={styles.confirmHeading}>ยืนยันชำระเบี้ยปีต่อ</Text>
          <Text style={styles.confirmSubheading}>รายละเอียดชำระเบี้ยปีต่อ  ⓘ</Text>
          <View style={styles.insuredCard}>
            <Avatar gender={selectedPayment[0]} size={64} />
            <View style={styles.insuredInfo}>
              <Text style={styles.insuredName}>{selectedPayment[1]}</Text>
              <Text style={styles.policyLine}>เลขที่กรมธรรม์ <Text style={styles.blueText}>{selectedPayment[3]}</Text> ทีแอล ยูนิเวอร์แซลไลฟ์ 90/90 [UWB]</Text>
            </View>
          </View>
          <DetailGrid payment={selectedPayment} onCopyPhone={copyConfirmPhone} />
        </View>

        <View style={styles.paymentInfoCard}>
          <Text style={styles.paymentInfoHeading}>ข้อมูลการชำระเบี้ย</Text>
          <InstallmentBox period={selectedPayment[4]} dateLabel="ครบกำหนดชำระ" date={selectedPayment[6]} rp={`${formattedPremium} บาท`} rider="0.00 บาท" total={`${formattedPremium} บาท`} />
          {showMore ? <InstallmentBox period="งวดถัดไป" dateLabel="สถานะ" date="คำนวณตามจำนวนงวดที่ระบุ" rp={`${formattedPremium} บาท/งวด`} total={`${formattedTotal} บาท`} /> : null}
          <Text style={styles.inputLabel}>งวดที่ต้องการชำระ <Text style={styles.required}>*</Text></Text>
          <TextInput value={installmentInput} onChangeText={setInstallmentInput} style={styles.periodInput} placeholder="งวด" placeholderTextColor="#9aa4ad" keyboardType="numeric" />
          <Text style={styles.hintText}>● ระบุงวดที่ต้องการชำระได้ตั้งแต่ 1–24 งวด</Text>
        </View>

        <View style={styles.totalCard}>
          <Pressable onPress={() => setShowMore((current) => !current)}><Text style={styles.moreText}>{showMore ? "ซ่อนรายละเอียด  ⌃" : "ดูเพิ่มเติม  ⌄"}</Text></Pressable>
          <View style={styles.totalBox}>
            <Text style={styles.totalText}>เบี้ยประกันรวม <Text style={styles.totalAmount}>{validInstallmentCount ? formattedTotal : "-"}</Text> บาท</Text>
          </View>
        </View>

        <View style={styles.footerActions}>
          <Pressable style={styles.secondaryAction} onPress={onBack}>
            <Text style={styles.secondaryActionText}>ย้อนกลับ</Text>
          </Pressable>
          <Pressable style={[styles.primaryAction, !validInstallmentCount && styles.primaryActionDisabled]} onPress={confirmPayment}>
            <Text style={styles.primaryActionText}>ยืนยันชำระเบี้ย</Text>
          </Pressable>
        </View>
      </ScrollView>
      {toastMessage ? <View pointerEvents="none" style={styles.toast}><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={styles.toastText}>{toastMessage}</Text></View> : null}
    </View>
  );
}

function QrPaymentScreen({ payment, installmentCount = 1, onBack, onMenu }) {
  const qrCardRef = useRef(null);
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const selectedPayment = payment || paymentRows[0];
  const premiumAmount = Number(String(selectedPayment[5]).replaceAll(",", ""));
  const totalAmount = premiumAmount * Math.max(1, Number(installmentCount) || 1);
  const formattedAmount = totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const reference = `RYP-${selectedPayment[3]}-${String(installmentCount).padStart(2, "0")}`;
  const qrPayload = `RYP|POLICY=${selectedPayment[3]}|AMOUNT=${totalAmount.toFixed(2)}|REF=${reference}`;
  const expiryLabel = useMemo(() => {
    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(expiry);
  }, [reference]);

  async function captureQrCard() {
    return captureRef(qrCardRef, {
      format: "png",
      quality: 1,
      result: "tmpfile"
    });
  }

  async function shareQr() {
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert("ไม่สามารถแชร์ได้", "อุปกรณ์นี้ไม่รองรับการแชร์ไฟล์");
        return;
      }
      const uri = await captureQrCard();
      await Sharing.shareAsync(uri, {
        UTI: "public.png",
        mimeType: "image/png",
        anchor: { x: viewportWidth / 2, y: viewportHeight / 2, width: 1, height: 1 }
      });
    } catch (error) {
      Alert.alert("แชร์ไม่สำเร็จ", String(error));
    }
  }

  async function saveQr() {
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("ไม่ได้รับอนุญาต", "กรุณาอนุญาตให้แอปบันทึกรูปภาพ");
        return;
      }
      const uri = await captureQrCard();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("บันทึกสำเร็จ", "บันทึกรูป QR Code ลงใน Photos แล้ว");
    } catch (error) {
      Alert.alert("บันทึกไม่สำเร็จ", String(error));
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        title="QR Code ชำระเบี้ย"
        onBack={onBack}
        onMenu={onMenu}
        rightAction={{ label: "แชร์", onPress: shareQr }}
      />
      <ScrollView style={styles.pageScroll} contentContainerStyle={styles.qrPage}>
        <View ref={qrCardRef} collapsable={false} style={styles.qrCard}>
          <View style={styles.qrBrand}>
            <Text style={styles.qrBrandThai}>ไทย</Text>
            <Text style={styles.qrBrandLife}>ประกันชีวิต</Text>
          </View>
          <Text style={styles.qrHeading}>QR Code</Text>
          <QRCode value={qrPayload} size={300} color="#252525" backgroundColor="#ffffff" />
          <Text style={styles.qrExpiry}>หมดอายุภายใน {expiryLabel}</Text>
          <View style={styles.qrTestBadge}><Text style={styles.qrTestBadgeText}>อ้างอิง {reference}</Text></View>
          <View style={styles.qrDetails}>
            <DetailLine label="ชื่อผู้เอาประกันภัย" value={selectedPayment[1]} />
            <DetailLine label="เบี้ยประกันภัยรวม" value={`${formattedAmount} บาท`} />
            <DetailLine label="หมายเลขกรมธรรม์" value={selectedPayment[3]} />
          </View>
        </View>
        <View style={styles.qrActions}>
          <Pressable style={styles.secondaryAction} onPress={saveQr}>
            <Text style={styles.secondaryActionText}>บันทึกรูปภาพ</Text>
          </Pressable>
          <Pressable style={styles.primaryAction} onPress={shareQr}>
            <Text style={styles.primaryActionText}>แชร์ QR Code</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function DetailGrid({ payment, onCopyPhone }) {
  const selectedPayment = payment || paymentRows[0];
  const items = [
    ["เบอร์โทรศัพท์มือถือ :", selectedPayment[2] || "-"],
    ["อีเมล :", "example@gmail.com"],
    ["ที่อยู่ :", "14 ม.16 บ้านต้าสุขเกษม ต.ต้า อ.ขุนตาล\nจ.เชียงราย 57340"],
    ["ใบเสร็จรับเงินอิเล็กทรอนิกส์ :", "⊗ ยังไม่ลงทะเบียน"],
    ["สถานะการชำระเบี้ย :", selectedPayment[8]],
    ["ผู้แนะนำ :", "นางสาว ชนิกานต์ ศรีเจริญ"]
  ];

  return (
    <View style={styles.detailGrid}>
      {items.map(([label, value]) => (
        <View style={styles.detailRow} key={label}>
          <Text style={styles.detailLabel}>{label}</Text>
          {label.includes("เบอร์โทรศัพท์") ? (
            <Pressable
              style={styles.copyPhone}
              accessibilityRole="button"
              accessibilityLabel={`คัดลอกเบอร์โทร ${value}`}
              disabled={!value || value === "-"}
              onPress={() => onCopyPhone(value)}
            >
              <Text style={styles.detailValue}>{value}</Text>
              <Ionicons name="copy-outline" size={23} color={BLUE} />
            </Pressable>
          ) : (
            <Text style={[
              styles.detailValue,
              value.includes("ยังไม่ลงทะเบียน") && styles.dangerBadgeText,
              (value.includes("รอชำระเบี้ย") || value.includes("รอทำชำระ")) && styles.waitBadgeText
            ]}>{value}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

function InstallmentBox({ period, dateLabel, date, rp, rider, total }) {
  const rows = [
    ["ปีที่/งวดที่", period],
    [dateLabel, date],
    ["เบี้ยประกันภัยหลัก (RP)", rp],
    ...(rider ? [["เบี้ยประกันภัยสัญญาเพิ่มเติม", rider]] : []),
    ["รวมเบี้ยประกันภัยที่ต้องชำระ", total]
  ];

  return (
    <View style={styles.installmentBox}>
      {rows.map(([label, value]) => (
        <View style={styles.installmentRow} key={label}>
          <Text style={styles.installmentLabel}>{label} :</Text>
          <Text style={styles.installmentValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function AreaFilterModal({ visible, onClose, onApply }) {
  const [provinceIndex, setProvinceIndex] = useState(0);
  const province = provinces[provinceIndex];
  const [districtNames, setDistrictNames] = useState([province.areas[0].name]);
  const selectedAreas = useMemo(
    () => province.areas.filter((area) => districtNames.includes(area.name)),
    [province, districtNames]
  );
  const subdistricts = useMemo(
    () => Array.from(new Set(selectedAreas.flatMap((area) => area.subdistricts))),
    [selectedAreas]
  );
  const [subdistrictNames, setSubdistrictNames] = useState(province.areas[0].subdistricts);

  function changeProvince(index) {
    const nextProvince = provinces[index];
    setProvinceIndex(index);
    setDistrictNames([nextProvince.areas[0].name]);
    setSubdistrictNames(nextProvince.areas[0].subdistricts);
  }

  function toggleDistrict(name) {
    const nextDistricts = districtNames.includes(name)
      ? districtNames.filter((item) => item !== name)
      : [...districtNames, name];
    const nextAreas = province.areas.filter((area) => nextDistricts.includes(area.name));
    const nextSubdistricts = Array.from(new Set(nextAreas.flatMap((area) => area.subdistricts)));
    setDistrictNames(nextDistricts);
    setSubdistrictNames(nextSubdistricts);
  }

  function toggleSubdistrict(name) {
    setSubdistrictNames((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name]
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.areaModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>กรองตามพื้นที่</Text>
            <Pressable onPress={onClose}><Text style={styles.modalClose}>×</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.fieldLabel}>จังหวัด <Text style={styles.required}>*</Text></Text>
            <View style={styles.provinceChoices}>
              {provinces.map((item, index) => (
                <Chip key={item.name} label={item.name} selected={provinceIndex === index} onPress={() => changeProvince(index)} />
              ))}
            </View>

            <Text style={styles.fieldLabel}>{province.districtLabel} <Text style={styles.required}>*</Text> <Text style={styles.counter}>{districtNames.length}/{province.areas.length}</Text></Text>
            <View style={styles.chipList}>
              {province.areas.map((area) => (
                <Chip key={area.name} label={area.name} selected={districtNames.includes(area.name)} onPress={() => toggleDistrict(area.name)} />
              ))}
            </View>

            <Text style={styles.fieldLabel}>{province.subdistrictLabel} <Text style={styles.required}>*</Text> <Text style={styles.counter}>{subdistrictNames.length}/{subdistricts.length}</Text></Text>
            {subdistricts.length ? (
              <View style={styles.chipList}>
                {subdistricts.map((name) => (
                  <Chip key={name} label={name} selected={subdistrictNames.includes(name)} onPress={() => toggleSubdistrict(name)} />
                ))}
              </View>
            ) : (
              <View style={styles.emptyArea}>
                <Ionicons name="location-outline" size={38} color={BLUE} />
                <Text style={styles.emptyText}>กรุณาเลือกอำเภอ/เขตก่อน</Text>
              </View>
            )}

            <Pressable
              disabled={!districtNames.length}
              style={[styles.modalApply, !districtNames.length && styles.primaryActionDisabled]}
              onPress={() => onApply({ province: province.name, districts: districtNames, subdistricts: subdistrictNames })}
            >
              <Text style={styles.modalApplyText}>กรองข้อมูล</Text>
            </Pressable>
            <Pressable
              style={styles.modalClear}
              onPress={() => {
                setDistrictNames([]);
                setSubdistrictNames([]);
                onApply(null);
              }}
            >
              <Text style={styles.modalClearText}>ล้างการกรอง</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Chip({ label, selected, onPress }) {
  return (
    <Pressable style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function NavigationDrawer({ visible, activeScreen, onClose, onNavigate }) {
  const items = [
    { screen: "customers", icon: "people-outline", label: "รายชื่อลูกค้า" },
    { screen: "list", icon: "card-outline", label: "รายการชำระเบี้ย" },
    { screen: "history", icon: "time-outline", label: "ประวัติการชำระเบี้ย" },
    { screen: "confirm", icon: "checkmark-circle-outline", label: "ยืนยันชำระเบี้ย" },
    { screen: "qr", icon: "qr-code-outline", label: "ทดสอบ QR Code" }
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.drawerLayer}>
        <View style={styles.drawer}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>เมนู</Text>
            <Pressable style={styles.drawerClose} onPress={onClose}>
              <Text style={styles.drawerCloseText}>×</Text>
            </Pressable>
          </View>
          <View style={styles.drawerItems}>
            {items.map((item) => {
              const active = activeScreen === item.screen;
              return (
                <Pressable
                  key={item.screen}
                  style={[styles.drawerItem, active && styles.drawerItemActive]}
                  onPress={() => onNavigate(item.screen)}
                >
                  <Ionicons name={item.icon} size={24} color={active ? BLUE : "#72797c"} style={styles.drawerItemIcon} />
                  <Text style={[styles.drawerItemText, active && styles.drawerItemTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Pressable style={styles.drawerDismiss} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  startupState: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: PAGE_BG },
  startupText: { color: TEXT, fontSize: 18 },
  startupError: { color: "#a94747", fontSize: 18, fontWeight: "700" },
  dashboard: { width: DESIGN_WIDTH, minHeight: 834, flexDirection: "row", backgroundColor: "#f2f4f5" },
  dashboardSidebar: { width: 74, minHeight: 834, paddingTop: 12, backgroundColor: "#0785c5", alignItems: "center" },
  dashboardMenuItem: { width: 64, minHeight: 70, borderRadius: 9, alignItems: "center", justifyContent: "center", gap: 4 },
  dashboardMenuActive: { backgroundColor: "#056aa1" },
  dashboardMenuText: { color: "#fff", fontSize: 12, lineHeight: 17, textAlign: "center" },
  dashboardBody: { flex: 1 },
  dashboardContent: { paddingHorizontal: 16, paddingBottom: 40 },
  dashboardProfile: { height: 86, flexDirection: "row", alignItems: "center", gap: 12, position: "relative" },
  dashboardProfileName: { color: "#202428", fontSize: 21, lineHeight: 28, fontWeight: "700" },
  dashboardProfileMeta: { color: "#646d73", fontSize: 13, lineHeight: 20 },
  dashboardBell: { position: "absolute", right: 6, width: 48, height: 48, borderRadius: 24, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  dashboardBadge: { position: "absolute", right: -6, top: -4, minWidth: 30, height: 22, paddingHorizontal: 4, borderRadius: 11, backgroundColor: "#ef2f2f", alignItems: "center", justifyContent: "center" },
  dashboardBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  dashboardGrid: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  dashboardMainColumn: { width: 720, gap: 16 },
  dashboardCard: { padding: 16, backgroundColor: "#fff", borderRadius: 10, shadowColor: "#26384a", shadowOpacity: 0.09, shadowRadius: 6, elevation: 2 },
  dashboardCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dashboardCardTitle: { flexDirection: "row", alignItems: "center", gap: 9 },
  dashboardCardTitleText: { color: "#073f55", fontSize: 18, lineHeight: 25, fontWeight: "700" },
  dashboardRenewalWidget: { height: 74, marginTop: 18, borderWidth: 1, borderColor: "#65c9f5", borderRadius: 8, backgroundColor: "#effaff", alignItems: "center", justifyContent: "center" },
  dashboardRenewalText: { marginTop: 3, color: BLUE, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  dashboardAll: { color: BLUE, fontSize: 15, lineHeight: 22, fontWeight: "600" },
  dashboardStatuses: { marginTop: 18, flexDirection: "row", gap: 8 },
  dashboardStatus: { width: 106, minHeight: 86, padding: 11, borderWidth: 1, borderColor: "#d9e2e8", borderRadius: 8, backgroundColor: "#fff" },
  dashboardStatusCount: { color: "#3c444a", fontSize: 23, lineHeight: 29, fontWeight: "700" },
  dashboardStatusLabel: { marginTop: 5, color: "#68737b", fontSize: 13, lineHeight: 18 },
  dashboardFamilyCard: { width: 352, padding: 16, backgroundColor: "#fff", borderRadius: 10, shadowColor: "#26384a", shadowOpacity: 0.09, shadowRadius: 6, elevation: 2 },
  dashboardFamilyActions: { marginTop: 20, flexDirection: "row", gap: 8 },
  dashboardFamilyAction: { width: 152, height: 74, paddingHorizontal: 14, borderRadius: 8, backgroundColor: "#f1f8fb", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dashboardFamilyText: { color: "#3d454b", fontSize: 16, lineHeight: 22, fontWeight: "600" },
  databaseWarning: { position: "absolute", right: 18, bottom: 18, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 7, backgroundColor: "#8a5a00" },
  databaseWarningText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  app: { flex: 1, backgroundColor: PAGE_BG, overflow: "hidden" },
  designCanvas: {
    position: "absolute",
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
    backgroundColor: PAGE_BG
  },
  screen: { flex: 1, backgroundColor: PAGE_BG },
  header: {
    height: 76,
    backgroundColor: "#fff",
    borderBottomColor: "#e5eaf0",
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center"
  },
  headerLeftControls: { width: 190, height: 44, paddingLeft: 32, flexDirection: "row", alignItems: "center" },
  menuButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  menuIcon: { color: "#007ac2", fontSize: 26, lineHeight: 30, fontWeight: "700" },
  headerBackButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backIcon: { color: BLUE, fontSize: 36, lineHeight: 38 },
  headerTitle: { flex: 1, color: "#393c3e", fontSize: 26, lineHeight: 32, fontWeight: "900", textAlign: "center" },
  headerSpacer: { width: 190 },
  headerRightAction: {
    width: 190,
    height: 44,
    paddingRight: 32,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8
  },
  headerRightActionIcon: { color: "#007ac2", fontSize: 24, lineHeight: 28, fontWeight: "700" },
  headerRightActionText: { color: "#007ac2", fontSize: 18, lineHeight: 24, fontWeight: "700" },
  pageScroll: { flex: 1 },
  customerHeader: {
    height: 76,
    backgroundColor: "#fff",
    borderBottomColor: "#e5eaf0",
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18
  },
  customerHeaderButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  customerHeaderIcon: { color: BLUE, fontSize: 30, fontWeight: "700", lineHeight: 32 },
  customerBackIcon: { color: BLUE, fontSize: 40, lineHeight: 40, marginTop: -2 },
  customerHeaderTitle: { flex: 1, textAlign: "center", color: TEXT, fontSize: 28, fontWeight: "900" },
  customerHeaderTail: { width: 84 },
  customerPageContent: { padding: 16, paddingTop: 36 },
  customerPanel: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
    minHeight: 760,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  customerToolbar: { flexDirection: "row", alignItems: "center", gap: 18, flexWrap: "wrap" },
  customerSearchBox: {
    width: 456,
    height: 66,
    borderWidth: 1,
    borderColor: "#cbd6df",
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff"
  },
  customerSearchIcon: { color: "#75818a", fontSize: 31 },
  customerSearchInput: { flex: 1, color: TEXT, fontSize: 22, padding: 0 },
  customerSearchButton: {
    width: 90,
    height: 66,
    borderWidth: 1,
    borderColor: BLUE,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff"
  },
  customerSearchButtonText: { color: BLUE, fontSize: 21, fontWeight: "900" },
  customerSegment: {
    height: 58,
    flexGrow: 1,
    minWidth: 560,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0e6ea",
    borderRadius: 8,
    padding: 4
  },
  customerSegmentItem: {
    height: 50,
    paddingHorizontal: 18,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center"
  },
  customerSegmentActive: {
    backgroundColor: "#fff",
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  customerSegmentText: { color: "#4a4f54", fontSize: 22, fontWeight: "500" },
  customerSegmentTextActive: { color: TEXT, fontWeight: "900" },
  customerSegmentDivider: { width: 1, height: 34, backgroundColor: "#b7c0c8" },
  customerCountTitle: { marginTop: 34, marginBottom: 28, color: TEXT, fontSize: 28, fontWeight: "900" },
  customerTable: { width: "100%" },
  customerTableHeader: {
    height: 58,
    backgroundColor: SOFT_BLUE,
    flexDirection: "row",
    alignItems: "center"
  },
  customerTh: { color: TEXT, fontSize: 22, fontWeight: "900", paddingHorizontal: 20 },
  customerApplicantCol: { width: 245 },
  customerPolicyNoCol: { width: 155 },
  customerPremiumCol: { width: 220 },
  customerPayStatusCol: { width: 175 },
  customerDueStatusCol: { flex: 1, minWidth: 0 },
  customerDataRow: { minHeight: 88, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#d8e0e5" },
  customerDataCell: { minHeight: 88, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  customerDataText: { minHeight: 88, paddingHorizontal: 14, color: TEXT, fontSize: 17, lineHeight: 24, textAlignVertical: "center" },
  customerDueText: { color: TEXT, fontSize: 16, lineHeight: 23, fontWeight: "700" },
  customerDueNote: { marginTop: 4, color: BLUE, fontSize: 14, lineHeight: 20 },
  customerDueBlocked: { color: "#a94747" },
  emptyCustomerState: {
    minHeight: 430,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyDocument: { width: 116, height: 98, marginBottom: 18, position: "relative" },
  emptyPaperBack: {
    position: "absolute",
    width: 54,
    height: 78,
    borderWidth: 1.5,
    borderColor: "#d9e1e8",
    backgroundColor: "#f8fbfd",
    left: 28,
    top: 12,
    transform: [{ rotate: "-12deg" }]
  },
  emptyPaperFront: {
    position: "absolute",
    width: 58,
    height: 82,
    borderWidth: 1.5,
    borderColor: "#cbd6df",
    backgroundColor: "#fff",
    left: 50,
    top: 8,
    transform: [{ rotate: "13deg" }]
  },
  emptyCustomerText: { color: "#aeb8c0", fontSize: 30, fontWeight: "900" },
  listContent: { padding: 32 },
  tabs: { flexDirection: "row", gap: 8 },
  tab: {
    height: 58,
    paddingHorizontal: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e8f1f6"
  },
  tabActive: { backgroundColor: "#fff" },
  tabText: { color: "#72797c", fontSize: 22, lineHeight: 26, fontWeight: "500" },
  tabActiveText: { color: "#007ac2", fontSize: 22, lineHeight: 26, fontWeight: "500" },
  listCard: {
    width: 1130,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 24,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2
  },
  toolbar: { width: 1082, height: 56, flexDirection: "row", alignItems: "center", gap: 16 },
  searchBox: {
    width: 390,
    height: 56,
    borderWidth: 1,
    borderColor: "#cbd6df",
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  searchIcon: { color: "#75818a", fontSize: 29 },
  searchInput: { flex: 1, fontSize: 22, lineHeight: 26, color: TEXT, padding: 0 },
  searchButton: {
    width: 69,
    height: 56,
    borderWidth: 1,
    borderColor: BLUE,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  searchButtonText: { color: "#007ac2", fontSize: 22, lineHeight: 26, fontWeight: "500" },
  filterLink: { height: 56, flexDirection: "row", alignItems: "center", gap: 7 },
  areaLink: { height: 56, marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 8 },
  filterIcon: { color: BLUE, fontSize: 26 },
  pinIcon: { color: BLUE, fontSize: 26 },
  filterText: { color: "#007ac2", fontSize: 22, lineHeight: 26, fontWeight: "500" },
  summaryGrid: { flexDirection: "row", gap: 18, marginTop: 27 },
  summaryTile: {
    flex: 1,
    height: 97,
    backgroundColor: "#eef8fd",
    borderColor: "#cbd6df",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 17,
    paddingVertical: 14
  },
  summaryTileActive: { borderColor: "#00a6e6", borderWidth: 3, backgroundColor: "#e2f7ff", paddingHorizontal: 15, paddingVertical: 12 },
  summaryTilePressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  summaryLabel: { color: "#3f464c", fontSize: 15, fontWeight: "900", marginBottom: 9 },
  summaryValue: { color: TEXT, fontSize: 22, fontWeight: "900" },
  sectionTitle: { height: 60, marginTop: 24, marginBottom: 8, color: "#393c3e", fontSize: 26, lineHeight: 32, fontWeight: "900", textAlignVertical: "center" },
  blueText: { color: "#00a0e3", fontWeight: "900" },
  table: { width: 1082 },
  tableHeader: { height: 64, flexDirection: "row", backgroundColor: "#e5f5fc", alignItems: "center" },
  th: { paddingHorizontal: 16, color: "#393c3e", fontSize: 22, lineHeight: 26, fontWeight: "500" },
  sortableHeader: {
    height: "100%",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  sortIcon: { color: "#66737c", fontSize: 18, fontWeight: "900" },
  sortIconActive: { color: BLUE },
  tableRow: { height: 100, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#d1d9dd" },
  td: { paddingHorizontal: 16, color: "#393c3e", fontSize: 18, lineHeight: 22 },
  customerCol: { width: 290 },
  policyCol: { width: 114 },
  periodCol: { width: 166 },
  premiumCol: { width: 92, textAlign: "right" },
  dueCol: { width: 128 },
  statusCol: { width: 117, alignItems: "center" },
  actionCol: { width: 175, alignItems: "center" },
  customerCell: { flexDirection: "row", alignItems: "center", gap: 12 },
  customerInfo: { flex: 1 },
  avatar: {
    backgroundColor: "#eaf7fc",
    borderColor: "#d6edf7",
    borderWidth: 1,
    overflow: "hidden",
    position: "relative"
  },
  avatarHairBack: {
    position: "absolute",
    width: 29,
    height: 34,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
    backgroundColor: "#171717",
    left: 12,
    top: 7
  },
  avatarHairBackFemale: {
    width: 34,
    height: 40,
    left: 9,
    top: 7,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14
  },
  avatarNeck: {
    position: "absolute",
    width: 9,
    height: 12,
    left: 22,
    top: 31,
    backgroundColor: "#f4c9ae"
  },
  avatarShirt: {
    position: "absolute",
    width: 43,
    height: 25,
    left: 5,
    bottom: -6,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: "#007eb9",
    borderTopWidth: 2,
    borderTopColor: "#fff"
  },
  avatarFace: {
    position: "absolute",
    width: 23,
    height: 28,
    left: 15,
    top: 11,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: "#f7d7c2"
  },
  avatarHair: {
    position: "absolute",
    width: 25,
    height: 12,
    left: 14,
    top: 8,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    backgroundColor: "#171717",
    transform: [{ rotate: "-4deg" }]
  },
  avatarHairFemale: {
    width: 29,
    height: 14,
    left: 12,
    top: 8,
    transform: [{ rotate: "0deg" }]
  },
  avatarFringe: {
    position: "absolute",
    width: 11,
    height: 13,
    left: 14,
    top: 10,
    borderBottomRightRadius: 10,
    backgroundColor: "#171717",
    transform: [{ rotate: "15deg" }]
  },
  avatarFringeFemale: {
    width: 15,
    left: 13,
    borderBottomRightRadius: 12,
    transform: [{ rotate: "8deg" }]
  },
  nameText: { color: TEXT, fontSize: 17, fontWeight: "900" },
  phoneLine: { marginTop: 7, flexDirection: "row", alignItems: "center", gap: 5 },
  phoneText: { color: MUTED, fontSize: 13 },
  statusPill: { minHeight: 30, borderRadius: 5, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  inlineStatus: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusWait: { backgroundColor: "#fff0c7" },
  statusAuto: { backgroundColor: "#f0e5ff" },
  statusText: { color: "#4a4f54", fontSize: 13, fontWeight: "900" },
  statusNote: { marginTop: 7, color: "#4a4f54", fontSize: 12, textAlign: "center" },
  payButton: {
    width: 96,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#0083c8",
    alignItems: "center",
    justifyContent: "center"
  },
  payButtonDisabled: { backgroundColor: "#edf0f2" },
  payButtonText: { color: "#fff", fontSize: 17, fontWeight: "900" },
  payButtonTextDisabled: { color: "#b1bac1" },
  pagination: { minHeight: 80, paddingTop: 28, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  paginationActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  paginationDisabled: { color: "#aeb8c0" },
  paginationText: { color: "#4b5563", fontSize: 14 },
  nextText: { color: BLUE, fontSize: 14, fontWeight: "900" },
  historyEmptyTable: {
    width: 1082,
    minHeight: 1064,
    backgroundColor: "#fff"
  },
  historySummary: { height: 86, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  historyAsOf: { color: "#7b858d", fontSize: 18, lineHeight: 24 },
  historyTableHeader: {
    width: 1082,
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e5f5fc",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8
  },
  historyTh: {
    paddingHorizontal: 16,
    color: "#393c3e",
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "500",
    textAlign: "center"
  },
  historyEmptyState: {
    width: 1082,
    minHeight: 366,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 64
  },
  historyEmptyText: {
    width: "100%",
    color: "#abb5ba",
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "500",
    textAlign: "center"
  },
  historyResultRow: {
    width: 1082,
    height: 100,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d9dd"
  },
  historyResultCell: { height: "100%", paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  historyResultName: { color: "#393c3e", fontSize: 18, lineHeight: 24, fontWeight: "700" },
  historyPhone: { color: MUTED, fontSize: 14 },
  historyResultText: { paddingHorizontal: 12, color: "#393c3e", fontSize: 18, lineHeight: 24, textAlign: "center" },
  historyStatus: { color: "#297a47", fontWeight: "700" },
  historyStatusPill: { minHeight: 34, borderRadius: 5, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  historyStatusPending: { backgroundColor: "#f1e6f8" },
  historyStatusSuccess: { backgroundColor: "#e1f8e5" },
  historyStatusText: { color: "#3f464c", fontSize: 14, lineHeight: 20, fontWeight: "700" },
  historyPagination: { minHeight: 78, paddingTop: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  historySelect: { color: "#3f464c", fontSize: 16, lineHeight: 24, backgroundColor: "#fff", borderColor: "#cbd6df", borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  historyDetailContent: { width: DESIGN_WIDTH, paddingHorizontal: 175, paddingTop: 32, paddingBottom: 48, gap: 24 },
  historyDetailCard: {
    width: 843,
    minHeight: 457,
    padding: 40,
    backgroundColor: "#fff",
    borderRadius: 8,
    shadowColor: "#2d3884",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2
  },
  historyDetailTitle: { color: "#393c3e", fontSize: 28, lineHeight: 38, fontWeight: "700", marginBottom: 28 },
  historyDetailSubtitle: { color: "#393c3e", fontSize: 23, lineHeight: 32, fontWeight: "700", marginBottom: 24 },
  historyLead: {
    width: 763,
    height: 104,
    padding: 16,
    gap: 24,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d9dd",
    borderRadius: 8
  },
  historyLeadName: { color: "#009cde", fontSize: 23, lineHeight: 32, fontWeight: "700" },
  historyLeadPolicy: { marginTop: 3, color: "#72797c", fontSize: 19, lineHeight: 28 },
  historyDetailRows: { width: 715, alignSelf: "center", gap: 18, marginTop: 27 },
  historyDetailLine: { width: "100%", minHeight: 30, flexDirection: "row", alignItems: "center", gap: 8 },
  historyDetailLabel: { width: 348, color: "#393c3e", fontSize: 19, lineHeight: 28 },
  historyDetailValue: { flex: 1, color: "#393c3e", fontSize: 19, lineHeight: 28, fontWeight: "600" },
  historyCopyValue: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  historyCopyText: { color: "#393c3e", fontSize: 19, lineHeight: 28, fontWeight: "600" },
  copyPressed: { opacity: 0.55 },
  copyDisabled: { opacity: 0.45 },
  toast: { position: "absolute", left: "50%", bottom: 42, transform: [{ translateX: -116 }], width: 232, minHeight: 48, paddingHorizontal: 18, borderRadius: 8, backgroundColor: "rgba(43, 52, 59, .94)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
  toastText: { color: "#fff", fontSize: 16, lineHeight: 22, fontWeight: "600" },
  historyCheckStatus: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 2, minHeight: 34 },
  historyCheckStatusIcon: { color: BLUE, fontSize: 28, lineHeight: 32 },
  historyCheckStatusText: { color: BLUE, fontSize: 19, lineHeight: 28, fontWeight: "600" },
  historyPaymentCard: { width: 843, minHeight: 488, padding: 40, backgroundColor: "#fff", borderRadius: 8, shadowColor: "#2d3884", shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  historyPaymentInfo: { width: 763, padding: 24, gap: 13, backgroundColor: "#f2fafd", borderRadius: 8 },
  historyPaymentInfoSpacing: { marginTop: 24 },
  historyPaymentHeadline: { minHeight: 46, flexDirection: "row", alignItems: "center", marginBottom: 7 },
  historyReceiptIcon: { width: 48, color: BLUE, fontSize: 28, textAlign: "center" },
  historyPaymentPeriod: { flex: 1, color: "#4a4f54", fontSize: 20, lineHeight: 28 },
  historyStrong: { fontWeight: "700" },
  historyPaymentAmount: { color: "#393c3e", fontSize: 22, lineHeight: 30, fontWeight: "700" },
  historyPaymentTotal: { width: 763, height: 78, marginTop: 24, borderRadius: 8, backgroundColor: "#e2f4fc", alignItems: "center", justifyContent: "center" },
  historyPaymentTotalText: { color: "#393c3e", fontSize: 25, lineHeight: 34, fontWeight: "700" },
  confirmContent: { padding: 16, paddingTop: 34, alignItems: "center", gap: 32 },
  confirmCard: {
    width: "100%",
    maxWidth: 900,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 38,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2
  },
  confirmHeading: { color: TEXT, fontSize: 31, fontWeight: "900", marginBottom: 32 },
  confirmSubheading: { color: TEXT, fontSize: 25, fontWeight: "900", marginBottom: 24 },
  insuredCard: { borderWidth: 1, borderColor: "#d5dde5", borderRadius: 8, padding: 18, flexDirection: "row", gap: 20, alignItems: "center", marginBottom: 28 },
  insuredInfo: { flex: 1 },
  insuredName: { color: "#00a0e3", fontSize: 23, fontWeight: "900", marginBottom: 8 },
  policyLine: { color: MUTED, fontSize: 18, lineHeight: 28 },
  detailGrid: { paddingHorizontal: 24, gap: 22 },
  detailRow: { width: "100%", minHeight: 32, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  detailLabel: { width: 360, color: "#666f77", fontSize: 19, lineHeight: 28 },
  detailValue: { flex: 1, color: "#4a4f54", fontSize: 19, lineHeight: 28, fontWeight: "900" },
  copyPhone: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  copyIcon: { color: "#007ac2", fontSize: 20, lineHeight: 28, fontWeight: "700" },
  dangerBadgeText: { backgroundColor: "#ffe9e6", alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6 },
  waitBadgeText: { backgroundColor: "#fff0c7", alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6 },
  paymentInfoCard: { width: "100%", maxWidth: 710, backgroundColor: "#fff", borderRadius: 8, padding: 34 },
  paymentInfoHeading: { color: TEXT, fontSize: 23, fontWeight: "900", marginBottom: 20 },
  installmentBox: { backgroundColor: "#eef9fd", borderRadius: 8, padding: 22, marginBottom: 18, gap: 12 },
  installmentRow: { width: "100%", minHeight: 26, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  installmentLabel: { width: 300, color: "#63717b", fontSize: 17, lineHeight: 24 },
  installmentValue: { flex: 1, color: "#3f464c", fontSize: 17, lineHeight: 24, fontWeight: "900" },
  inputLabel: { color: TEXT, fontSize: 18, fontWeight: "900" },
  required: { color: "#ef4444" },
  periodInput: { width: 250, height: 50, borderColor: "#d2dbe3", borderWidth: 1, borderRadius: 7, paddingHorizontal: 16, textAlign: "right", fontSize: 18, marginTop: 8 },
  hintText: { color: MUTED, fontSize: 15, marginTop: 8, marginBottom: 22 },
  totalCard: { width: "100%", maxWidth: 710, backgroundColor: "#fff", borderRadius: 8, padding: 30, alignItems: "center" },
  moreText: { color: BLUE, fontSize: 20, fontWeight: "900", marginBottom: 30 },
  totalBox: { width: "100%", backgroundColor: SOFT_BLUE, borderRadius: 8, padding: 22, alignItems: "center" },
  totalText: { color: TEXT, fontSize: 24, fontWeight: "900" },
  totalAmount: { color: "#00a0e3" },
  footerActions: { width: "100%", maxWidth: 710, flexDirection: "row", gap: 16 },
  secondaryAction: { flex: 1, height: 58, borderWidth: 1, borderColor: BLUE, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  primaryAction: { flex: 1, height: 58, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: BLUE },
  primaryActionDisabled: { backgroundColor: "#aeb8c0" },
  secondaryActionText: { color: BLUE, fontSize: 21, fontWeight: "900" },
  primaryActionText: { color: "#fff", fontSize: 21, fontWeight: "900" },
  qrPage: { width: DESIGN_WIDTH, paddingVertical: 32, alignItems: "center", gap: 24 },
  qrCard: {
    width: 620,
    paddingHorizontal: 54,
    paddingTop: 36,
    paddingBottom: 44,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8
  },
  qrBrand: { width: 92, height: 92, alignItems: "center", justifyContent: "center", backgroundColor: "#2583c5", marginBottom: 28 },
  qrBrandThai: { color: "#fff", fontSize: 26, lineHeight: 28, fontWeight: "700" },
  qrBrandLife: { color: "#fff", fontSize: 17, lineHeight: 20, fontWeight: "700", borderTopWidth: 2, borderTopColor: "#e94242" },
  qrHeading: { color: "#393c3e", fontSize: 30, lineHeight: 36, fontWeight: "700", marginBottom: 22 },
  qrExpiry: { marginTop: 24, color: "#393c3e", fontSize: 22, lineHeight: 26, fontWeight: "500" },
  qrTestBadge: { marginTop: 16, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: "#fff0c7" },
  qrTestBadgeText: { color: "#6b5600", fontSize: 16, fontWeight: "700" },
  qrDetails: { width: 500, marginTop: 26, gap: 12 },
  qrActions: { width: 620, flexDirection: "row", gap: 16 },
  drawerLayer: { flex: 1, flexDirection: "row", backgroundColor: "rgba(15, 34, 48, .58)" },
  drawer: { width: 360, height: "100%", paddingTop: 24, backgroundColor: "#fff" },
  drawerDismiss: { flex: 1 },
  drawerHeader: {
    height: 68,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e9ec"
  },
  drawerTitle: { color: "#393c3e", fontSize: 30, lineHeight: 36, fontWeight: "700" },
  drawerClose: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  drawerCloseText: { color: "#007ac2", fontSize: 34, lineHeight: 38 },
  drawerItems: { paddingVertical: 16, gap: 4 },
  drawerItem: {
    height: 58,
    marginHorizontal: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 8
  },
  drawerItemActive: { backgroundColor: "#e5f5fc" },
  drawerItemIcon: { width: 28, color: "#72797c", fontSize: 24, textAlign: "center" },
  drawerItemText: { color: "#393c3e", fontSize: 22, lineHeight: 26, fontWeight: "500" },
  drawerItemTextActive: { color: "#007ac2", fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15, 34, 48, .74)", alignItems: "center", justifyContent: "center", padding: 18 },
  areaModal: { width: "100%", maxWidth: 430, maxHeight: "92%", backgroundColor: "#fff", borderRadius: 8 },
  modalHeader: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { color: "#344054", fontSize: 18, fontWeight: "900" },
  modalClose: { color: "#38a3d1", fontSize: 30 },
  modalBody: { padding: 18, gap: 12 },
  fieldLabel: { color: "#4b5563", fontSize: 15, fontWeight: "900", marginTop: 4 },
  counter: { color: "#98a2b3", fontSize: 12 },
  provinceChoices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chipList: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { borderWidth: 1, borderColor: "#d7dde8", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "#fff" },
  chipSelected: { borderColor: BLUE, backgroundColor: "#eef9ff" },
  chipText: { color: "#667085", fontSize: 13, fontWeight: "800" },
  chipTextSelected: { color: BLUE },
  emptyArea: { minHeight: 145, alignItems: "center", justifyContent: "center" },
  emptyIcon: { color: BLUE, fontSize: 36, fontWeight: "900" },
  emptyText: { color: "#c4ccd5", fontSize: 15 },
  modalApply: { height: 46, borderRadius: 6, backgroundColor: BLUE, alignItems: "center", justifyContent: "center", marginTop: 8 },
  modalApplyText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  modalClear: { height: 34, alignItems: "center", justifyContent: "center" },
  modalClearText: { color: BLUE, fontSize: 14, fontWeight: "900" }
});
