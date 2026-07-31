import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {
  estimateBirthDate,
  findDuplicate,
  validateLead,
  validateNationalId,
} from "./src/domain/lead";
import { initialLeads, policyCustomers } from "./src/data/mockLeads";
import {
  policiesForMonthlyTarget,
  simulateCareer,
} from "./src/domain/careerSimulation";
import {
  APPLICATION_STEPS,
  completionByStep,
  evaluateDopaFailureAttempt,
  submitApplication,
  validateApplication,
} from "./src/domain/application";

const emptyLead = {
  firstName: "",
  lastName: "",
  gender: "",
  mobile: "",
  ageValue: "",
  ageUnit: "year",
  birthDate: "",
};

export default function App() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [leads, setLeads] = useState(initialLeads);
  const [screen, setScreen] = useState("list");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("new");
  const [form, setForm] = useState(emptyLead);
  const [errors, setErrors] = useState({});
  const [nationalId, setNationalId] = useState("");
  const [customer, setCustomer] = useState(null);
  const [selectedPolicy, setSelectedPolicy] = useState(0);
  const [notice, setNotice] = useState("");

  const filteredLeads = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return leads;
    return leads.filter((lead) =>
      `${lead.firstName} ${lead.lastName} ${lead.mobile} ${lead.id}`
        .toLowerCase()
        .includes(keyword),
    );
  }, [leads, query]);

  function openCreate() {
    setMode("new");
    setForm(emptyLead);
    setErrors({});
    setCustomer(null);
    setNationalId("");
    setNotice("");
    setScreen("create");
  }

  function changeAge(value) {
    setForm((current) => ({
      ...current,
      ageValue: value.replace(/\D/g, ""),
      birthDate: estimateBirthDate(value, current.ageUnit),
    }));
    setNotice(
      "ประมาณการวัน/เดือน/ปีเกิดเบื้องต้นจากข้อมูลอายุ กรุณาตรวจสอบ",
    );
  }

  function changeAgeUnit(ageUnit) {
    setForm((current) => ({
      ...current,
      ageUnit,
      birthDate: estimateBirthDate(current.ageValue, ageUnit),
    }));
  }

  function searchCustomer() {
    if (!validateNationalId(nationalId)) {
      setNotice("กรุณาระบุเลขบัตรประชาชนให้ครบ 13 หลัก กรุณาตรวจสอบและลองใหม่");
      setCustomer(null);
      return;
    }
    const found = policyCustomers[nationalId];
    setCustomer(found || null);
    setNotice(found ? "" : "ไม่พบข้อมูล");
  }

  function importCustomer() {
    setForm({ ...emptyLead, ...customer });
    setMode("new");
    setNotice("นำเข้าข้อมูลจากกรมธรรม์แล้ว กรุณาตรวจสอบก่อนบันทึก");
  }

  function saveLead() {
    const result = validateLead(form);
    setErrors(result.errors);
    if (!result.valid) return;
    const duplicate = findDuplicate(leads, result.lead, "AG-10001");
    if (duplicate) {
      Alert.alert(
        "พบข้อมูลซ้ำกับผู้มุ่งหวังของคุณ",
        "คุณต้องการอัปเดตข้อมูลเดิมหรือไม่?",
        [
          { text: "ยกเลิก", style: "cancel" },
          {
            text: "ยืนยัน",
            onPress: () => {
              setLeads((items) =>
                items.map((item) =>
                  item.id === duplicate.id
                    ? { ...item, ...result.lead, updatedAt: "เมื่อสักครู่" }
                    : item,
                ),
              );
              setNotice("อัปเดตข้อมูลสำเร็จ");
              setScreen("list");
            },
          },
        ],
      );
      return;
    }
    const id = `LD-${String(125 + leads.length).padStart(6, "0")}`;
    setLeads((items) => [
      {
        ...result.lead,
        id,
        saleId: "AG-10001",
        status: customer ? "ลูกค้า" : "ใหม่",
        pdpa: "ยังไม่ยินยอม",
        updatedAt: "เมื่อสักครู่",
      },
      ...items,
    ]);
    setNotice("เพิ่มผู้มุ่งหวังสำเร็จ");
    setScreen("list");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8faf9" />
      <View style={styles.shell}>
        {wide && (
          <Sidebar
            onCreate={openCreate}
            screen={screen}
            onNavigate={setScreen}
          />
        )}
        <View style={styles.main}>
          <TopBar wide={wide} />
          {!wide && (
            <View style={styles.mobileModules}>
              <Pressable onPress={() => setScreen("list")} style={[styles.mobileModule, screen !== "career" && styles.mobileModuleActive]}>
                <Text style={[styles.mobileModuleText, screen !== "career" && styles.mobileModuleTextActive]}>ผู้มุ่งหวัง</Text>
              </Pressable>
              <Pressable onPress={() => setScreen("career")} style={[styles.mobileModule, screen === "career" && styles.mobileModuleActive]}>
                <Text style={[styles.mobileModuleText, screen === "career" && styles.mobileModuleTextActive]}>วางแผนอาชีพ</Text>
              </Pressable>
              <Pressable onPress={() => setScreen("applications")} style={[styles.mobileModule, screen === "applications" && styles.mobileModuleActive]}>
                <Text style={[styles.mobileModuleText, screen === "applications" && styles.mobileModuleTextActive]}>ใบคำขอ</Text>
              </Pressable>
            </View>
          )}
          {screen === "applications" ? (
            <Applications />
          ) : screen === "career" ? (
            <CareerPlanning />
          ) : screen === "list" ? (
            <LeadList
              leads={filteredLeads}
              query={query}
              setQuery={setQuery}
              onCreate={openCreate}
              notice={notice}
            />
          ) : (
            <CreateLead
              mode={mode}
              setMode={setMode}
              form={form}
              setForm={setForm}
              errors={errors}
              onAgeChange={changeAge}
              onAgeUnitChange={changeAgeUnit}
              onCancel={() => setScreen("list")}
              onSave={saveLead}
              nationalId={nationalId}
              setNationalId={setNationalId}
              onSearchCustomer={searchCustomer}
              customer={customer}
              selectedPolicy={selectedPolicy}
              setSelectedPolicy={setSelectedPolicy}
              onImportCustomer={importCustomer}
              notice={notice}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function Sidebar({ onCreate, screen, onNavigate }) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <View style={styles.brandMark}><Text style={styles.brandLetter}>TL</Text></View>
        <View><Text style={styles.brandName}>TL Smart</Text><Text style={styles.brandSub}>Sales workspace</Text></View>
      </View>
      <Text style={styles.menuLabel}>เมนูหลัก</Text>
      <NavItem icon="⌂" label="ภาพรวม" />
      <NavItem icon="♙" label="ผู้มุ่งหวัง" active={screen === "list" || screen === "create"} onPress={() => onNavigate("list")} />
      <NavItem icon="▤" label="ใบเสนอขาย" />
      <NavItem icon="◫" label="ใบคำขอ" active={screen === "applications"} onPress={() => onNavigate("applications")} />
      <Text style={[styles.menuLabel, { marginTop: 20 }]}>AGENT SUPER APP</Text>
      <NavItem icon="◎" label="วางแผนอาชีพ" active={screen === "career"} onPress={() => onNavigate("career")} />
      <Pressable style={styles.quickCreate} onPress={onCreate}>
        <Text style={styles.quickCreateText}>＋ เพิ่มผู้มุ่งหวัง</Text>
      </Pressable>
      <View style={styles.agentCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>ศภ</Text></View>
        <View><Text style={styles.agentName}>ศุภชัย หาญกล้า</Text><Text style={styles.agentCode}>AG-10001 · ตัวแทน</Text></View>
      </View>
    </View>
  );
}

function NavItem({ icon, label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.navItem, active && styles.navActive]}>
      <Text style={[styles.navIcon, active && styles.navActiveText]}>{icon}</Text>
      <Text style={[styles.navText, active && styles.navActiveText]}>{label}</Text>
    </Pressable>
  );
}

function TopBar({ wide }) {
  return (
    <View style={styles.topbar}>
      {!wide && <Text style={styles.mobileBrand}>TL Smart</Text>}
      <View style={styles.environment}><View style={styles.onlineDot} /><Text style={styles.environmentText}>Demo environment</Text></View>
      <View style={styles.topAvatar}><Text style={styles.topAvatarText}>ศภ</Text></View>
    </View>
  );
}

function LeadList({ leads, query, setQuery, onCreate, notice }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headingRow}>
        <View><Text style={styles.eyebrow}>LEAD & PROSPECT</Text><Text style={styles.title}>ผู้มุ่งหวังของฉัน</Text><Text style={styles.subtitle}>ค้นหา ติดตาม และดูแลทุกโอกาสการขายในที่เดียว</Text></View>
        <Pressable style={styles.primaryButton} onPress={onCreate}><Text style={styles.primaryButtonText}>＋ เพิ่มผู้มุ่งหวัง</Text></Pressable>
      </View>
      {notice ? <View style={styles.successBanner}><Text style={styles.successText}>✓ {notice}</Text></View> : null}
      <View style={styles.metrics}>
        <Metric value={leads.length} label="ผู้มุ่งหวังทั้งหมด" tone="green" />
        <Metric value={leads.filter((x) => x.status === "ใหม่").length} label="เพิ่มใหม่วันนี้" tone="blue" />
        <Metric value={leads.filter((x) => x.pdpa === "ยังไม่ยินยอม").length} label="รอความยินยอม PDPA" tone="amber" />
      </View>
      <View style={styles.card}>
        <View style={styles.listToolbar}>
          <TextInput style={styles.search} placeholder="ค้นหาชื่อ เบอร์โทร หรือรหัสผู้มุ่งหวัง" value={query} onChangeText={setQuery} />
          <Pressable style={styles.filterButton}><Text style={styles.filterText}>ตัวกรอง  ⌄</Text></Pressable>
        </View>
        {leads.map((lead) => <LeadRow key={lead.id} lead={lead} />)}
        {!leads.length && <Text style={styles.empty}>ไม่พบข้อมูลผู้มุ่งหวัง</Text>}
      </View>
    </ScrollView>
  );
}

function Metric({ value, label, tone }) {
  return <View style={[styles.metric, styles[`${tone}Metric`]]}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function LeadRow({ lead }) {
  return (
    <View style={styles.leadRow}>
      <View style={styles.profileIcon}><Text style={styles.profileText}>{lead.firstName[0]}</Text></View>
      <View style={styles.leadMain}><Text style={styles.leadName}>{lead.firstName} {lead.lastName}</Text><Text style={styles.leadMeta}>{lead.id} · {lead.mobile || "ไม่ระบุเบอร์โทร"}</Text></View>
      <View style={styles.leadStatus}><Text style={styles.statusPill}>{lead.status}</Text><Text style={styles.updated}>{lead.updatedAt}</Text></View>
      <Text style={styles.chevron}>›</Text>
    </View>
  );
}

function CreateLead(props) {
  const { mode, setMode, form, setForm, errors, onAgeChange, onAgeUnitChange, onCancel, onSave, nationalId, setNationalId, onSearchCustomer, customer, selectedPolicy, setSelectedPolicy, onImportCustomer, notice } = props;
  return (
    <ScrollView contentContainerStyle={styles.formContent}>
      <Pressable onPress={onCancel}><Text style={styles.back}>‹ กลับไปหน้าผู้มุ่งหวัง</Text></Pressable>
      <Text style={styles.eyebrow}>ADD_TLL · SPRINT 1</Text>
      <Text style={styles.title}>เพิ่มผู้มุ่งหวัง</Text>
      <Text style={styles.subtitle}>สร้างข้อมูลใหม่ หรือค้นหาลูกค้าเดิมจากเลขบัตรประชาชน</Text>
      <View style={styles.modeTabs}>
        <Pressable onPress={() => setMode("new")} style={[styles.modeTab, mode === "new" && styles.modeTabActive]}><Text style={[styles.modeText, mode === "new" && styles.modeTextActive]}>เพิ่มผู้มุ่งหวังใหม่</Text></Pressable>
        <Pressable onPress={() => setMode("nationalId")} style={[styles.modeTab, mode === "nationalId" && styles.modeTabActive]}><Text style={[styles.modeText, mode === "nationalId" && styles.modeTextActive]}>ค้นหาจากเลขบัตรประชาชน</Text></Pressable>
      </View>
      {notice ? <View style={styles.notice}><Text style={styles.noticeText}>{notice}</Text></View> : null}
      {mode === "nationalId" ? (
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>ค้นหาข้อมูลลูกค้าเดิม</Text>
          <Text style={styles.fieldLabel}>เลขประจำตัวประชาชน 13 หลัก</Text>
          <View style={styles.inline}>
            <TextInput style={[styles.input, styles.flex]} keyboardType="number-pad" maxLength={13} value={nationalId} onChangeText={(v) => setNationalId(v.replace(/\D/g, ""))} placeholder="x-xxxx-xxxxx-xx-x" />
            <Pressable style={styles.secondaryButton} onPress={onSearchCustomer}><Text style={styles.secondaryButtonText}>ค้นหา</Text></Pressable>
          </View>
          {customer && (
            <View style={styles.customerResult}>
              <Text style={styles.customerName}>{customer.firstName} {customer.lastName}</Text>
              <Text style={styles.leadMeta}>พบ {customer.policies.length} กรมธรรม์ · เรียงล่าสุดก่อน</Text>
              {customer.policies.map((policy, index) => (
                <Pressable key={policy.policyNo} style={[styles.policy, selectedPolicy === index && styles.policySelected]} onPress={() => setSelectedPolicy(index)}>
                  <View style={styles.radio}>{selectedPolicy === index && <View style={styles.radioInner} />}</View>
                  <View style={styles.flex}><Text style={styles.policyName}>{policy.planName}</Text><Text style={styles.leadMeta}>{policy.policyNo} · ออกเมื่อ {policy.issuedAt} · {policy.occupation}</Text></View>
                </Pressable>
              ))}
              <Pressable style={styles.primaryButtonFull} onPress={onImportCustomer}><Text style={styles.primaryButtonText}>เลือกข้อมูลและเพิ่มรายชื่อ</Text></Pressable>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>ข้อมูลเบื้องต้น</Text>
          <View style={styles.formGrid}>
            <Field label="ชื่อ *" value={form.firstName} onChangeText={(firstName) => setForm({ ...form, firstName })} error={errors.firstName} placeholder="ระบุชื่อ" />
            <Field label="นามสกุล" value={form.lastName} onChangeText={(lastName) => setForm({ ...form, lastName })} placeholder="ระบุนามสกุล" />
          </View>
          <Text style={styles.fieldLabel}>เพศ *</Text>
          <View style={styles.segment}>
            {["ชาย", "หญิง"].map((gender) => <Pressable key={gender} style={[styles.segmentButton, form.gender === gender && styles.segmentActive]} onPress={() => setForm({ ...form, gender })}><Text style={[styles.segmentText, form.gender === gender && styles.segmentTextActive]}>{gender}</Text></Pressable>)}
          </View>
          {errors.gender && <Text style={styles.error}>{errors.gender}</Text>}
          <Field label="เบอร์โทรศัพท์มือถือ" value={form.mobile} keyboardType="phone-pad" maxLength={10} onChangeText={(mobile) => setForm({ ...form, mobile: mobile.replace(/\D/g, "") })} error={errors.mobile} placeholder="08x-xxx-xxxx" />
          <View style={styles.formGrid}>
            <View style={styles.flex}>
              <Text style={styles.fieldLabel}>อายุ *</Text>
              <TextInput style={[styles.input, errors.ageValue && styles.inputError]} keyboardType="number-pad" value={form.ageValue} onChangeText={onAgeChange} placeholder="ระบุอายุ" />
              {errors.ageValue && <Text style={styles.error}>{errors.ageValue}</Text>}
            </View>
            <View style={styles.flex}>
              <Text style={styles.fieldLabel}>หน่วยอายุ</Text>
              <View style={styles.segment}>
                {[["year", "ปี"], ["month", "เดือน"]].map(([value, label]) => <Pressable key={value} style={[styles.segmentButton, form.ageUnit === value && styles.segmentActive]} onPress={() => onAgeUnitChange(value)}><Text style={[styles.segmentText, form.ageUnit === value && styles.segmentTextActive]}>{label}</Text></Pressable>)}
              </View>
            </View>
          </View>
          <Field label="วัน/เดือน/ปีเกิด (ประมาณการ)" value={form.birthDate} onChangeText={(birthDate) => setForm({ ...form, birthDate })} placeholder="YYYY-MM-DD" />
          <View style={styles.formActions}>
            <Pressable style={styles.cancelButton} onPress={onCancel}><Text style={styles.cancelText}>ยกเลิก</Text></Pressable>
            <Pressable style={styles.primaryButton} onPress={onSave}><Text style={styles.primaryButtonText}>บันทึกข้อมูล</Text></Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Field({ label, error, ...inputProps }) {
  return <View style={styles.flex}><Text style={styles.fieldLabel}>{label}</Text><TextInput style={[styles.input, error && styles.inputError]} {...inputProps} />{error && <Text style={styles.error}>{error}</Text>}</View>;
}

const applicationSeed = {
  quotationNo: "QT-2026-000184",
  productName: "ทีแอล ยูนิเวอร์แซลไลฟ์ 90/90",
  premium: 50000,
  insured: {
    prefix: "นางสาว",
    firstName: "พิมพ์ชนก",
    lastName: "วัฒนา",
    gender: "หญิง",
    birthDate: "12 มิ.ย. 2533",
    age: "36 ปี",
    identityType: "บัตรประจำตัวประชาชน",
    nationalId: "1103700123456",
    height: "165",
    weight: "52",
    nationality: "ไทย",
    mobile: "0891234567",
    email: "pimchanok@example.com",
    hasFormerName: false,
    formerFirstName: "",
    formerLastName: "",
    maritalStatus: "โสด",
    spousePrefix: "",
    spouseFirstName: "",
    spouseLastName: "",
    additionalHealth: "ไม่มี / สุขภาพแข็งแรง",
    additionalHealthDetail: "",
    selectedAddressType: "ทะเบียนบ้าน",
    addresses: {
      "ทะเบียนบ้าน": { houseNo: "99/9", villageNo: "4", village: "", building: "", floor: "", room: "", alley: "", soi: "สุขุมวิท 24", road: "สุขุมวิท", subdistrict: "คลองตัน", district: "คลองเตย", province: "กรุงเทพมหานคร", postalCode: "10110", homePhone: "" },
      "ปัจจุบัน": { houseNo: "99/9", villageNo: "4", village: "", building: "", floor: "", room: "", alley: "", soi: "สุขุมวิท 24", road: "สุขุมวิท", subdistrict: "คลองตัน", district: "คลองเตย", province: "กรุงเทพมหานคร", postalCode: "10110", homePhone: "" },
      "ที่ทำงาน": { houseNo: "123", villageNo: "", village: "", building: "อาคารไทยประกันชีวิต", floor: "18", room: "", alley: "", soi: "รัชดาภิเษก 18", road: "รัชดาภิเษก", subdistrict: "ห้วยขวาง", district: "ห้วยขวาง", province: "กรุงเทพมหานคร", postalCode: "10310", homePhone: "022470247" },
      "สถานที่ติดต่อ": { houseNo: "99/9", villageNo: "4", village: "", building: "", floor: "", room: "", alley: "", soi: "สุขุมวิท 24", road: "สุขุมวิท", subdistrict: "คลองตัน", district: "คลองเตย", province: "กรุงเทพมหานคร", postalCode: "10110", homePhone: "" },
    },
    occupation: "พนักงานบริษัท",
    jobDescription: "บริหารโครงการระบบสารสนเทศ",
    position: "ผู้จัดการโครงการ",
    annualIncome: "1200000",
    businessType: "เทคโนโลยีสารสนเทศ",
    dopaStatus: "UNAVAILABLE",
    dopaMessageCode: "MSG_0025",
  },
  payerGuardian: {
    planName: "ทีแอล ยูนิเวอร์แซลไลฟ์ 90/90",
    premiumMode: "รายปี",
    sumAssured: 1000000,
    payer: {
      type: "บุคคลธรรมดา (ชาวไทย)",
      relation: "ผู้ขอเอาประกัน",
      prefix: "นางสาว",
      firstName: "พิมพ์ชนก",
      lastName: "วัฒนา",
      birthDate: "12 มิ.ย. 2533",
      gender: "หญิง",
      nationalId: "1103700123456",
      mobile: "0891234567",
      dopaStatus: "UNAVAILABLE",
    },
    guardianRequired: true,
    guardian: {
      relation: "บิดา",
      prefix: "นาย",
      firstName: "ภูรเนศ",
      lastName: "รุ่งปัญญากิจพัฒน์",
      gender: "ชาย",
      nationalId: "1234567890121",
      birthDate: "15 มี.ค. 2503",
    },
  },
  beneficiaries: [{
    type: "บุคคล",
    prefix: "นาย",
    firstName: "ธนกฤต",
    lastName: "วัฒนา",
    gender: "ชาย",
    birthDate: "10 ม.ค. 2531",
    age: "38",
    relation: "คู่สมรส",
    nationalId: "1103700123999",
    sumAssuredShare: 100,
    accountValueShare: 100,
    addressType: "ตามที่อยู่ปัจจุบัน",
  }],
  health: { answered: false, hasCondition: false },
  documents: { identityCard: false, addressDocument: false },
  signature: {
    insured: false,
    agent: false,
    purpose: "บริษัท ไทยประกันชีวิต จำกัด (มหาชน)",
    guardianRelation: "บิดา",
    guardianGender: "ชาย",
    guardianPrefix: "นาย",
    guardianFirstName: "ภูรเนศ",
    guardianLastName: "รุ่งปัญญากิจพัฒน์",
    guardianBirthDate: "15 มี.ค. 2503",
    guardianDocumentType: "บัตรประชาชน",
    guardianNationalId: "1234567890121",
    guardianNationality: "ไทย",
    witnessPrefix: "นาย",
    witnessFirstName: "พีรณย์",
    witnessLastName: "ใจว่องกิจวัฒนา",
  },
  payment: { method: "" },
};

function Applications() {
  const [view, setView] = useState("list");
  const [activeStep, setActiveStep] = useState(0);
  const [application, setApplication] = useState(applicationSeed);
  const [submitResult, setSubmitResult] = useState(null);
  const [dopaModalVisible, setDopaModalVisible] = useState(false);
  const [dopaPendingAction, setDopaPendingAction] = useState(null);
  const [dopaAttemptCount, setDopaAttemptCount] = useState(0);
  const [applicationToast, setApplicationToast] = useState("");
  const completion = completionByStep(application);
  const validation = validateApplication(application);
  const completedCount = completion.filter((item) => item.complete).length;

  function update(section, patch) {
    setApplication((current) => ({
      ...current,
      [section]: { ...current[section], ...patch },
    }));
    setSubmitResult(null);
  }

  function submit() {
    const result = submitApplication(application);
    setSubmitResult(result);
    if (result.ok) {
      Alert.alert("ส่งใบคำขอแล้ว", `เลขที่ ${result.applicationNo}`);
      setView("list");
    }
  }

  function requestDopaCheckedAction(action) {
    if (activeStep === 1 && application.payerGuardian.payer.dopaStatus === "UNAVAILABLE") {
      const transition = evaluateDopaFailureAttempt(dopaAttemptCount, action);
      setDopaAttemptCount(transition.nextAttemptCount);
      if (transition.showModal) {
        setDopaPendingAction(transition.pendingAction);
        setDopaModalVisible(true);
        return;
      }
    }
    if (action === "save") {
      setApplicationToast("บันทึกข้อมูลสำเร็จ");
      return;
    }
    setApplicationToast("");
    setActiveStep((current) => Math.min(APPLICATION_STEPS.length - 1, current + 1));
  }

  function acknowledgeDopaFailure() {
    const action = dopaPendingAction;
    setDopaModalVisible(false);
    setDopaPendingAction(null);
    if (action === "save") {
      setApplicationToast("บันทึกข้อมูลสำเร็จ");
      return;
    }
    if (action === "next") {
      setActiveStep((current) => Math.min(APPLICATION_STEPS.length - 1, current + 1));
    }
  }

  if (view === "list") {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headingRow}>
          <View><Text style={styles.eyebrow}>E-APPLICATION</Text><Text style={styles.title}>ใบคำขอเอาประกัน</Text><Text style={styles.subtitle}>สร้าง ตรวจสอบ และติดตามการนำส่งใบคำขอ</Text></View>
          <Pressable style={styles.primaryButton} onPress={() => setView("form")}><Text style={styles.primaryButtonText}>＋ สร้างใบคำขอ</Text></Pressable>
        </View>
        <View style={styles.metrics}>
          <Metric value="3" label="ฉบับร่าง" tone="amber" />
          <Metric value="8" label="รอนำส่ง/พิจารณา" tone="blue" />
          <Metric value="12" label="อนุมัติเดือนนี้" tone="green" />
        </View>
        <View style={styles.card}>
          <View style={styles.applicationHeaderRow}>
            <Text style={styles.applicationHeaderText}>รายการล่าสุด</Text>
            <Text style={styles.applicationHeaderText}>สถานะ</Text>
          </View>
          <Pressable style={styles.applicationRow} onPress={() => setView("form")}>
            <View style={styles.applicationIcon}><Text style={styles.applicationIconText}>พว</Text></View>
            <View style={styles.flex}>
              <Text style={styles.leadName}>พิมพ์ชนก วัฒนา</Text>
              <Text style={styles.leadMeta}>ฉบับร่าง · {application.quotationNo}</Text>
              <Text style={styles.leadMeta}>{application.productName}</Text>
            </View>
            <View style={styles.applicationProgress}>
              <Text style={styles.statusPill}>{completedCount}/{APPLICATION_STEPS.length} ขั้นตอน</Text>
              <View style={styles.miniTrack}><View style={[styles.miniBar, { width: `${(completedCount / APPLICATION_STEPS.length) * 100}%` }]} /></View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <View style={styles.applicationRow}>
            <View style={[styles.applicationIcon, { backgroundColor: "#eaf1fa" }]}><Text style={[styles.applicationIconText, { color: "#326ba5" }]}>ธช</Text></View>
            <View style={styles.flex}><Text style={styles.leadName}>ธนกฤต ชัยพร</Text><Text style={styles.leadMeta}>APP-2026-001582 · ตลอดชีพ 99/20</Text></View>
            <Text style={[styles.statusPill, { color: "#376d9e", backgroundColor: "#eaf3fb" }]}>กำลังพิจารณา</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.applicationContent}>
      {applicationToast && <View style={styles.applicationToast}><Text style={styles.applicationToastText}>✓ {applicationToast}</Text></View>}
      <Modal transparent animationType="fade" visible={dopaModalVisible} onRequestClose={() => {}}>
        <View style={styles.modalBackdrop}>
          <View style={styles.dopaModal}>
            <View style={styles.dopaModalIcon}><Text style={styles.dopaModalIconText}>!</Text></View>
            <Text style={styles.dopaModalTitle}>ไม่สามารถดำเนินการต่อได้</Text>
            <Text style={styles.dopaModalMessage}>ระบบไม่สามารถเชื่อมต่อกับฐานข้อมูล{"\n"}กรมการปกครอง (DOPA) ได้{"\n"}กรุณาดำเนินการใหม่อีกครั้ง</Text>
            <Pressable style={styles.dopaModalButton} onPress={acknowledgeDopaFailure}>
              <Text style={styles.dopaModalButtonText}>ตกลง</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Pressable onPress={() => setView("list")}><Text style={styles.back}>‹ กลับไปรายการใบคำขอ</Text></Pressable>
      <View style={styles.headingRow}>
        <View><Text style={styles.eyebrow}>APPLICATION DRAFT</Text><Text style={styles.title}>ใบคำขอของพิมพ์ชนก วัฒนา</Text><Text style={styles.subtitle}>{application.quotationNo} · {application.productName}</Text></View>
        <View style={styles.draftPill}><Text style={styles.draftPillText}>บันทึกร่างอัตโนมัติ</Text></View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.applicationStepper}>
        {completion.map((item, index) => (
          <Pressable key={item.key} onPress={() => setActiveStep(index)} style={[styles.applicationStep, activeStep === index && styles.applicationStepActive]}>
            <View style={[styles.applicationStepCircle, item.complete && styles.applicationStepComplete, activeStep === index && styles.applicationStepCurrent]}>
              <Text style={[styles.applicationStepNumber, (item.complete || activeStep === index) && { color: "white" }]}>{item.complete ? "✓" : index + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, activeStep === index && styles.stepLabelActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.applicationLayout}>
        <View style={styles.applicationForm}>
          <ApplicationStep
            index={activeStep}
            application={application}
            update={update}
            setApplication={setApplication}
          />
          <View style={styles.formActions}>
            {activeStep > 0 && <Pressable style={styles.cancelButton} onPress={() => setActiveStep(activeStep - 1)}><Text style={styles.cancelText}>ย้อนกลับ</Text></Pressable>}
            <Pressable style={styles.saveOutlineButton} onPress={() => requestDopaCheckedAction("save")}><Text style={styles.saveOutlineButtonText}>บันทึกข้อมูล</Text></Pressable>
            {activeStep < APPLICATION_STEPS.length - 1
              ? <Pressable style={styles.applicationNextButton} onPress={() => requestDopaCheckedAction("next")}><Text style={styles.applicationNextButtonText}>ถัดไป  ›</Text></Pressable>
              : <Pressable style={styles.primaryButton} onPress={submit}><Text style={styles.primaryButtonText}>ตรวจสอบและส่งใบคำขอ</Text></Pressable>}
          </View>
        </View>
        <View style={styles.applicationSummary}>
          <Text style={styles.sectionTitle}>ความพร้อมของใบคำขอ</Text>
          <View style={styles.readinessScore}><Text style={styles.readinessValue}>{Math.round((completedCount / APPLICATION_STEPS.length) * 100)}%</Text><Text style={styles.readinessLabel}>{completedCount} จาก {APPLICATION_STEPS.length} ขั้นตอน</Text></View>
          {completion.map((item) => <View key={item.key} style={styles.checkRow}><Text style={[styles.checkIcon, item.complete && styles.checkIconComplete]}>{item.complete ? "✓" : "○"}</Text><Text style={styles.checkLabel}>{item.label}</Text></View>)}
          {!validation.valid && <View style={styles.missingBox}><Text style={styles.missingTitle}>ข้อมูลที่ยังไม่ครบ</Text>{validation.missing.slice(0, 4).map((item) => <Text key={item} style={styles.missingItem}>• {item}</Text>)}</View>}
          {submitResult && !submitResult.ok && <Text style={styles.error}>กรุณาระบุข้อมูลให้ครบก่อนส่งใบคำขอ</Text>}
          <View style={styles.prototypeWarning}><Text style={styles.prototypeWarningText}>MVP นี้จำลองการบันทึกและส่งรายการ ยังไม่เชื่อม Core, Document, Signature หรือ Payment Gateway จริง</Text></View>
        </View>
      </View>
    </ScrollView>
  );
}

function ApplicationStep({ index, application, update, setApplication }) {
  function updateAddress(patch) {
    setApplication((current) => {
      const type = current.insured.selectedAddressType;
      return {
        ...current,
        insured: {
          ...current.insured,
          addresses: {
            ...current.insured.addresses,
            [type]: { ...current.insured.addresses[type], ...patch },
          },
        },
      };
    });
  }

  function updateBeneficiary(index, patch) {
    setApplication((current) => ({
      ...current,
      beneficiaries: current.beneficiaries.map((item, itemIndex) => (
        itemIndex === index ? { ...item, ...patch } : item
      )),
    }));
  }

  function addBeneficiary() {
    setApplication((current) => {
      if (current.beneficiaries.length >= 10) return current;
      return {
        ...current,
        beneficiaries: [...current.beneficiaries, {
          type: "บุคคล",
          prefix: "",
          firstName: "",
          lastName: "",
          gender: "",
          birthDate: "",
          age: "",
          relation: "",
          nationalId: "",
          sumAssuredShare: 0,
          accountValueShare: 0,
          addressType: "ตามที่อยู่ทะเบียนบ้าน",
        }],
      };
    });
  }

  function removeBeneficiary(index) {
    setApplication((current) => (
      current.beneficiaries.length === 1
        ? current
        : { ...current, beneficiaries: current.beneficiaries.filter((_, itemIndex) => itemIndex !== index) }
    ));
  }

  if (index === 0) {
    const insured = application.insured;
    const address = insured.addresses[insured.selectedAddressType];
    return (
      <View style={styles.insuredCard}>
        <Text style={styles.eyebrow}>STEP 1 · APPLICATION LV V10</Text>
        <Text style={styles.insuredPageTitle}>ข้อมูลผู้ขอเอาประกันภัย</Text>

        <ApplicationSection title="ข้อมูลส่วนบุคคล" subtitle="ข้อมูลจากผู้มุ่งหวังและใบเสนอขายแสดงแบบอ่านอย่างเดียว">
          <View style={styles.insuredGrid}>
            <Field label="คำนำหน้า" editable={false} value={insured.prefix} />
            <Field label="ชื่อ" editable={false} value={insured.firstName} />
            <Field label="นามสกุล" editable={false} value={insured.lastName} />
            <Field label="เพศ" editable={false} value={insured.gender} />
            <Field label="วัน/เดือน/ปีเกิด" editable={false} value={insured.birthDate} />
            <Field label="อายุ" editable={false} value={insured.age} />
            <Field label="เอกสารยืนยันตัวตน" editable={false} value={insured.identityType} />
            <Field label="เลขประจำตัวประชาชน" editable={false} value={insured.nationalId} />
            <Field label="ส่วนสูง (ซม.) *" keyboardType="number-pad" value={insured.height} onChangeText={(height) => update("insured", { height: height.replace(/\D/g, "") })} />
            <Field label="น้ำหนัก (กก.) *" keyboardType="number-pad" value={insured.weight} onChangeText={(weight) => update("insured", { weight: weight.replace(/\D/g, "") })} />
            <Field label="สัญชาติ *" value={insured.nationality} onChangeText={(nationality) => update("insured", { nationality })} />
            <Field label="เบอร์มือถือ *" maxLength={10} keyboardType="phone-pad" value={insured.mobile} onChangeText={(mobile) => update("insured", { mobile: mobile.replace(/\D/g, "") })} />
            <Field label="อีเมล *" keyboardType="email-address" value={insured.email} onChangeText={(email) => update("insured", { email })} />
          </View>
        </ApplicationSection>

        <ApplicationSection title="ประวัติชื่อและสถานภาพ">
          <Text style={styles.fieldLabel}>เคยเปลี่ยนชื่อ–นามสกุลหรือไม่ *</Text>
          <View style={styles.radioRow}>
            {[["ไม่เคย", false], ["เคย", true]].map(([label, value]) => (
              <Pressable key={label} style={styles.radioOption} onPress={() => update("insured", { hasFormerName: value })}>
                <View style={[styles.radioCircle, insured.hasFormerName === value && styles.radioCircleSelected]}>
                  {insured.hasFormerName === value && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.radioLabel}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {insured.hasFormerName && (
            <View style={styles.insuredGrid}>
              <Field label="ชื่อเดิม *" value={insured.formerFirstName} onChangeText={(formerFirstName) => update("insured", { formerFirstName })} />
              <Field label="นามสกุลเดิม *" value={insured.formerLastName} onChangeText={(formerLastName) => update("insured", { formerLastName })} />
            </View>
          )}
          <Text style={styles.fieldLabel}>สถานภาพ *</Text>
          <View style={styles.choiceRow}>
            {["โสด", "สมรส", "หย่า", "หม้าย"].map((status) => (
              <Pressable key={status} style={[styles.choiceButton, insured.maritalStatus === status && styles.choiceButtonActive]} onPress={() => update("insured", { maritalStatus: status })}>
                <Text style={[styles.choiceButtonText, insured.maritalStatus === status && styles.choiceButtonTextActive]}>{status}</Text>
              </Pressable>
            ))}
          </View>
          {insured.maritalStatus === "สมรส" && (
            <View style={styles.insuredGrid}>
              <Field label="คำนำหน้าคู่สมรส" value={insured.spousePrefix} onChangeText={(spousePrefix) => update("insured", { spousePrefix })} />
              <Field label="ชื่อคู่สมรส" value={insured.spouseFirstName} onChangeText={(spouseFirstName) => update("insured", { spouseFirstName })} />
              <Field label="นามสกุลคู่สมรส" value={insured.spouseLastName} onChangeText={(spouseLastName) => update("insured", { spouseLastName })} />
            </View>
          )}
          <Text style={styles.fieldLabel}>รายละเอียดเพิ่มเติม *</Text>
          <View style={styles.choiceRow}>
            {["ไม่มี / สุขภาพแข็งแรง", "มี"].map((value) => (
              <Pressable key={value} style={[styles.choiceButton, insured.additionalHealth === value && styles.choiceButtonActive]} onPress={() => update("insured", { additionalHealth: value })}>
                <Text style={[styles.choiceButtonText, insured.additionalHealth === value && styles.choiceButtonTextActive]}>{value}</Text>
              </Pressable>
            ))}
          </View>
          {insured.additionalHealth === "มี" && <Field label="กรุณาระบุ * (สูงสุด 90 ตัวอักษร)" maxLength={90} value={insured.additionalHealthDetail} onChangeText={(additionalHealthDetail) => update("insured", { additionalHealthDetail })} />}
        </ApplicationSection>

        <ApplicationSection title="ข้อมูลที่อยู่" subtitle="ต้องตรวจสอบให้ครบทั้งทะเบียนบ้าน ที่อยู่ปัจจุบัน ที่ทำงาน และสถานที่ติดต่อในประเทศไทย">
          <View style={styles.addressTabs}>
            {Object.keys(insured.addresses).map((type) => (
              <Pressable key={type} style={[styles.addressTab, insured.selectedAddressType === type && styles.addressTabActive]} onPress={() => update("insured", { selectedAddressType: type })}>
                <Text style={[styles.addressTabText, insured.selectedAddressType === type && styles.addressTabTextActive]}>{type}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.insuredGrid}>
            <Field label="เลขที่ *" value={address.houseNo} onChangeText={(houseNo) => updateAddress({ houseNo })} />
            <Field label="หมู่ที่" value={address.villageNo} onChangeText={(villageNo) => updateAddress({ villageNo })} />
            <Field label="หมู่บ้าน" value={address.village} onChangeText={(village) => updateAddress({ village })} />
            <Field label="อาคาร/คอนโด" value={address.building} onChangeText={(building) => updateAddress({ building })} />
            <Field label="ชั้น" value={address.floor} onChangeText={(floor) => updateAddress({ floor })} />
            <Field label="ห้อง" value={address.room} onChangeText={(room) => updateAddress({ room })} />
            <Field label="ตรอก" value={address.alley} onChangeText={(alley) => updateAddress({ alley })} />
            <Field label="ซอย" value={address.soi} onChangeText={(soi) => updateAddress({ soi })} />
            <Field label="ถนน" value={address.road} onChangeText={(road) => updateAddress({ road })} />
            <Field label="ตำบล/แขวง *" value={address.subdistrict} onChangeText={(subdistrict) => updateAddress({ subdistrict })} />
            <Field label="อำเภอ/เขต *" value={address.district} onChangeText={(district) => updateAddress({ district })} />
            <Field label="จังหวัด *" value={address.province} onChangeText={(province) => updateAddress({ province })} />
            <Field label="รหัสไปรษณีย์ *" maxLength={5} keyboardType="number-pad" value={address.postalCode} onChangeText={(postalCode) => updateAddress({ postalCode: postalCode.replace(/\D/g, "") })} />
            <Field label="เบอร์โทรศัพท์บ้าน" keyboardType="phone-pad" value={address.homePhone} onChangeText={(homePhone) => updateAddress({ homePhone: homePhone.replace(/\D/g, "") })} />
          </View>
        </ApplicationSection>

        <ApplicationSection title="ข้อมูลรายได้และอาชีพ">
          <View style={styles.insuredGrid}>
            <Field label="อาชีพหลัก" editable={false} value={insured.occupation} />
            <Field label="ลักษณะงานที่ทำ" editable={false} value={insured.jobDescription} />
            <Field label="ตำแหน่ง" value={insured.position} onChangeText={(position) => update("insured", { position })} />
            <Field label="รายได้ต่อปี (บาท) *" keyboardType="number-pad" value={insured.annualIncome} onChangeText={(annualIncome) => update("insured", { annualIncome: annualIncome.replace(/\D/g, "") })} />
            <Field label="ลักษณะธุรกิจ" value={insured.businessType} onChangeText={(businessType) => update("insured", { businessType })} />
          </View>
        </ApplicationSection>

        <View style={styles.requirementNote}>
          <Text style={styles.requirementNoteText}>อ้างอิง BRD Application LV V10 หน้า 11–16 · เมื่อกดถัดไปต้องบันทึกอัตโนมัติ แสดง inline error และเลื่อนไปยังช่องบังคับแรกที่ไม่ครบ</Text>
        </View>
      </View>
    );
  }
  if (index === 1) {
    const payerGuardian = application.payerGuardian;
    const payer = payerGuardian.payer;
    const guardian = payerGuardian.guardian;
    const updatePayer = (patch) => update("payerGuardian", { payer: { ...payer, ...patch } });
    const updateGuardian = (patch) => update("payerGuardian", { guardian: { ...guardian, ...patch } });
    return (
      <View style={styles.insuredCard}>
        <Text style={styles.eyebrow}>STEP 1.2 · แบบประกันและข้อมูลผู้ชำระเบี้ยประกัน</Text>
        <Text style={styles.insuredPageTitle}>ผู้ชำระเบี้ยและผู้ปกครอง</Text>
        <ApplicationSection title="แบบประกัน" subtitle="ข้อมูลจากใบเสนอขาย แสดงแบบอ่านอย่างเดียว">
          <View style={styles.insuredGrid}>
            <Field label="แบบประกัน" editable={false} value={payerGuardian.planName} />
            <Field label="งวดชำระเบี้ย" editable={false} value={payerGuardian.premiumMode} />
            <Field label="ทุนประกัน" editable={false} value={formatMoney(payerGuardian.sumAssured)} />
            <Field label="เบี้ยประกันภัยครั้งแรก" editable={false} value={formatMoney(application.premium)} />
          </View>
        </ApplicationSection>
        <ApplicationSection title="ข้อมูลผู้ชำระเบี้ยประกันภัย">
          <View style={styles.insuredGrid}>
            <Field label="ประเภทผู้ชำระเบี้ย *" value={payer.type} onChangeText={(type) => updatePayer({ type })} />
            <Field label="ความสัมพันธ์ *" value={payer.relation} onChangeText={(relation) => updatePayer({ relation })} />
            <Field label="คำนำหน้า *" value={payer.prefix} onChangeText={(prefix) => updatePayer({ prefix })} />
            <Field label="ชื่อ *" value={payer.firstName} onChangeText={(firstName) => updatePayer({ firstName })} />
            <Field label="นามสกุล *" value={payer.lastName} onChangeText={(lastName) => updatePayer({ lastName })} />
            <Field label="วัน/เดือน/ปีเกิด *" value={payer.birthDate} onChangeText={(birthDate) => updatePayer({ birthDate, dopaStatus: "UNAVAILABLE" })} />
            <Field label="เพศ *" value={payer.gender} onChangeText={(gender) => updatePayer({ gender })} />
            <Field label="เลขประจำตัวประชาชน *" maxLength={13} keyboardType="number-pad" value={payer.nationalId} onChangeText={(nationalId) => updatePayer({ nationalId: nationalId.replace(/\D/g, ""), dopaStatus: "UNAVAILABLE" })} />
            <Field label="เบอร์มือถือ *" maxLength={10} keyboardType="phone-pad" value={payer.mobile} onChangeText={(mobile) => updatePayer({ mobile: mobile.replace(/\D/g, "") })} />
          </View>
        </ApplicationSection>
        {payerGuardian.guardianRequired && (
          <ApplicationSection title="ผู้ปกครองหรือผู้แทนโดยชอบธรรม" subtitle="แสดงเมื่อผู้ขอเอาประกันอายุ 0–19 ปีและมีสถานภาพโสด">
            <View style={styles.insuredGrid}>
              <Field label="ความสัมพันธ์ *" value={guardian.relation} onChangeText={(relation) => updateGuardian({ relation })} />
              <Field label="คำนำหน้า *" value={guardian.prefix} onChangeText={(prefix) => updateGuardian({ prefix })} />
              <Field label="ชื่อ *" value={guardian.firstName} onChangeText={(firstName) => updateGuardian({ firstName })} />
              <Field label="นามสกุล *" value={guardian.lastName} onChangeText={(lastName) => updateGuardian({ lastName })} />
              <Field label="เพศ *" value={guardian.gender} onChangeText={(gender) => updateGuardian({ gender })} />
              <Field label="เลขประจำตัวประชาชน *" maxLength={13} keyboardType="number-pad" value={guardian.nationalId} onChangeText={(nationalId) => updateGuardian({ nationalId: nationalId.replace(/\D/g, "") })} />
              <Field label="วัน/เดือน/ปีเกิด *" value={guardian.birthDate} onChangeText={(birthDate) => updateGuardian({ birthDate })} />
            </View>
          </ApplicationSection>
        )}
        <View style={styles.requirementNote}>
          <Text style={styles.requirementNoteText}>DOPA ตรวจวันเกิดและเลขบัตรของผู้ชำระเบี้ย/ผู้ปกครอง · ครั้งแรกแสดง popup · ครั้งที่ 2 bypass ไป Step 1.3 ผู้รับประโยชน์</Text>
        </View>
      </View>
    );
  }

  if (index === 2) {
    const sumAssuredTotal = application.beneficiaries.reduce((sum, item) => sum + Number(item.sumAssuredShare || 0), 0);
    const accountValueTotal = application.beneficiaries.reduce((sum, item) => sum + Number(item.accountValueShare || 0), 0);
    return (
      <View style={styles.beneficiaryPage}>
        <View style={styles.applicationInfoCard}>
          <Text style={styles.applicationSectionTitle}>ข้อมูลใบคำขอ</Text>
          <Text style={styles.infoLabel}>เลขที่ใบคำขอ</Text>
          <Text style={styles.infoValue}>00126569</Text>
          <Text style={styles.infoLabel}>เลขที่อ้างอิงใบเสนอขาย</Text>
          <Text style={styles.infoValue}>{application.quotationNo}</Text>
          <Text style={styles.infoLabel}>การตรวจสุขภาพ</Text>
          <Text style={styles.infoValue}>ไม่ต้องตรวจสุขภาพ</Text>
          <View style={styles.infoDivider} />
          <Text style={styles.infoLabel}>DOPA</Text>
          <Text style={styles.infoWarningValue}>Bypass ครั้งที่ 2</Text>
        </View>

        <View style={styles.beneficiaryMain}>
          <View style={styles.beneficiaryHeader}>
            <View>
              <Text style={styles.beneficiaryTitle}>ผู้รับประโยชน์</Text>
              <Text style={styles.applicationSectionSubtitle}>เพิ่มผู้รับประโยชน์ได้สูงสุด 10 คน</Text>
            </View>
            <Pressable disabled={application.beneficiaries.length >= 10} style={[styles.addBeneficiaryButton, application.beneficiaries.length >= 10 && styles.buttonDisabled]} onPress={addBeneficiary}>
              <Text style={styles.addBeneficiaryButtonText}>＋ เพิ่มผู้รับประโยชน์</Text>
            </Pressable>
          </View>

          <View style={styles.beneficiaryInfoBanner}>
            <Text style={styles.beneficiaryInfoText}>ⓘ กรณีมีผู้รับประโยชน์เป็นเจ้าหนี้ ผลประโยชน์จะได้รับตามจำนวนเงินคงเหลือหลังหักหนี้สิน</Text>
          </View>

          <View style={styles.shareSummary}>
            <Text style={[styles.shareSummaryText, sumAssuredTotal !== 100 && styles.shareSummaryError]}>เงินเอาประกันภัยรวม {sumAssuredTotal}%</Text>
            <Text style={[styles.shareSummaryText, accountValueTotal !== 100 && styles.shareSummaryError]}>มูลค่าบัญชีกรมธรรม์รวม {accountValueTotal}%</Text>
          </View>

          {application.beneficiaries.map((beneficiary, beneficiaryIndex) => (
            <View key={beneficiaryIndex} style={styles.beneficiaryCard}>
              <View style={styles.beneficiaryCardHeader}>
                <Text style={styles.beneficiaryCardTitle}>ผู้รับประโยชน์คนที่ {beneficiaryIndex + 1}</Text>
                {application.beneficiaries.length > 1 && <Pressable onPress={() => removeBeneficiary(beneficiaryIndex)}><Text style={styles.removeBeneficiaryText}>ลบรายการ</Text></Pressable>}
              </View>
              <Text style={styles.fieldLabel}>ประเภทผู้รับประโยชน์ *</Text>
              <View style={styles.choiceRow}>
                {["บุคคล", "นิติบุคคล / องค์กร"].map((type) => (
                  <Pressable key={type} style={[styles.choiceButton, beneficiary.type === type && styles.choiceButtonActive]} onPress={() => updateBeneficiary(beneficiaryIndex, { type })}>
                    <Text style={[styles.choiceButtonText, beneficiary.type === type && styles.choiceButtonTextActive]}>{type}</Text>
                  </Pressable>
                ))}
              </View>
              {beneficiary.type === "บุคคล" ? (
                <View style={styles.insuredGrid}>
                  <Field label="คำนำหน้า *" value={beneficiary.prefix} onChangeText={(prefix) => updateBeneficiary(beneficiaryIndex, { prefix })} />
                  <Field label="ชื่อ *" value={beneficiary.firstName} onChangeText={(firstName) => updateBeneficiary(beneficiaryIndex, { firstName })} />
                  <Field label="นามสกุล *" value={beneficiary.lastName} onChangeText={(lastName) => updateBeneficiary(beneficiaryIndex, { lastName })} />
                  <Field label="เพศ *" value={beneficiary.gender} onChangeText={(gender) => updateBeneficiary(beneficiaryIndex, { gender })} />
                  <Field label="วัน/เดือน/ปีเกิด *" value={beneficiary.birthDate} onChangeText={(birthDate) => updateBeneficiary(beneficiaryIndex, { birthDate })} />
                  <Field label="อายุ *" keyboardType="number-pad" value={String(beneficiary.age)} onChangeText={(age) => updateBeneficiary(beneficiaryIndex, { age: age.replace(/\D/g, "") })} />
                  <Field label="ความสัมพันธ์ *" value={beneficiary.relation} onChangeText={(relation) => updateBeneficiary(beneficiaryIndex, { relation })} />
                  <Field label="เลขประจำตัวประชาชน" maxLength={13} keyboardType="number-pad" value={beneficiary.nationalId} onChangeText={(nationalId) => updateBeneficiary(beneficiaryIndex, { nationalId: nationalId.replace(/\D/g, "") })} />
                </View>
              ) : (
                <View style={styles.insuredGrid}>
                  <Field label="ชื่อผู้รับประโยชน์ *" value={beneficiary.firstName} onChangeText={(firstName) => updateBeneficiary(beneficiaryIndex, { firstName })} />
                  <Field label="ความสัมพันธ์ *" value={beneficiary.relation} onChangeText={(relation) => updateBeneficiary(beneficiaryIndex, { relation })} />
                  <Field label="เลขทะเบียนนิติบุคคล / องค์กร" maxLength={13} value={beneficiary.nationalId} onChangeText={(nationalId) => updateBeneficiary(beneficiaryIndex, { nationalId })} />
                </View>
              )}
              <View style={styles.insuredGrid}>
                <Field label="ผลประโยชน์ตามเงินเอาประกันภัย (%) *" keyboardType="number-pad" value={String(beneficiary.sumAssuredShare)} onChangeText={(value) => updateBeneficiary(beneficiaryIndex, { sumAssuredShare: Number(value.replace(/\D/g, "")) })} />
                <Field label="ผลประโยชน์ตามมูลค่าบัญชี (%) *" keyboardType="number-pad" value={String(beneficiary.accountValueShare)} onChangeText={(value) => updateBeneficiary(beneficiaryIndex, { accountValueShare: Number(value.replace(/\D/g, "")) })} />
                <Field label="ที่อยู่ผู้รับประโยชน์ *" value={beneficiary.addressType} onChangeText={(addressType) => updateBeneficiary(beneficiaryIndex, { addressType })} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }
  if (index === 3) {
    return <View style={styles.formCard}><Text style={styles.eyebrow}>STEP 3</Text><Text style={styles.sectionTitle}>แบบสอบถามสุขภาพ</Text><Text style={styles.fieldLabel}>เคยมีโรคประจำตัวหรือเข้ารับการรักษาต่อเนื่องหรือไม่?</Text><View style={styles.segment}>{[["ไม่มี", false], ["มี", true]].map(([label, value]) => <Pressable key={label} style={[styles.segmentButton, application.health.answered && application.health.hasCondition === value && styles.segmentActive]} onPress={() => update("health", { answered: true, hasCondition: value })}><Text style={styles.segmentText}>{label}</Text></Pressable>)}</View>{application.health.hasCondition && <TextInput multiline style={styles.notesInput} placeholder="ระบุรายละเอียดสุขภาพเพิ่มเติม..." />}</View>;
  }
  if (index === 4) {
    return <View style={styles.formCard}><Text style={styles.eyebrow}>STEP 4</Text><Text style={styles.sectionTitle}>เอกสารประกอบ</Text><DocumentToggle label="สำเนาบัตรประชาชน *" value={application.documents.identityCard} onPress={() => update("documents", { identityCard: !application.documents.identityCard })} /><DocumentToggle label="เอกสารยืนยันที่อยู่" value={application.documents.addressDocument} onPress={() => update("documents", { addressDocument: !application.documents.addressDocument })} /></View>;
  }
  if (index === 5) {
    const signature = application.signature;
    return (
      <View style={styles.signerCard}>
        <Text style={styles.signerPageTitle}>ผู้ลงลายมือชื่อ</Text>
        <View style={styles.signerMetaGrid}>
          <SignerMeta label="วันที่" value="12 มิ.ย. 2568" />
          <SignerMeta label="ชื่อพยาบาล/ผู้เขียน/ผู้พิมพ์" value="น.ส.ณิชาภา ยิ้มเก่งวิจิตรพร" />
          <SignerMeta label="ชื่อผู้ขอเอาประกันภัย" value="นายธนาธิป รุ่งปัญญากิจพัฒน์" />
          <SignerMeta label="ชื่อตัวแทน" value="น.ส.ณิชาภา ยิ้มเก่งวิจิตรพร" />
          <SignerMeta label="ใบอนุญาตเลขที่" value="ว00000/2566" />
        </View>

        <Field
          label="ทำใบคำขอที่ *"
          maxLength={60}
          value={signature.purpose}
          onChangeText={(purpose) => update("signature", { purpose })}
        />
        <Text style={styles.characterCount}>{signature.purpose.length}/60</Text>

        <View style={styles.signerDivider} />
        <Text style={styles.signerSectionTitle}>ผู้ปกครองหรือผู้แทนโดยชอบธรรม</Text>
        <View style={styles.signerGrid}>
          <Field label="ความสัมพันธ์ *" value={signature.guardianRelation} onChangeText={(guardianRelation) => update("signature", { guardianRelation })} />
          <View style={styles.flex}>
            <Text style={styles.fieldLabel}>เพศ *</Text>
            <View style={styles.radioRow}>
              {["ชาย", "หญิง"].map((gender) => (
                <Pressable key={gender} style={styles.radioOption} onPress={() => update("signature", { guardianGender: gender })}>
                  <View style={[styles.radioCircle, signature.guardianGender === gender && styles.radioCircleSelected]}>
                    {signature.guardianGender === gender && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.radioLabel}>{gender}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Field label="คำนำหน้า *" value={signature.guardianPrefix} onChangeText={(guardianPrefix) => update("signature", { guardianPrefix })} />
          <Field label="ชื่อ *" value={signature.guardianFirstName} onChangeText={(guardianFirstName) => update("signature", { guardianFirstName })} />
          <Field label="นามสกุล *" value={signature.guardianLastName} onChangeText={(guardianLastName) => update("signature", { guardianLastName })} />
          <Field label="วัน/เดือน/ปี เกิด *" value={signature.guardianBirthDate} onChangeText={(guardianBirthDate) => update("signature", { guardianBirthDate })} />
          <Field label="เอกสารแสดงตน *" value={signature.guardianDocumentType} onChangeText={(guardianDocumentType) => update("signature", { guardianDocumentType })} />
          <Field label="เลขประจำตัวประชาชน *" keyboardType="number-pad" maxLength={13} value={signature.guardianNationalId} onChangeText={(guardianNationalId) => update("signature", { guardianNationalId: guardianNationalId.replace(/\D/g, "") })} />
          <Field label="สัญชาติ" editable={false} value={signature.guardianNationality} />
        </View>

        <View style={styles.signerDivider} />
        <Text style={styles.signerSectionTitle}>พยาน</Text>
        <View style={styles.signerGrid}>
          <Field label="คำนำหน้า *" value={signature.witnessPrefix} onChangeText={(witnessPrefix) => update("signature", { witnessPrefix })} />
          <Field label="ชื่อ *" value={signature.witnessFirstName} onChangeText={(witnessFirstName) => update("signature", { witnessFirstName })} />
          <Field label="นามสกุล *" value={signature.witnessLastName} onChangeText={(witnessLastName) => update("signature", { witnessLastName })} />
        </View>

        <View style={styles.signatureConfirmation}>
          <SignatureBox label="ผู้เอาประกัน" value={signature.insured} onPress={() => update("signature", { insured: !signature.insured })} />
          <SignatureBox label="ตัวแทนประกันชีวิต" value={signature.agent} onPress={() => update("signature", { agent: !signature.agent })} />
        </View>
      </View>
    );
  }
  return <View style={styles.formCard}><Text style={styles.eyebrow}>STEP 6</Text><Text style={styles.sectionTitle}>ช่องทางชำระเงิน</Text><Text style={styles.subtitle}>เลือกช่องทางสำหรับชำระเบี้ยประกันครั้งแรก {formatMoney(application.premium)}</Text><View style={styles.paymentGrid}>{["QR", "Credit Card", "Direct Debit"].map((method) => <Pressable key={method} style={[styles.paymentMethod, application.payment.method === method && styles.paymentMethodActive]} onPress={() => update("payment", { method })}><Text style={styles.paymentIcon}>{method === "QR" ? "▦" : method === "Credit Card" ? "▭" : "⇄"}</Text><Text style={[styles.paymentText, application.payment.method === method && { color: "#087253" }]}>{method}</Text></Pressable>)}</View></View>;
}

function DocumentToggle({ label, value, onPress }) {
  return <Pressable style={[styles.documentRow, value && styles.documentRowComplete]} onPress={onPress}><View><Text style={styles.leadName}>{label}</Text><Text style={styles.leadMeta}>{value ? "แนบเอกสารแล้ว" : "แตะเพื่อจำลองการแนบเอกสาร"}</Text></View><Text style={[styles.documentAction, value && { color: "#087253" }]}>{value ? "✓ สำเร็จ" : "＋ แนบไฟล์"}</Text></Pressable>;
}

function SignatureBox({ label, value, onPress }) {
  return <Pressable style={[styles.signatureBox, value && styles.signatureComplete]} onPress={onPress}><Text style={styles.leadMeta}>ลายมือชื่อ{label}</Text><Text style={styles.signatureMark}>{value ? `${label} ✓` : "แตะเพื่อลงลายมือชื่อ"}</Text></Pressable>;
}

function SignerMeta({ label, value }) {
  return <View style={styles.signerMetaItem}><Text style={styles.signerMetaLabel}>{label} :</Text><Text style={styles.signerMetaValue}>{value}</Text></View>;
}

function ApplicationSection({ title, subtitle, children }) {
  return (
    <View style={styles.applicationSection}>
      <Text style={styles.applicationSectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.applicationSectionSubtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
}

const careerSteps = [
  ["1", "เปิดบทสนทนา"],
  ["2", "การเปิดใจ"],
  ["3", "จุดแข็งธุรกิจ"],
  ["4", "คำนวณรายได้"],
  ["5", "เส้นทางอาชีพ"],
  ["6", "สมัครตัวแทน"],
  ["7", "จดบันทึก"],
];

function CareerPlanning() {
  const [step, setStep] = useState(4);
  const [inputMode, setInputMode] = useState("sales");
  const [monthlyTarget, setMonthlyTarget] = useState(50000);
  const [policiesPerMonth, setPoliciesPerMonth] = useState(4);
  const [premiumPerPolicy, setPremiumPerPolicy] = useState(20000);
  const [commissionRate, setCommissionRate] = useState(40);
  const [notes, setNotes] = useState("");

  const recommendedPolicies = policiesForMonthlyTarget(
    monthlyTarget,
    premiumPerPolicy,
    commissionRate,
  );
  const effectivePolicies =
    inputMode === "income" ? recommendedPolicies : policiesPerMonth;
  const result = simulateCareer({
    policiesPerMonth: effectivePolicies,
    premiumPerPolicy,
    commissionRate,
  });

  return (
    <ScrollView contentContainerStyle={styles.careerContent}>
      <View style={styles.careerHero}>
        <View style={styles.candidateAvatar}><Text style={styles.candidateAvatarText}>พ</Text></View>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>TLI AGENT SUPER APP · SALE_SIM</Text>
          <Text style={styles.careerTitle}>วางแผนอาชีพสำหรับ พชรพล</Text>
          <Text style={styles.subtitle}>Candidate CD-2025-0018 · สนใจอาชีพและความมั่นคงทางการเงิน</Text>
        </View>
        <View style={styles.draftPill}><Text style={styles.draftPillText}>บันทึกร่างแล้ว</Text></View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepper}>
        {careerSteps.map(([number, label], index) => (
          <Pressable key={number} onPress={() => setStep(index + 1)} style={[styles.careerStep, step === index + 1 && styles.careerStepActive]}>
            <Text style={[styles.stepNumber, step === index + 1 && styles.stepNumberActive]}>{number}</Text>
            <Text style={[styles.stepLabel, step === index + 1 && styles.stepLabelActive]}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {step === 4 ? (
        <IncomeSimulation
          inputMode={inputMode}
          setInputMode={setInputMode}
          monthlyTarget={monthlyTarget}
          setMonthlyTarget={setMonthlyTarget}
          policiesPerMonth={policiesPerMonth}
          setPoliciesPerMonth={setPoliciesPerMonth}
          premiumPerPolicy={premiumPerPolicy}
          setPremiumPerPolicy={setPremiumPerPolicy}
          commissionRate={commissionRate}
          setCommissionRate={setCommissionRate}
          recommendedPolicies={recommendedPolicies}
          result={result}
        />
      ) : step === 7 ? (
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>จดบันทึกสำหรับพชรพล</Text>
          <Text style={styles.subtitle}>บันทึกความสนใจหรือประเด็นสำหรับติดตามครั้งถัดไป</Text>
          <TextInput multiline numberOfLines={8} style={styles.notesInput} value={notes} onChangeText={setNotes} placeholder="ระบุบันทึก..." />
          <View style={styles.formActions}>
            <Pressable style={styles.cancelButton}><Text style={styles.cancelText}>ยกเลิก</Text></Pressable>
            <Pressable style={styles.primaryButton} onPress={() => Alert.alert("บันทึกแล้ว", "บันทึกข้อมูลผู้มุ่งหวังตัวแทนเรียบร้อย")}><Text style={styles.primaryButtonText}>บันทึก</Text></Pressable>
          </View>
        </View>
      ) : (
        <CareerContentStep step={step} onNext={() => setStep(Math.min(7, step + 1))} />
      )}
    </ScrollView>
  );
}

function IncomeSimulation(props) {
  const {
    inputMode, setInputMode, monthlyTarget, setMonthlyTarget,
    policiesPerMonth, setPoliciesPerMonth, premiumPerPolicy,
    setPremiumPerPolicy, commissionRate, setCommissionRate,
    recommendedPolicies, result,
  } = props;
  return (
    <View style={styles.simulationLayout}>
      <View style={[styles.formCard, styles.simulationInput]}>
        <Text style={styles.eyebrow}>STEP 4</Text>
        <Text style={styles.sectionTitle}>เครื่องมือคำนวณรายได้</Text>
        <Text style={styles.subtitle}>เลือกวิธีตั้งเป้าหมายและปรับตัวเลขเพื่อดูผลจำลอง</Text>
        <View style={styles.modeTabs}>
          <Pressable onPress={() => setInputMode("income")} style={[styles.modeTab, inputMode === "income" && styles.modeTabActive]}><Text style={[styles.modeText, inputMode === "income" && styles.modeTextActive]}>เป้ารายได้ต่อเดือน</Text></Pressable>
          <Pressable onPress={() => setInputMode("sales")} style={[styles.modeTab, inputMode === "sales" && styles.modeTabActive]}><Text style={[styles.modeText, inputMode === "sales" && styles.modeTextActive]}>เป้าการขาย</Text></Pressable>
        </View>
        {inputMode === "income" && (
          <>
            <NumberSelector label="รายได้เป้าหมายต่อเดือน" value={monthlyTarget} min={20000} max={300000} step={10000} onChange={setMonthlyTarget} money />
            <View style={styles.recommendBox}>
              <Text style={styles.recommendLabel}>จำนวนกรมธรรม์ที่แนะนำ</Text>
              <Text style={styles.recommendValue}>{recommendedPolicies} ฉบับ/เดือน</Text>
            </View>
          </>
        )}
        {inputMode === "sales" && (
          <NumberSelector label="จำนวนกรมธรรม์ต่อเดือน" value={policiesPerMonth} min={1} max={8} step={1} onChange={setPoliciesPerMonth} suffix="ฉบับ" />
        )}
        <NumberSelector label="มูลค่าเบี้ยต่อกรมธรรม์" value={premiumPerPolicy} min={20000} max={300000} step={10000} onChange={setPremiumPerPolicy} money />
        <Text style={styles.fieldLabel}>ค่าคอมมิชชั่น</Text>
        <View style={styles.rateGrid}>
          {[10, 20, 30, 40].map((rate) => (
            <Pressable key={rate} onPress={() => setCommissionRate(rate)} style={[styles.rateButton, commissionRate === rate && styles.rateActive]}>
              <Text style={[styles.rateText, commissionRate === rate && styles.rateTextActive]}>{rate}%</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.prototypeWarning}><Text style={styles.prototypeWarningText}>ผลลัพธ์นี้เป็น Illustrative MVP และยังไม่ใช่สูตร Production ที่รับรองแล้ว</Text></View>
      </View>

      <View style={styles.simulationResult}>
        <View style={styles.resultHero}>
          <Text style={styles.resultHeroLabel}>รายได้ประมาณการต่อเดือน</Text>
          <Text style={styles.resultHeroValue}>{formatMoney(result.monthlyIncome)}</Text>
          <Text style={styles.resultHeroSub}>จากยอดเบี้ย {formatMoney(result.monthlyPremium)} ต่อเดือน</Text>
        </View>
        <View style={styles.resultMetrics}>
          <ResultMetric label="รายได้ปีแรก" value={formatMoney(result.firstYearIncome)} />
          <ResultMetric label="ยอดเบี้ยปีแรก" value={formatMoney(result.annualPremium)} />
          <ResultMetric label="คุณวุฒิประมาณการ" value={result.highestQualification} />
          <ResultMetric label="รายได้รวม 5 ปี" value={formatMoney(result.fiveYearTotal)} />
        </View>
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>วิธีบรรลุเป้าหมายต่อเดือน</Text>
          <View style={styles.funnel}>
            <FunnelItem value={result.activity.calls} label="โทรหาผู้มุ่งหวัง" width="100%" />
            <FunnelItem value={result.activity.firstAppointments} label="นัดครั้งแรก" width="78%" />
            <FunnelItem value={result.activity.secondAppointments} label="นัดครั้งที่สอง" width="58%" />
            <FunnelItem value={result.activity.submittedPolicies} label="นำส่งกรมธรรม์" width="40%" />
          </View>
        </View>
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>ภาพรวมรายได้ปีที่ 1–5</Text>
          {result.fiveYears.map((row) => {
            const max = Math.max(...result.fiveYears.map((item) => item.totalIncome));
            return (
              <View key={row.year} style={styles.yearRow}>
                <Text style={styles.yearLabel}>ปี {row.year}</Text>
                <View style={styles.yearTrack}><View style={[styles.yearBar, { width: `${(row.totalIncome / max) * 100}%` }]} /></View>
                <Text style={styles.yearValue}>{shortMoney(row.totalIncome)}</Text>
              </View>
            );
          })}
          <View style={styles.legendRow}><View style={styles.legendDot} /><Text style={styles.leadMeta}>Active + Passive Income (MVP assumption)</Text></View>
        </View>
      </View>
    </View>
  );
}

function NumberSelector({ label, value, min, max, step, onChange, money, suffix }) {
  return (
    <View style={styles.selectorBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.numberSelector}>
        <Pressable style={styles.numberButton} onPress={() => onChange(Math.max(min, value - step))}><Text style={styles.numberButtonText}>−</Text></Pressable>
        <View style={styles.numberDisplay}><Text style={styles.numberValue}>{money ? formatMoney(value) : `${value} ${suffix || ""}`}</Text><Text style={styles.numberRange}>{money ? `${min.toLocaleString()}–${max.toLocaleString()} บาท` : `ช่วง ${min}–${max}`}</Text></View>
        <Pressable style={styles.numberButton} onPress={() => onChange(Math.min(max, value + step))}><Text style={styles.numberButtonText}>＋</Text></Pressable>
      </View>
    </View>
  );
}

function ResultMetric({ label, value }) {
  return <View style={styles.resultMetric}><Text style={styles.resultMetricLabel}>{label}</Text><Text style={styles.resultMetricValue}>{value}</Text></View>;
}

function FunnelItem({ value, label, width }) {
  return <View style={[styles.funnelItem, { width }]}><Text style={styles.funnelValue}>{value}</Text><Text style={styles.funnelLabel}>{label}</Text></View>;
}

function CareerContentStep({ step, onNext }) {
  const content = {
    1: ["เปิดบทสนทนา", "เริ่มต้นทำความรู้จักสิ่งที่ผู้มุ่งหวังให้ความสำคัญ", ["งานและความสำเร็จ", "การเงิน", "ครอบครัวและเวลา", "สุขภาพ", "ความสัมพันธ์", "การสร้างคุณค่า"]],
    2: ["การเปิดใจ", "สำรวจเป้าหมายทางการเงินและเหตุผลที่ต้องการรายได้เพิ่ม", ["วิธีบริหารเงิน", "เหตุผลในการเพิ่มรายได้", "ปัจจัยในการเลือกอาชีพ", "พีรามิดทางการเงิน"]],
    3: ["จุดแข็งธุรกิจไทยประกันชีวิต", "เรื่องราวและโอกาสของอาชีพตัวแทนไทยประกันชีวิต", ["โอกาสในอาชีพ", "6 จุดเด่นของบริษัท", "ผลิตภัณฑ์ที่ตอบโจทย์ทุกช่วงวัย", "บริการและเครื่องมือการเรียนรู้"]],
    5: ["เส้นทางอาชีพ", "มองเห็นเส้นทางเติบโตและผลประโยชน์ในแต่ละระดับ", ["ตัวแทนฝึกหัด", "ตัวแทน", "ผู้บริหารหน่วย", "ผู้บริหารศูนย์"]],
    6: ["ขั้นตอนการสมัครตัวแทน", "สมัครตัวแทนได้เป็นลำดับและติดตามความคืบหน้า", ["สมัครตัวแทนฝึกหัด", "อบรมขอรับใบอนุญาต", "สมัครสอบ", "ขึ้นทะเบียน", "แต่งตั้งตัวแทน"]],
  }[step];
  return (
    <View style={styles.formCard}>
      <Text style={styles.eyebrow}>STEP {step}</Text>
      <Text style={styles.sectionTitle}>{content[0]}</Text>
      <Text style={styles.subtitle}>{content[1]}</Text>
      <View style={styles.topicGrid}>
        {content[2].map((topic, index) => <View key={topic} style={styles.topicCard}><Text style={styles.topicNumber}>{String(index + 1).padStart(2, "0")}</Text><Text style={styles.topicText}>{topic}</Text></View>)}
      </View>
      <View style={styles.formActions}><Pressable style={styles.primaryButton} onPress={onNext}><Text style={styles.primaryButtonText}>ถัดไป  →</Text></Pressable></View>
    </View>
  );
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })} บาท`;
}

function shortMoney(value) {
  return Number(value || 0) >= 1000000
    ? `${(value / 1000000).toFixed(2)} ล.`
    : `${Math.round(value / 1000)}K`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f9f8" },
  shell: { flex: 1, flexDirection: "row" },
  sidebar: { width: 260, backgroundColor: "#073b2e", padding: 22 },
  brand: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 42 },
  brandMark: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#d7f15b", alignItems: "center", justifyContent: "center" },
  brandLetter: { color: "#073b2e", fontWeight: "900", fontSize: 15 },
  brandName: { color: "white", fontSize: 20, fontWeight: "800" },
  brandSub: { color: "#9ec1b5", fontSize: 11 },
  menuLabel: { color: "#7fa99b", fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginBottom: 10 },
  navItem: { flexDirection: "row", gap: 14, alignItems: "center", padding: 13, borderRadius: 12, marginBottom: 5 },
  navActive: { backgroundColor: "#145843" },
  navIcon: { color: "#9ec1b5", width: 22, fontSize: 18 },
  navText: { color: "#bad0c9", fontWeight: "600" },
  navActiveText: { color: "#fff" },
  quickCreate: { marginTop: 24, backgroundColor: "#d7f15b", padding: 14, borderRadius: 12, alignItems: "center" },
  quickCreateText: { color: "#073b2e", fontWeight: "800" },
  agentCard: { marginTop: "auto", paddingTop: 20, borderTopWidth: 1, borderTopColor: "#245b4d", flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#e6f4ef", justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#07533f", fontWeight: "800" },
  agentName: { color: "white", fontWeight: "700", fontSize: 13 },
  agentCode: { color: "#9ec1b5", fontSize: 11 },
  main: { flex: 1 },
  topbar: { height: 64, backgroundColor: "white", borderBottomColor: "#e4e9e7", borderBottomWidth: 1, paddingHorizontal: 26, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 16 },
  mobileBrand: { marginRight: "auto", color: "#073b2e", fontWeight: "900", fontSize: 20 },
  environment: { flexDirection: "row", gap: 7, alignItems: "center" },
  onlineDot: { width: 8, height: 8, backgroundColor: "#36b37e", borderRadius: 4 },
  environmentText: { color: "#718078", fontSize: 12 },
  topAvatar: { width: 34, height: 34, backgroundColor: "#e7f2ee", borderRadius: 17, alignItems: "center", justifyContent: "center" },
  topAvatarText: { color: "#07533f", fontWeight: "800", fontSize: 12 },
  mobileModules: { flexDirection: "row", gap: 7, padding: 8, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#e4e9e7" },
  mobileModule: { flex: 1, borderRadius: 8, padding: 9, alignItems: "center" },
  mobileModuleActive: { backgroundColor: "#e5f5ef" },
  mobileModuleText: { color: "#75857e", fontSize: 11, fontWeight: "700" },
  mobileModuleTextActive: { color: "#087253" },
  content: { padding: 32, maxWidth: 1200, width: "100%", alignSelf: "center" },
  formContent: { padding: 32, maxWidth: 900, width: "100%", alignSelf: "center" },
  headingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap" },
  eyebrow: { color: "#11966c", fontSize: 11, fontWeight: "800", letterSpacing: 1.4, marginBottom: 5 },
  title: { color: "#102a22", fontSize: 30, fontWeight: "800" },
  subtitle: { color: "#66776f", marginTop: 7, fontSize: 14 },
  primaryButton: { backgroundColor: "#0b7658", borderRadius: 11, paddingVertical: 13, paddingHorizontal: 18 },
  primaryButtonFull: { backgroundColor: "#0b7658", borderRadius: 11, paddingVertical: 13, paddingHorizontal: 18, alignItems: "center", marginTop: 16 },
  primaryButtonText: { color: "white", fontWeight: "800" },
  successBanner: { backgroundColor: "#e6f8f0", borderRadius: 10, padding: 12, marginTop: 20 },
  successText: { color: "#08704f", fontWeight: "700" },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 28, marginBottom: 18 },
  metric: { flexGrow: 1, minWidth: 180, borderRadius: 14, padding: 18, borderWidth: 1 },
  greenMetric: { backgroundColor: "#edf8f4", borderColor: "#d4ede4" },
  blueMetric: { backgroundColor: "#eff6fb", borderColor: "#dcecf6" },
  amberMetric: { backgroundColor: "#fff7e8", borderColor: "#f6e8c7" },
  metricValue: { color: "#15372c", fontSize: 25, fontWeight: "900" },
  metricLabel: { color: "#607169", fontSize: 12, marginTop: 4 },
  card: { backgroundColor: "white", borderRadius: 15, borderWidth: 1, borderColor: "#e4e9e7", overflow: "hidden" },
  listToolbar: { padding: 16, flexDirection: "row", gap: 10, borderBottomWidth: 1, borderBottomColor: "#edf0ef" },
  search: { flex: 1, backgroundColor: "#f7f9f8", borderColor: "#dfe6e3", borderWidth: 1, borderRadius: 10, padding: 12 },
  filterButton: { borderColor: "#dfe6e3", borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, justifyContent: "center" },
  filterText: { color: "#43584f", fontWeight: "700" },
  leadRow: { padding: 17, flexDirection: "row", alignItems: "center", gap: 13, borderBottomWidth: 1, borderBottomColor: "#edf0ef" },
  profileIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#def2eb", alignItems: "center", justifyContent: "center" },
  profileText: { color: "#087253", fontWeight: "900", fontSize: 18 },
  leadMain: { flex: 1 },
  leadName: { color: "#16372c", fontWeight: "800", fontSize: 15 },
  leadMeta: { color: "#7a8982", fontSize: 12, marginTop: 3 },
  leadStatus: { alignItems: "flex-end" },
  statusPill: { color: "#087253", backgroundColor: "#e6f8f0", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 11, fontWeight: "700" },
  updated: { color: "#98a29e", fontSize: 10, marginTop: 5 },
  chevron: { color: "#93a09a", fontSize: 28, marginLeft: 6 },
  empty: { padding: 30, textAlign: "center", color: "#7a8982" },
  back: { color: "#0b7658", fontWeight: "700", marginBottom: 24 },
  modeTabs: { flexDirection: "row", backgroundColor: "#e9eeec", padding: 4, borderRadius: 12, marginTop: 25, marginBottom: 18 },
  modeTab: { flex: 1, padding: 12, alignItems: "center", borderRadius: 9 },
  modeTabActive: { backgroundColor: "white" },
  modeText: { color: "#6a7872", fontWeight: "700" },
  modeTextActive: { color: "#087253" },
  notice: { backgroundColor: "#fff7df", borderColor: "#f0dfaa", borderWidth: 1, padding: 12, borderRadius: 10, marginBottom: 14 },
  noticeText: { color: "#735b14", fontSize: 13 },
  dopaWarning: { flexDirection: "row", gap: 13, backgroundColor: "#fff8e7", borderColor: "#edc66d", borderWidth: 1, borderRadius: 10, padding: 16, marginBottom: 18 },
  dopaWarningIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#e79a14", alignItems: "center", justifyContent: "center" },
  dopaWarningIconText: { color: "white", fontSize: 17, fontWeight: "900" },
  dopaWarningHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  dopaWarningTitle: { color: "#65470e", fontSize: 15, fontWeight: "800" },
  dopaWarningCode: { color: "#805f1e", backgroundColor: "#f6e4b8", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, fontSize: 10, fontWeight: "800" },
  dopaWarningText: { color: "#654f25", fontSize: 13, lineHeight: 21, marginTop: 6 },
  dopaPendingText: { color: "#8a6f39", fontSize: 10, marginTop: 7 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.58)", alignItems: "center", justifyContent: "center", padding: 20 },
  dopaModal: { width: "100%", maxWidth: 490, backgroundColor: "white", borderRadius: 12, paddingHorizontal: 34, paddingTop: 35, paddingBottom: 28, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 18, elevation: 12 },
  dopaModalIcon: { width: 43, height: 43, borderRadius: 22, borderWidth: 3, borderColor: "#f6b900", alignItems: "center", justifyContent: "center" },
  dopaModalIconText: { color: "#f6b900", fontSize: 25, fontWeight: "800", lineHeight: 28 },
  dopaModalTitle: { color: "#373c40", fontSize: 25, fontWeight: "900", marginTop: 21, textAlign: "center" },
  dopaModalMessage: { color: "#777f85", fontSize: 16, lineHeight: 25, textAlign: "center", marginTop: 17 },
  dopaModalButton: { width: "100%", backgroundColor: "#0789cf", borderRadius: 7, paddingVertical: 15, alignItems: "center", marginTop: 27 },
  dopaModalButtonText: { color: "white", fontSize: 17, fontWeight: "800" },
  applicationToast: { alignSelf: "flex-end", backgroundColor: "#e8f7f0", borderColor: "#62bb94", borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 12 },
  applicationToastText: { color: "#087253", fontSize: 12, fontWeight: "800" },
  saveOutlineButton: { paddingVertical: 13, paddingHorizontal: 22, borderColor: "#0789cf", borderWidth: 1, borderRadius: 8, backgroundColor: "white" },
  saveOutlineButtonText: { color: "#0789cf", fontWeight: "800" },
  applicationNextButton: { paddingVertical: 14, paddingHorizontal: 25, borderRadius: 8, backgroundColor: "#0789cf" },
  applicationNextButtonText: { color: "white", fontWeight: "800" },
  insuredCard: { backgroundColor: "#f2f4f6", borderColor: "#e0e5e8", borderWidth: 1, borderRadius: 6, padding: 24 },
  insuredPageTitle: { color: "#343a3f", fontSize: 25, fontWeight: "800", marginTop: 4, marginBottom: 20 },
  applicationSection: { backgroundColor: "white", borderColor: "#dde4e8", borderWidth: 1, borderRadius: 6, paddingHorizontal: 25, paddingVertical: 22, marginBottom: 18 },
  applicationSectionTitle: { color: "#353b40", fontSize: 20, fontWeight: "800" },
  applicationSectionSubtitle: { color: "#747d84", fontSize: 11, marginTop: 5, marginBottom: 8 },
  insuredGrid: { flexDirection: "row", flexWrap: "wrap", columnGap: 18, rowGap: 2 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 6 },
  choiceButton: { minWidth: 86, borderWidth: 1, borderColor: "#cbd5db", borderRadius: 7, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", backgroundColor: "white" },
  choiceButtonActive: { borderColor: "#0789cf", backgroundColor: "#eef8fe" },
  choiceButtonText: { color: "#626d74", fontSize: 12, fontWeight: "700" },
  choiceButtonTextActive: { color: "#087bb8" },
  addressTabs: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 16, marginBottom: 5 },
  addressTab: { borderBottomWidth: 2, borderBottomColor: "#d9e0e4", paddingHorizontal: 14, paddingVertical: 10 },
  addressTabActive: { borderBottomColor: "#0789cf", backgroundColor: "#f1f9fd" },
  addressTabText: { color: "#68747b", fontSize: 11, fontWeight: "700" },
  addressTabTextActive: { color: "#087bb8" },
  requirementNote: { backgroundColor: "#eaf5fb", borderLeftColor: "#0789cf", borderLeftWidth: 4, borderRadius: 5, padding: 13 },
  requirementNoteText: { color: "#315e74", fontSize: 10, lineHeight: 17 },
  beneficiaryPage: { flexDirection: "row", alignItems: "flex-start", gap: 16, flexWrap: "wrap" },
  applicationInfoCard: { width: 230, minWidth: 210, backgroundColor: "white", borderColor: "#e0e6e9", borderWidth: 1, borderRadius: 7, padding: 20 },
  infoLabel: { color: "#788188", fontSize: 10, marginTop: 16 },
  infoValue: { color: "#41494e", fontSize: 13, fontWeight: "800", marginTop: 4 },
  infoWarningValue: { color: "#9a6814", fontSize: 12, fontWeight: "800", marginTop: 4 },
  infoDivider: { height: 1, backgroundColor: "#e7ebed", marginTop: 19 },
  beneficiaryMain: { flex: 1, minWidth: 360, backgroundColor: "white", borderColor: "#e0e6e9", borderWidth: 1, borderRadius: 7, padding: 24 },
  beneficiaryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 15, flexWrap: "wrap" },
  beneficiaryTitle: { color: "#373e43", fontSize: 22, fontWeight: "900" },
  addBeneficiaryButton: { paddingVertical: 10, paddingHorizontal: 13, borderRadius: 7, borderColor: "#0789cf", borderWidth: 1, backgroundColor: "white" },
  addBeneficiaryButtonText: { color: "#0789cf", fontSize: 12, fontWeight: "800" },
  buttonDisabled: { opacity: 0.4 },
  beneficiaryInfoBanner: { backgroundColor: "#e7f6fd", borderRadius: 5, padding: 12, marginTop: 17 },
  beneficiaryInfoText: { color: "#3a6f87", fontSize: 10, lineHeight: 17 },
  shareSummary: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  shareSummaryText: { color: "#087253", backgroundColor: "#e8f7f0", borderRadius: 12, paddingHorizontal: 11, paddingVertical: 6, fontSize: 10, fontWeight: "800" },
  shareSummaryError: { color: "#a4493d", backgroundColor: "#fff0ec" },
  beneficiaryCard: { borderColor: "#dfe5e8", borderWidth: 1, borderRadius: 7, padding: 19, marginTop: 16, backgroundColor: "#fcfdfd" },
  beneficiaryCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  beneficiaryCardTitle: { color: "#40484d", fontSize: 15, fontWeight: "800" },
  removeBeneficiaryText: { color: "#c44d43", fontSize: 10, fontWeight: "800" },
  formCard: { backgroundColor: "white", borderColor: "#e1e7e4", borderWidth: 1, borderRadius: 15, padding: 22 },
  sectionTitle: { color: "#15372c", fontSize: 19, fontWeight: "800", marginBottom: 20 },
  formGrid: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  flex: { flex: 1, minWidth: 210 },
  fieldLabel: { color: "#314a40", fontSize: 13, fontWeight: "700", marginTop: 12, marginBottom: 7 },
  input: { borderColor: "#ccd7d2", borderWidth: 1, borderRadius: 10, padding: 12, backgroundColor: "#fcfdfd", color: "#15372c" },
  inputError: { borderColor: "#d84e4e" },
  error: { color: "#c83f3f", fontSize: 11, marginTop: 4 },
  segment: { flexDirection: "row", gap: 8 },
  segmentButton: { minWidth: 82, borderWidth: 1, borderColor: "#ccd7d2", borderRadius: 9, padding: 11, alignItems: "center" },
  segmentActive: { backgroundColor: "#e5f5ef", borderColor: "#0b7658" },
  segmentText: { color: "#66776f", fontWeight: "700" },
  segmentTextActive: { color: "#087253" },
  formActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 26 },
  cancelButton: { paddingVertical: 13, paddingHorizontal: 20, borderColor: "#ccd7d2", borderWidth: 1, borderRadius: 11 },
  cancelText: { color: "#4d6158", fontWeight: "700" },
  inline: { flexDirection: "row", gap: 10 },
  secondaryButton: { paddingHorizontal: 22, backgroundColor: "#e3f2ed", borderRadius: 10, justifyContent: "center" },
  secondaryButtonText: { color: "#087253", fontWeight: "800" },
  customerResult: { marginTop: 20, borderTopWidth: 1, borderTopColor: "#e5eae8", paddingTop: 18 },
  customerName: { color: "#15372c", fontSize: 18, fontWeight: "800" },
  policy: { flexDirection: "row", gap: 12, alignItems: "center", borderColor: "#dce4e1", borderWidth: 1, borderRadius: 11, padding: 14, marginTop: 10 },
  policySelected: { borderColor: "#0b7658", backgroundColor: "#f1faf7" },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#0b7658", alignItems: "center", justifyContent: "center" },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#0b7658" },
  policyName: { color: "#21463a", fontWeight: "800" },
  careerContent: { padding: 30, maxWidth: 1300, width: "100%", alignSelf: "center" },
  careerHero: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 22, flexWrap: "wrap" },
  candidateAvatar: { width: 58, height: 58, borderRadius: 20, backgroundColor: "#d7f15b", alignItems: "center", justifyContent: "center" },
  candidateAvatarText: { color: "#073b2e", fontSize: 22, fontWeight: "900" },
  careerTitle: { color: "#102a22", fontSize: 26, fontWeight: "900" },
  draftPill: { backgroundColor: "#e6f8f0", borderRadius: 14, paddingHorizontal: 13, paddingVertical: 7 },
  draftPillText: { color: "#08704f", fontSize: 11, fontWeight: "800" },
  stepper: { gap: 7, marginBottom: 22, paddingBottom: 4 },
  careerStep: { minWidth: 118, padding: 11, borderRadius: 11, borderWidth: 1, borderColor: "#dce4e1", backgroundColor: "white", flexDirection: "row", gap: 8, alignItems: "center" },
  careerStepActive: { borderColor: "#0b7658", backgroundColor: "#eaf7f2" },
  stepNumber: { width: 23, height: 23, borderRadius: 12, textAlign: "center", textAlignVertical: "center", backgroundColor: "#edf1ef", color: "#718078", fontSize: 11, fontWeight: "800" },
  stepNumberActive: { backgroundColor: "#0b7658", color: "white" },
  stepLabel: { color: "#64756d", fontSize: 11, fontWeight: "700" },
  stepLabelActive: { color: "#07533f" },
  simulationLayout: { flexDirection: "row", alignItems: "flex-start", gap: 18, flexWrap: "wrap" },
  simulationInput: { flex: 0.75, minWidth: 310 },
  simulationResult: { flex: 1.25, minWidth: 340, gap: 14 },
  selectorBlock: { marginTop: 7 },
  numberSelector: { flexDirection: "row", alignItems: "stretch", borderWidth: 1, borderColor: "#d4ded9", borderRadius: 11, overflow: "hidden" },
  numberButton: { width: 48, alignItems: "center", justifyContent: "center", backgroundColor: "#eff6f3" },
  numberButtonText: { color: "#087253", fontSize: 20, fontWeight: "800" },
  numberDisplay: { flex: 1, padding: 10, alignItems: "center", borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#d4ded9" },
  numberValue: { color: "#15372c", fontWeight: "900", fontSize: 17 },
  numberRange: { color: "#8a9892", fontSize: 9, marginTop: 2 },
  rateGrid: { flexDirection: "row", gap: 7 },
  rateButton: { flex: 1, padding: 11, borderWidth: 1, borderColor: "#ccd7d2", borderRadius: 9, alignItems: "center" },
  rateActive: { backgroundColor: "#0b7658", borderColor: "#0b7658" },
  rateText: { color: "#61736a", fontWeight: "800" },
  rateTextActive: { color: "white" },
  recommendBox: { backgroundColor: "#eef8f4", borderRadius: 10, padding: 14, marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  recommendLabel: { color: "#527067", fontSize: 12 },
  recommendValue: { color: "#087253", fontSize: 17, fontWeight: "900" },
  prototypeWarning: { marginTop: 17, backgroundColor: "#fff6de", borderRadius: 9, padding: 11 },
  prototypeWarningText: { color: "#775d17", fontSize: 10, lineHeight: 16 },
  resultHero: { backgroundColor: "#073b2e", borderRadius: 15, padding: 22 },
  resultHeroLabel: { color: "#a8c9bd", fontSize: 12 },
  resultHeroValue: { color: "#d7f15b", fontSize: 32, fontWeight: "900", marginTop: 5 },
  resultHeroSub: { color: "#c2d6cf", fontSize: 11, marginTop: 5 },
  resultMetrics: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  resultMetric: { flexGrow: 1, minWidth: 135, backgroundColor: "white", borderWidth: 1, borderColor: "#e1e7e4", borderRadius: 12, padding: 13 },
  resultMetricLabel: { color: "#75857e", fontSize: 10 },
  resultMetricValue: { color: "#173b2f", fontWeight: "900", fontSize: 14, marginTop: 5 },
  funnel: { alignItems: "center", gap: 6 },
  funnelItem: { backgroundColor: "#dff2eb", borderRadius: 7, paddingVertical: 8, paddingHorizontal: 13, flexDirection: "row", justifyContent: "space-between" },
  funnelValue: { color: "#087253", fontWeight: "900" },
  funnelLabel: { color: "#466158", fontSize: 11 },
  yearRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 10 },
  yearLabel: { width: 34, color: "#687972", fontSize: 10 },
  yearTrack: { flex: 1, height: 13, backgroundColor: "#edf1ef", borderRadius: 7, overflow: "hidden" },
  yearBar: { height: "100%", backgroundColor: "#16a477", borderRadius: 7 },
  yearValue: { width: 55, color: "#24473b", fontSize: 10, fontWeight: "800", textAlign: "right" },
  legendRow: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#16a477" },
  notesInput: { minHeight: 170, borderWidth: 1, borderColor: "#ccd7d2", borderRadius: 10, padding: 13, marginTop: 18, textAlignVertical: "top", backgroundColor: "#fcfdfd" },
  topicGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 22 },
  topicCard: { minWidth: 190, flexGrow: 1, flexBasis: "30%", backgroundColor: "#f3f8f6", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#e0e9e5" },
  topicNumber: { color: "#13a174", fontSize: 11, fontWeight: "900" },
  topicText: { color: "#25493d", fontSize: 13, fontWeight: "800", marginTop: 9 },
  applicationContent: { paddingHorizontal: 30, paddingTop: 22, paddingBottom: 90, maxWidth: 1380, width: "100%", alignSelf: "center" },
  applicationHeaderRow: { flexDirection: "row", justifyContent: "space-between", padding: 14, backgroundColor: "#f7f9f8", borderBottomWidth: 1, borderBottomColor: "#e5eae8" },
  applicationHeaderText: { color: "#78867f", fontSize: 10, fontWeight: "800" },
  applicationRow: { flexDirection: "row", alignItems: "center", gap: 13, padding: 17, borderBottomWidth: 1, borderBottomColor: "#edf0ef" },
  applicationIcon: { width: 45, height: 45, borderRadius: 13, backgroundColor: "#def2eb", alignItems: "center", justifyContent: "center" },
  applicationIconText: { color: "#087253", fontWeight: "900" },
  applicationProgress: { width: 110, alignItems: "flex-end", gap: 7 },
  miniTrack: { height: 5, width: 95, backgroundColor: "#e6ebe9", borderRadius: 3, overflow: "hidden" },
  miniBar: { height: "100%", backgroundColor: "#15a376", borderRadius: 3 },
  applicationStepper: { marginTop: 23, marginBottom: 18, gap: 0, paddingBottom: 3 },
  applicationStep: { minWidth: 140, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 11, borderBottomWidth: 2, borderBottomColor: "#dce4e1" },
  applicationStepActive: { borderBottomColor: "#0b7658", backgroundColor: "#f1f8f5" },
  applicationStepCircle: { width: 25, height: 25, borderRadius: 13, backgroundColor: "#e7ecea", alignItems: "center", justifyContent: "center" },
  applicationStepComplete: { backgroundColor: "#16a477" },
  applicationStepCurrent: { backgroundColor: "#0b7658" },
  applicationStepNumber: { color: "#6f7e77", fontSize: 10, fontWeight: "900" },
  applicationLayout: { flexDirection: "row", alignItems: "flex-start", gap: 18, flexWrap: "wrap" },
  applicationForm: { flex: 1.9, minWidth: 340 },
  applicationSummary: { flex: 0.7, minWidth: 270, backgroundColor: "white", borderWidth: 1, borderColor: "#e1e7e4", borderRadius: 15, padding: 20 },
  readinessScore: { borderRadius: 13, backgroundColor: "#073b2e", padding: 18, marginBottom: 14 },
  readinessValue: { color: "#d7f15b", fontSize: 30, fontWeight: "900" },
  readinessLabel: { color: "#b4ccc4", fontSize: 10, marginTop: 2 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#edf0ef" },
  checkIcon: { color: "#9ba6a1", fontSize: 17 },
  checkIconComplete: { color: "#16a477" },
  checkLabel: { color: "#3d554b", fontSize: 12, fontWeight: "700" },
  missingBox: { backgroundColor: "#fff5ed", borderRadius: 10, padding: 12, marginTop: 14 },
  missingTitle: { color: "#9b562c", fontWeight: "800", fontSize: 11, marginBottom: 5 },
  missingItem: { color: "#875f48", fontSize: 10, lineHeight: 17 },
  documentRow: { borderWidth: 1, borderColor: "#d9e2de", borderRadius: 11, padding: 15, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  documentRowComplete: { borderColor: "#5dbb99", backgroundColor: "#f1faf7" },
  documentAction: { color: "#5a7167", fontSize: 11, fontWeight: "800" },
  signatureBox: { minHeight: 110, borderWidth: 1, borderStyle: "dashed", borderColor: "#bdcbc5", borderRadius: 11, padding: 14, marginBottom: 12, alignItems: "center", justifyContent: "center" },
  signatureComplete: { borderStyle: "solid", borderColor: "#5dbb99", backgroundColor: "#f1faf7" },
  signatureMark: { color: "#087253", fontSize: 16, fontWeight: "800", marginTop: 12 },
  signerCard: {
    backgroundColor: "white",
    borderColor: "#e1e6ea",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 38,
    paddingVertical: 28,
    shadowColor: "#5d6b76",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  signerPageTitle: { color: "#353a3e", fontSize: 24, fontWeight: "800", marginBottom: 22 },
  signerMetaGrid: { flexDirection: "row", flexWrap: "wrap", columnGap: 34, rowGap: 15, marginBottom: 15 },
  signerMetaItem: { flexBasis: "46%", minWidth: 280, flexDirection: "row", gap: 14 },
  signerMetaLabel: { color: "#5c6267", width: 175, fontSize: 13 },
  signerMetaValue: { color: "#343a3f", flex: 1, fontSize: 13, fontWeight: "700" },
  characterCount: { color: "#7d858b", fontSize: 11, textAlign: "right", marginTop: 6 },
  signerDivider: { height: 1, backgroundColor: "#e5e9ec", marginVertical: 25 },
  signerSectionTitle: { color: "#353a3e", fontSize: 21, fontWeight: "800", marginBottom: 4 },
  signerGrid: { flexDirection: "row", flexWrap: "wrap", columnGap: 22, rowGap: 1 },
  radioRow: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 24 },
  radioOption: { flexDirection: "row", alignItems: "center", gap: 8 },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: "#b9c5cc", alignItems: "center", justifyContent: "center" },
  radioCircleSelected: { borderColor: "#0789cf", borderWidth: 2 },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#0789cf" },
  radioLabel: { color: "#444b50", fontSize: 13 },
  signatureConfirmation: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 26 },
  paymentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 20 },
  paymentMethod: { flexGrow: 1, minWidth: 135, borderWidth: 1, borderColor: "#d4ded9", borderRadius: 12, padding: 18, alignItems: "center" },
  paymentMethodActive: { borderColor: "#0b7658", backgroundColor: "#eff9f5" },
  paymentIcon: { color: "#0b7658", fontSize: 25, fontWeight: "800" },
  paymentText: { color: "#52675e", fontWeight: "800", marginTop: 9, fontSize: 12 },
});
