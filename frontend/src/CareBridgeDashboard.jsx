/**
 * CareBridge UAE — demo dashboard (React + shadcn/ui)
 *
 * Bilingual (EN / AR, RTL) care-navigation console for the AWS Agentic AI Hackathon.
 * Built with shadcn/ui primitives (Radix UI + Tailwind CSS) and lucide-react icons.
 *
 * Demo mode: the Strands agent loop and tools are simulated in the browser with
 * synthetic data. To connect the real agent, replace agent.callTool() below with a
 * call to your backend that invokes AgentCore Runtime.
 *
 * Prototype only: does not diagnose, prescribe, or replace clinicians.
 */
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { DirectionProvider } from "@radix-ui/react-direction";
import {
  Activity as ActivityIcon, AlertTriangle, ArrowRightCircle, Bot, BrainCircuit, Building2, CalendarCheck, Check,
  CheckCircle2, Circle, Clock, Copy, Database, FileCheck2, FileClock, FileDown, FileText, FlaskConical, HeartPulse, Info,
  Languages, Loader2, Lock, MapPin, OctagonAlert, Pause, PauseCircle, Phone, RotateCcw, Route, SendHorizontal,
  Share2, ShieldAlert, ShieldCheck, Siren, Sparkles, Stethoscope, Timer, UserRound, Users, Wrench,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import * as backend from "@/lib/api";

/* ================================================================
   Copy (EN / AR) and synthetic starter-kit data
================================================================ */
const T = {
en:{
 tagline:"Safe next steps. The right story at the right appointment.",
 reset:"Start over", demoTag:"Demo mode", demoText:"Simulated agent and mock tools · synthetic patient data only · not medical advice",
 sRoute:"Route", sTools:"Tool calls", sTime:"Symptoms → handoff", sShared:"Shared with clinician",
 pChat:"Conversation", pActivity:"Agent activity", pMemory:"AgentCore Memory", pConsent:"Care snapshot", pHandoff:"Handoff",
 patient:"Gary · synthetic profile", send:"Send", placeholder:"Describe how you feel…", scenarios:"Try",
 tabEn:"Clinician · English", tabAr:"Patient / caregiver · العربية",
 rNone:"Not started", rRoutine:"Routine booking", rUrgent:"Urgent escalation", rRefused:"Refused request", rClarify:"Clarifying",
 of:"of", idle:"Idle", thinking:"Reasoning", waiting:"Waiting for Gary", done:"Complete", stopped:"Stopped",
 agent:"CareBridge", typing:"CareBridge is working",
 notTrig:"not triggered", skipped:"skipped",
 ev:{TRIAGE_GUIDANCE_RETRIEVED:"Approved triage guidance retrieved",RELEVANT_CONTEXT_RETRIEVED:"Minimum-necessary context retrieved",
  MEDICATION_REFERENCE_CHECKED:"Medication reference checked",PROVIDER_OPTIONS_FOUND:"Mock provider options found",
  BOOKING_AWAITING_CONFIRMATION:"Waiting for explicit confirmation",MOCK_BOOKING_CONFIRMED:"Mock booking confirmed",
  VISIT_SUMMARY_GENERATED:"Bilingual handoff generated",URGENT_ESCALATION_SHOWN:"Urgent / emergency escalation shown"},
 traceEmpty:"Tool calls appear here. Arguments containing health data are redacted (•••).",
 mLang:"Language", mConsent:"Consent", mAppt:"Appointment", mNext:"Next action",
 memFoot:"Only these four fields are stored. Symptoms, history, medicines and allergies are never written to memory.",
 consentLimited:(n)=>`Limited handoff · ${n} items`, cPending:"Awaiting booking", cReady:"Ready to approve", cApproved:"Approved",
 share:"Share", dontShare:"Not shared by default", purpose:"Purpose", purposeV:"this mock appointment only",
 cItems:{symptoms:"Symptoms and symptom timeline",meds:"Current medicines and allergies",history:"Relevant medical history for this concern",medflag:"Medication-reference question for clinician / pharmacist",fullHistory:"Full consultation history",family:"Full family history",unrelated:"Unrelated historical notes"},
 approve:"Approve snapshot & generate handoff", approveHint:"Available after a booking is confirmed. Changes after approval update the handoff instantly.",
 hEmpty:"The handoff appears here after Gary confirms a booking and approves the care snapshot.",
 copy:"Copy", copied:"Copied", proto:"Synthetic data · prototype",
 chips:[["happy","Headache + blurry vision"],["vague","Symptoms, no duration"],["red","Red-flag symptoms"],["dose","Ask for a dose"],["dx","Ask for a diagnosis"],["next","What is my next step?"]],
 msgs:{
  happy:"I have had a headache and blurry vision for three days.",
  vague:"I have a headache and my vision is blurry.",
  red:"My headache suddenly became severe, my vision is getting worse, and I feel weak on one side.",
  dose:"Tell me what medication and dose I should take.",
  dx:"What is my diagnosis? Is this a migraine or a stroke?",
  next:"What is my next step?"},
 a:{
  clarify:"To find the right next step, how long have you had these symptoms?",
  routine:"Based on the approved triage guidance, a headache with blurry vision lasting more than 24 hours, in someone with high blood pressure, should be assessed by a clinician today or tomorrow.\n\nI found three mock neurology appointments within 24 hours. Choose one and I will ask you to confirm before booking anything.",
  medflag:"Medication reference note for your clinician or pharmacist: your profile lists ibuprofen as needed alongside amlodipine. The reference lists NSAIDs as possibly affecting blood-pressure control. I added this as a question for your appointment. I can't advise starting, stopping or changing any medicine.",
  safety:"This is not medical advice. If symptoms suddenly get worse, call 998 or go to the nearest emergency department.",
  confirmQ:(p)=>`Book ${p.doc} at ${p.clinic}, ${p.when}?`, confirmH:"Explicit confirmation required",
  confirmYes:"Confirm mock booking", confirmNo:"Choose another",
  booked:(r,p)=>`Booked (mock). Reference ${r} with ${p.doc}, ${p.when}.\n\nNext: review what will be shared in the Care snapshot panel, then approve it to generate your handoff.`,
  cancelled:"No problem. Nothing was booked. Choose another option above.",
  handoff:"Your handoff is ready: an English summary for the clinician and an Arabic summary for you or your caregiver. I remembered only your language, consent choice, appointment reference and next step.",
  urgent:"I can't diagnose, but what you describe (sudden severe headache, worsening vision, weakness on one side) matches the emergency criteria in the approved triage guidance.\n\nDo not wait for a routine appointment. I have not booked anything.",
  urgentCall:"Call 998 now, or go to the nearest emergency department.",
  dose:"I can't recommend a medication or a dose. That decision needs a licensed healthcare professional. I can help you find appropriate care, prepare a summary for your appointment, or explain the next navigation step. If symptoms are worsening or feel urgent, please seek urgent or emergency care. This is not medical advice.",
  dx:"I can't diagnose or say what might be causing your symptoms. A licensed clinician needs to assess you. I can help you find appropriate care or prepare a summary for your appointment. If symptoms are worsening or feel urgent, please seek urgent or emergency care. This is not medical advice.",
  nextBooked:(b)=>`Your next step: attend your mock appointment ${b.ref} with ${b.p.doc}, ${b.p.when}, and bring your handoff. If symptoms get worse before then, call 998.`,
  nextNone:"You don't have an appointment yet. Tell me your symptoms and how long you've had them, and I'll find the right next step.",
  pickFirst:"Choose one of the appointment options first, then I'll ask you to confirm.",
  fallback:"I help with care navigation. Describe your symptoms and how long you've had them, and I'll find the right next step. This is not medical advice."},
 footer:"Prototype uses synthetic data and simulated provider tools. CareBridge UAE supports healthcare navigation; it does not diagnose, prescribe, or replace clinicians."
},
ar:{
 tagline:"خطوات آمنة تالية. القصة الصحيحة في الموعد الصحيح.",
 reset:"البدء من جديد", demoTag:"وضع العرض", demoText:"وكيل وأدوات محاكاة · بيانات مرضى اصطناعية فقط · ليست نصيحة طبية",
 sRoute:"المسار", sTools:"استدعاءات الأدوات", sTime:"من الأعراض إلى الملخص", sShared:"تمت مشاركته مع الطبيب",
 pChat:"المحادثة", pActivity:"نشاط الوكيل", pMemory:"ذاكرة AgentCore", pConsent:"لقطة الرعاية", pHandoff:"ملخص التسليم",
 patient:"غاري · ملف اصطناعي", send:"إرسال", placeholder:"صف ما تشعر به…", scenarios:"جرّب",
 tabEn:"الطبيب · English", tabAr:"المريض ومقدم الرعاية · العربية",
 rNone:"لم يبدأ", rRoutine:"حجز روتيني", rUrgent:"تصعيد عاجل", rRefused:"طلب مرفوض", rClarify:"استيضاح",
 of:"من", idle:"خامل", thinking:"يفكّر", waiting:"بانتظار غاري", done:"مكتمل", stopped:"متوقف",
 agent:"كير بريدج", typing:"كير بريدج يعمل",
 notTrig:"لم يُفعَّل", skipped:"تم التخطي",
 ev:{TRIAGE_GUIDANCE_RETRIEVED:"تم استرجاع إرشادات الفرز المعتمدة",RELEVANT_CONTEXT_RETRIEVED:"تم استرجاع الحد الأدنى من السياق",
  MEDICATION_REFERENCE_CHECKED:"تم فحص مرجع الأدوية",PROVIDER_OPTIONS_FOUND:"تم العثور على مقدمي رعاية تجريبيين",
  BOOKING_AWAITING_CONFIRMATION:"بانتظار تأكيد صريح",MOCK_BOOKING_CONFIRMED:"تم تأكيد الحجز التجريبي",
  VISIT_SUMMARY_GENERATED:"تم إنشاء الملخص ثنائي اللغة",URGENT_ESCALATION_SHOWN:"تم عرض التصعيد العاجل / الطارئ"},
 traceEmpty:"تظهر استدعاءات الأدوات هنا. يتم إخفاء أي بيانات صحية في المعاملات (•••).",
 mLang:"اللغة", mConsent:"الموافقة", mAppt:"الموعد", mNext:"الخطوة التالية",
 memFoot:"تُحفظ هذه الحقول الأربعة فقط. لا تُكتب الأعراض أو التاريخ الطبي أو الأدوية أو الحساسية في الذاكرة أبداً.",
 consentLimited:(n)=>`مشاركة محدودة · ${n} عناصر`, cPending:"بانتظار الحجز", cReady:"جاهز للموافقة", cApproved:"تمت الموافقة",
 share:"مشاركة", dontShare:"لا تتم مشاركته افتراضياً", purpose:"الغرض", purposeV:"هذا الموعد التجريبي فقط",
 cItems:{symptoms:"الأعراض وتسلسلها الزمني",meds:"الأدوية الحالية والحساسية",history:"التاريخ الطبي ذو الصلة بهذه الحالة",medflag:"سؤال مرجعي حول الأدوية للطبيب أو الصيدلي",fullHistory:"سجل الاستشارات الكامل",family:"التاريخ العائلي الكامل",unrelated:"الملاحظات السابقة غير ذات الصلة"},
 approve:"الموافقة على اللقطة وإنشاء الملخص", approveHint:"متاح بعد تأكيد الحجز. أي تغيير بعد الموافقة يُحدّث الملخص فوراً.",
 hEmpty:"يظهر ملخص التسليم هنا بعد أن يؤكد غاري الحجز ويوافق على لقطة الرعاية.",
 copy:"نسخ", copied:"تم النسخ", proto:"بيانات اصطناعية · نموذج أولي",
 chips:[["happy","صداع وتشوش في الرؤية"],["vague","أعراض بدون مدة"],["red","أعراض خطرة"],["dose","طلب جرعة دواء"],["dx","طلب تشخيص"],["next","ما هي خطوتي التالية؟"]],
 msgs:{
  happy:"أعاني من صداع وتشوش في الرؤية منذ ثلاثة أيام.",
  vague:"أعاني من صداع ورؤيتي مشوشة.",
  red:"أصبح الصداع فجأة شديداً، ورؤيتي تزداد سوءاً، وأشعر بضعف في جانب واحد.",
  dose:"أخبرني ما الدواء والجرعة التي يجب أن أتناولها.",
  dx:"ما هو تشخيصي؟ هل هذا صداع نصفي أم سكتة دماغية؟",
  next:"ما هي خطوتي التالية؟"},
 a:{
  clarify:"لتحديد الخطوة التالية المناسبة، منذ متى تعاني من هذه الأعراض؟",
  routine:"وفقاً لإرشادات الفرز المعتمدة، يُنصح بأن يقيّم الطبيبُ الصداعَ المصحوب بتشوش الرؤية الذي يستمر أكثر من 24 ساعة لدى شخص يعاني من ارتفاع ضغط الدم، خلال اليوم أو الغد.\n\nوجدت ثلاثة مواعيد تجريبية في طب الأعصاب خلال 24 ساعة. اختر موعداً وسأطلب تأكيدك قبل حجز أي شيء.",
  medflag:"ملاحظة مرجعية للطبيب أو الصيدلي: يذكر ملفك تناول الإيبوبروفين عند الحاجة مع أملوديبين. ويشير المرجع إلى أن مضادات الالتهاب غير الستيرويدية قد تؤثر على التحكم في ضغط الدم. أضفت ذلك كسؤال لموعدك. لا يمكنني تقديم نصيحة ببدء أي دواء أو إيقافه أو تغييره.",
  safety:"هذه ليست نصيحة طبية. إذا ساءت الأعراض فجأة، اتصل بالرقم 998 أو توجّه إلى أقرب قسم طوارئ.",
  confirmQ:(p)=>`هل تريد الحجز مع ${p.docAr} في ${p.clinicAr}، ${p.whenAr}؟`, confirmH:"مطلوب تأكيد صريح",
  confirmYes:"تأكيد الحجز التجريبي", confirmNo:"اختيار موعد آخر",
  booked:(r,p)=>`تم الحجز (تجريبي). الرقم المرجعي ${r} مع ${p.docAr}، ${p.whenAr}.\n\nالخطوة التالية: راجع ما ستتم مشاركته في لوحة لقطة الرعاية، ثم وافق عليه لإنشاء ملخص التسليم.`,
  cancelled:"لا مشكلة. لم يتم حجز أي موعد. اختر خياراً آخر من الأعلى.",
  handoff:"ملخص التسليم جاهز: ملخص بالإنجليزية للطبيب وملخص بالعربية لك أو لمقدم الرعاية. احتفظت فقط بلغتك وخيار الموافقة ورقم الموعد والخطوة التالية.",
  urgent:"لا يمكنني التشخيص، لكن ما تصفه (صداع شديد مفاجئ، وتدهور الرؤية، وضعف في جانب واحد) يطابق معايير الطوارئ في إرشادات الفرز المعتمدة.\n\nلا تنتظر موعداً روتينياً. لم أقم بحجز أي موعد.",
  urgentCall:"اتصل الآن بالرقم 998، أو توجّه إلى أقرب قسم طوارئ.",
  dose:"لا يمكنني التوصية بدواء أو جرعة. هذا القرار يحتاج إلى أخصائي رعاية صحية مرخّص. يمكنني مساعدتك في إيجاد الرعاية المناسبة، أو إعداد ملخص لموعدك، أو شرح خطوة التوجيه التالية. إذا كانت الأعراض تزداد سوءاً أو تبدو طارئة، يُرجى طلب الرعاية العاجلة أو الطارئة. هذه ليست نصيحة طبية.",
  dx:"لا يمكنني التشخيص أو تحديد السبب المحتمل لأعراضك. يجب أن يقيّمك طبيب مرخّص. يمكنني مساعدتك في إيجاد الرعاية المناسبة أو إعداد ملخص لموعدك. إذا كانت الأعراض تزداد سوءاً أو تبدو طارئة، يُرجى طلب الرعاية العاجلة أو الطارئة. هذه ليست نصيحة طبية.",
  nextBooked:(b)=>`خطوتك التالية: حضور موعدك التجريبي ${b.ref} مع ${b.p.docAr}، ${b.p.whenAr}، وإحضار ملخص التسليم. إذا ساءت الأعراض قبل ذلك، اتصل بالرقم 998.`,
  nextNone:"لا يوجد لديك موعد بعد. أخبرني بأعراضك ومنذ متى تعاني منها، وسأحدد الخطوة التالية المناسبة.",
  pickFirst:"اختر أحد المواعيد أولاً، ثم سأطلب تأكيدك.",
  fallback:"أساعدك في التوجيه إلى الرعاية المناسبة. صف أعراضك ومنذ متى تعاني منها، وسأحدد الخطوة التالية. هذه ليست نصيحة طبية."},
 footer:"يستخدم النموذج الأولي بيانات اصطناعية وأدوات مقدمي رعاية محاكاة. يدعم كير بريدج الإمارات التوجيه الصحي؛ ولا يقوم بالتشخيص أو وصف الأدوية أو استبدال الأطباء."
}};

/* ---------------- synthetic data (mock starter-kit records) ---------------- */
const PATIENT = {
  history:"Hypertension (since 2019)", historyAr:"ارتفاع ضغط الدم (منذ 2019)",
  meds:["Amlodipine 5 mg once daily","Ibuprofen as needed (self-reported, over the counter)"],
  medsAr:["أملوديبين 5 ملغ مرة يومياً","إيبوبروفين عند الحاجة (بإفادة المريض، دون وصفة)"],
  allergies:"Penicillin", allergiesAr:"البنسلين",
  fullHistory:["2019-03 · GP: hypertension diagnosed","2024-11 · GP: blood-pressure review"],
  fullHistoryAr:["2019-03 · طبيب عام: تشخيص ارتفاع ضغط الدم","2024-11 · طبيب عام: مراجعة ضغط الدم"],
  family:"Father: hypertension · Mother: type 2 diabetes", familyAr:"الأب: ارتفاع ضغط الدم · الأم: السكري من النوع الثاني",
  unrelated:"2016 · Knee arthroscopy", unrelatedAr:"2016 · تنظير الركبة"
};
const PROVIDERS = [
  {id:"PRV-NEU-014",doc:"Dr. Khalid Al Mansouri",docAr:"د. خالد المنصوري",clinic:"Creek Neurology Clinic",clinicAr:"عيادة الخور للأعصاب",area:"Dubai Healthcare City",areaAr:"مدينة دبي الطبية",when:"today 4:30 PM",whenAr:"اليوم 4:30 مساءً",short:"4:30 PM",km:6.2,langs:"Arabic, English",langsAr:"العربية، الإنجليزية"},
  {id:"PRV-NEU-027",doc:"Dr. Priya Nair",docAr:"د. بريا ناير",clinic:"Al Barsha Medical Centre",clinicAr:"مركز البرشاء الطبي",area:"Al Barsha",areaAr:"البرشاء",when:"tomorrow 10:00 AM",whenAr:"غداً 10:00 صباحاً",short:"10:00 AM",km:9.8,langs:"English, Hindi, Malayalam",langsAr:"الإنجليزية، الهندية، المالايالامية"},
  {id:"PRV-NEU-031",doc:"Dr. Omar Haddad",docAr:"د. عمر حداد",clinic:"Jumeirah Specialist Clinic",clinicAr:"عيادة جميرا التخصصية",area:"Jumeirah",areaAr:"جميرا",when:"tomorrow 2:00 PM",whenAr:"غداً 2:00 مساءً",short:"2:00 PM",km:12.4,langs:"Arabic, English, French",langsAr:"العربية، الإنجليزية، الفرنسية"}
];


/* ================================================================
   Agent adapter + state machine (unchanged behaviour, demo mode)
   To go live, replace agent.callTool() with a call to your backend that
   invokes AgentCore Runtime, and map returned activity events onto mark().
================================================================ */
const EVENTS = ["TRIAGE_GUIDANCE_RETRIEVED","RELEVANT_CONTEXT_RETRIEVED","MEDICATION_REFERENCE_CHECKED","PROVIDER_OPTIONS_FOUND","BOOKING_AWAITING_CONFIRMATION","MOCK_BOOKING_CONFIRMED","VISIT_SUMMARY_GENERATED","URGENT_ESCALATION_SHOWN"];
const SHARE_KEYS = ["symptoms","meds","history","medflag"];
const EXTRA_KEYS = ["fullHistory","family","unrelated"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => performance.now();
const DUR = /(\d|day|week|hour|since|yesterday|ثلاث|يوم|أيام|ساع|أسبوع|أمس)/;

/* Live agent adapter.
   `callTool(real, ms)` calls the FastAPI backend when `real = { name, args }`
   maps to a known tool endpoint, measuring real latency. For book-keeping tools
   without a backend (memory.*), or if the backend is unreachable, it falls back
   to the original simulated delay so the demo never hard-breaks. The last tool
   result is stashed on `agent.lastResult` for callers that need real data
   (e.g. the backend-issued booking reference). */
const TOOL_ENDPOINT = {
  retrieve_guidance: "retrieve_guidance",
  get_patient_profile: "get_patient_profile",
  check_medication_interactions: "check_medication_interactions",
  search_providers: "search_providers",
  book_appointment: "book_appointment",
  generate_visit_summary: "generate_visit_summary",
};

const agent = {
  lastResult: null,
  online: null, // set by the health check in the page component
  async callTool(real, ms) {
    if (!real || !TOOL_ENDPOINT[real.name]) {
      await sleep(ms);
      this.lastResult = { ok: true, simulated: true };
      return this.lastResult;
    }
    try {
      const data = await backend.callTool(TOOL_ENDPOINT[real.name], real.args || {});
      this.lastResult = data;
      return data;
    } catch (_) {
      await sleep(ms); // graceful offline fallback keeps the choreography intact
      this.lastResult = { ok: true, offline: true };
      return this.lastResult;
    }
  },
};

function classify(txt, awaitingDuration) {
  const t = txt.toLowerCase();
  if (/(sudden|suddenly|worst|one side|weak|numb|slurred|speech|faint|confus|فجأة|ضعف|جانب واحد|خدر|إغماء)/.test(t)) return "red";
  if (/(dose|dosage|medication should|medicine should|what medication|which medication|should i take|prescri|stop my medication|twice my|جرعة|وصف|ما الدواء|أي دواء)/.test(t)) return "dose";
  if (/(diagnos|what is wrong|is this a|is it a|migraine|stroke|dehydrat|what's causing|تشخيص|سكتة|صداع نصفي|ما السبب)/.test(t)) return "dx";
  if (/(next step|what now|what should i do next|خطوتي التالية|الخطوة التالية)/.test(t)) return "next";
  if (/(book|4:30|confirm|yes|نعم|أكد|احجز)/.test(t)) return "book";
  if (awaitingDuration && DUR.test(t)) return "duration";
  if (/(headache|vision|blur|pain|dizz|nause|صداع|رؤية|الرؤية|تشوش|مشوشة|ألم|دوار)/.test(t)) return DUR.test(t) ? "symptoms" : "vague";
  return "other";
}

const initial = (lang = "en") => ({
  lang, tab: lang, route: null, loop: "idle", tools: 0, t0: null, t1: null,
  ev: {}, trace: [], msgs: [], busy: false, typing: false, awaitingDuration: false,
  optionsShown: false, selected: null, booking: null, approved: false,
  consent: { symptoms: true, meds: true, history: true, medflag: true, fullHistory: false, family: false, unrelated: false },
  memory: null,
});
const sharedCount = (c) => [...SHARE_KEYS, ...EXTRA_KEYS].filter((k) => c[k]).length;
const fmt = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); };
const tr = (lang, en, ar) => (lang === "ar" ? ar : en);

/* ================================================================
   Presentational components (shadcn/ui)
================================================================ */
function Kpi({ icon: Icon, label, children, hint }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground"><Icon className="size-[18px]" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className="mt-1 flex min-h-7 items-center gap-2 text-xl font-semibold tabular-nums">{children}</div>
          {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Stats({ s, l, clock }) {
  const route = {
    null: ["muted", l.rNone], clarify: ["warning", l.rClarify], routine: ["success", l.rRoutine],
    urgent: ["danger", l.rUrgent], refused: ["danger", l.rRefused],
  }[s.route];
  let elapsed = "00:00";
  if (s.t0) {
    const end = s.t1 || (s.route === "urgent" ? s.t0 + (s.ev.URGENT_ESCALATION_SHOWN?.at || 0) : clock);
    elapsed = fmt(end - s.t0);
  }
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Session summary">
      <Kpi icon={Route} label={l.sRoute} hint={tr(s.lang, "Agent route decision", "قرار المسار من الوكيل")}>
        <Badge variant={route[0]} className="text-sm"><span className="size-1.5 rounded-full bg-current" />{route[1]}</Badge>
      </Kpi>
      <Kpi icon={Wrench} label={l.sTools} hint={tr(s.lang, "via AgentCore Gateway (MCP)", "عبر AgentCore Gateway (MCP)")}>{s.tools}</Kpi>
      <Kpi icon={Timer} label={l.sTime} hint={tr(s.lang, "Measured live in this session", "يُقاس مباشرة في هذه الجلسة")}>
        {elapsed}{s.t1 && <Badge variant="success"><CheckCircle2 />{tr(s.lang, "done", "تم")}</Badge>}
      </Kpi>
      <Kpi icon={Share2} label={l.sShared} hint={tr(s.lang, "Minimum-necessary by default", "الحد الأدنى الضروري افتراضياً")}>
        {sharedCount(s.consent)}<span className="text-sm font-normal text-muted-foreground">{l.of} 7</span>
      </Kpi>
    </section>
  );
}

function AgentBubble({ l, label, children, className, wide }) {
  return (
    <div className={cn("flex items-start gap-2.5", wide && "w-full")}>
      <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Bot className="size-4" /></div>
      <div className={cn("min-w-0 rounded-xl rounded-ss-sm border bg-muted/60 px-3.5 py-2.5 text-sm leading-relaxed", wide ? "flex-1" : "max-w-[85%]", className)}>
        <p className="mb-1 text-xs font-semibold text-primary">{label || l.agent}</p>
        {children}
      </div>
    </div>
  );
}

function ProviderOptions({ s, l, onPick }) {
  const ar = s.lang === "ar";
  const locked = !!s.booking || s.route === "urgent";
  return (
    <AgentBubble l={l} label={`${l.agent} · search_providers`} wide>
      <div className="mt-1 grid gap-2">
        {PROVIDERS.map((p) => {
          const sel = s.selected?.id === p.id;
          return (
            <button key={p.id} type="button" disabled={locked} onClick={() => onPick(p)}
              className={cn("group rounded-lg border bg-card p-3 text-start transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-60 disabled:hover:border-border",
                sel && "border-primary ring-1 ring-primary")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Stethoscope className="size-4 shrink-0 text-primary" />
                  <span className="truncate font-semibold">{ar ? p.docAr : p.doc}</span>
                </div>
                <Badge variant={sel ? "default" : "info"} className="shrink-0"><Clock />{ar ? p.whenAr : p.when}</Badge>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Building2 className="size-3" />{ar ? p.clinicAr : p.clinic}</span>
                <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{ar ? p.areaAr : p.area} · {p.km} {ar ? "كم" : "km"}</span>
                <span className="inline-flex items-center gap-1"><Languages className="size-3" />{ar ? p.langsAr : p.langs}</span>
                <Badge variant="muted" className="font-medium">{ar ? "مقدم تجريبي" : "Mock provider"}</Badge>
              </div>
            </button>
          );
        })}
      </div>
    </AgentBubble>
  );
}

function Message({ m, s, l, actions }) {
  const a = l.a;
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div dir="auto" className="max-w-[85%] whitespace-pre-wrap rounded-xl rounded-se-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground shadow-sm">{m.text}</div>
      </div>
    );
  }
  if (m.type === "options") return <ProviderOptions s={s} l={l} onPick={actions.pick} />;
  if (m.type === "confirm") {
    if (!s.selected) return null;
    return (
      <Alert variant="warning">
        <PauseCircle className="size-4" />
        <AlertTitle className="text-xs uppercase tracking-wide text-warning">{a.confirmH}</AlertTitle>
        <AlertDescription>
          <p>{a.confirmQ(s.selected)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={actions.confirm}><CalendarCheck />{a.confirmYes}</Button>
            <Button size="sm" variant="outline" onClick={actions.cancel}>{a.confirmNo}</Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }
  if (m.type === "urgent") {
    return (
      <Alert variant="destructive" className="border-destructive">
        <Siren className="size-4" />
        <AlertTitle className="font-mono text-xs">URGENT_ESCALATION_SHOWN</AlertTitle>
        <AlertDescription className="text-foreground">
          <p className="whitespace-pre-wrap">{a.urgent}</p>
          <p className="mt-3 flex items-center gap-2 text-lg font-bold text-destructive"><Phone className="size-5 shrink-0" />{a.urgentCall}</p>
          <p className="mt-2 text-xs text-muted-foreground">{a.safety}</p>
        </AlertDescription>
      </Alert>
    );
  }
  let text = m.raw != null ? m.raw : a[m.k];
  if (m.k === "booked") text = a.booked(s.booking.ref, s.booking.p);
  if (m.k === "nextBooked") text = a.nextBooked(s.booking);
  return (
    <AgentBubble l={l} className={cn(m.refusal && "border-s-4 border-s-destructive")}>
      {m.refusal && <Badge variant="danger" className="mb-1.5"><ShieldAlert />{tr(s.lang, "Safety boundary", "حدود السلامة")}</Badge>}
      <p className="whitespace-pre-wrap">{text}</p>
      {m.safety && <p className="mt-2 flex gap-1.5 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" />{a.safety}</p>}
    </AgentBubble>
  );
}

function Chat({ s, l, actions }) {
  const viewport = useRef(null);
  const [draft, setDraft] = useState("");
  useEffect(() => { const v = viewport.current; if (v) v.scrollTop = v.scrollHeight; }, [s.msgs, s.typing, s.selected]);
  const submit = (e) => { e.preventDefault(); const v = draft; setDraft(""); actions.send(v); };
  return (
    <Card className="flex flex-col lg:col-span-5">
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-full bg-accent text-accent-foreground"><UserRound className="size-[18px]" /></div>
          <div>
            <CardTitle className="text-base">{l.pChat}</CardTitle>
            <CardDescription className="text-xs">{l.patient}</CardDescription>
          </div>
        </div>
        <Badge variant="outline" className="font-medium"><Database />{tr(s.lang, "Synthetic data", "بيانات اصطناعية")}</Badge>
      </CardHeader>
      <Separator />
      <ScrollArea className="h-[520px]" viewportRef={viewport}>
        <div className="flex flex-col gap-3 p-5" aria-live="polite">
          {!s.msgs.length && <AgentBubble l={l}><p>{l.a.fallback}</p></AgentBubble>}
          {s.msgs.map((m, i) => <Message key={i} m={m} s={s} l={l} actions={actions} />)}
          {s.typing && (
            <div className="flex items-center gap-2 ps-10 text-xs text-muted-foreground">
              <span className="flex gap-1"><span className="size-1.5 animate-blink rounded-full bg-muted-foreground" /><span className="size-1.5 animate-blink rounded-full bg-muted-foreground [animation-delay:.15s]" /><span className="size-1.5 animate-blink rounded-full bg-muted-foreground [animation-delay:.3s]" /></span>
              {l.typing}
            </div>
          )}
        </div>
      </ScrollArea>
      <Separator />
      <div className="flex flex-wrap items-center gap-1.5 px-5 pt-3">
        <span className="me-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><Sparkles className="size-3.5" />{l.scenarios}</span>
        {l.chips.map(([k, v]) => (
          <Button key={k} type="button" size="sm" variant="outline" disabled={s.busy}
            className={cn("h-7 rounded-full px-3 font-normal", k === "red" && "border-destructive/40 text-destructive hover:bg-destructive-soft hover:text-destructive")}
            onClick={() => actions.send(l.msgs[k])}>{v}</Button>
        ))}
      </div>
      <form className="flex gap-2 p-5 pt-3" onSubmit={submit}>
        <Textarea id="input" rows={1} aria-label="Message" placeholder={l.placeholder} value={draft} disabled={s.busy}
          className="min-h-10 resize-none bg-muted/40"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) submit(e); }} />
        <Button type="submit" disabled={s.busy} className="h-auto"><SendHorizontal className="rtl:-scale-x-100" /><span className="hidden sm:inline">{l.send}</span></Button>
      </form>
    </Card>
  );
}

function StepIcon({ state, index }) {
  const base = "relative z-10 grid size-6 shrink-0 place-items-center rounded-full border-2 text-[11px] font-bold";
  if (state === "done") return <span className={cn(base, "border-success bg-success text-success-foreground")}><Check className="size-3.5" strokeWidth={3} /></span>;
  if (state === "wait") return <span className={cn(base, "border-warning bg-warning text-warning-foreground")}><Pause className="size-3" strokeWidth={3} /></span>;
  if (state === "alert") return <span className={cn(base, "border-destructive bg-destructive text-destructive-foreground")}><AlertTriangle className="size-3" strokeWidth={3} /></span>;
  return <span className={cn(base, "border-border bg-card text-muted-foreground")}>{index}</span>;
}

function Activity({ s, l }) {
  const viewport = useRef(null);
  useEffect(() => { const v = viewport.current; if (v) v.scrollTop = v.scrollHeight; }, [s.trace]);
  const st = { idle: ["muted", l.idle, Circle], thinking: ["info", l.thinking, Loader2], waiting: ["warning", l.waiting, PauseCircle], done: ["success", l.done, CheckCircle2], stopped: ["danger", l.stopped, OctagonAlert] }[s.loop];
  const StIcon = st[2];
  const doneCount = EVENTS.filter((c) => ["done", "alert"].includes(s.ev[c]?.state)).length;
  const total = s.route === "urgent" ? 2 : 7;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <div className="flex items-center gap-2"><ActivityIcon className="size-4 text-primary" /><CardTitle className="text-base">{l.pActivity}</CardTitle></div>
        <Badge variant={st[0]}><StIcon className={cn(s.loop === "thinking" && "animate-spin")} />{st[1]}</Badge>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="mb-3 flex items-center gap-3">
          <Progress value={(doneCount / total) * 100} className="h-1.5" indicatorClassName={s.route === "urgent" ? "bg-destructive" : "bg-primary"} />
          <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{doneCount}/{total}</span>
        </div>
        <ol className="flex flex-col">
          {EVENTS.map((c, i) => {
            const e = s.ev[c];
            let extra = "";
            if (e?.state === "done" || e?.state === "alert") extra = `+${(e.at / 1000).toFixed(1)}s`;
            if (e?.state === "skip") extra = c === "URGENT_ESCALATION_SHOWN" ? l.notTrig : l.skipped;
            return (
              <li key={c} className={cn("relative grid grid-cols-[24px_1fr_auto] gap-3 py-1.5", e?.state === "skip" && "opacity-45",
                i < EVENTS.length - 1 && "after:absolute after:start-[11px] after:top-8 after:-bottom-1.5 after:w-0.5 after:bg-border")}>
                <StepIcon state={e?.state} index={c === "URGENT_ESCALATION_SHOWN" ? "!" : i + 1} />
                <div className="min-w-0">
                  <p className="break-all font-mono text-[11px] font-medium leading-5">{c}</p>
                  <p className="text-xs text-muted-foreground">{l.ev[c]}</p>
                </div>
                <span className="pt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">{extra}</span>
              </li>
            );
          })}
        </ol>
      </CardContent>
      <Separator />
      <div className="flex items-center justify-between px-5 pb-1 pt-3">
        <p className="text-xs font-semibold text-muted-foreground">{tr(s.lang, "Tool calls", "استدعاءات الأدوات")}</p>
        <Tooltip>
          <TooltipTrigger asChild><button className="text-muted-foreground hover:text-foreground" aria-label="About redaction"><Info className="size-3.5" /></button></TooltipTrigger>
          <TooltipContent>{l.traceEmpty}</TooltipContent>
        </Tooltip>
      </div>
      <ScrollArea className="h-56" viewportRef={viewport}>
        <div className="px-3 pb-3" dir="ltr">
          {!s.trace.length ? <p className="px-2 py-6 text-center text-xs text-muted-foreground">{l.traceEmpty}</p> : (
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Tool</TableHead><TableHead className="w-16 text-end">Latency</TableHead></TableRow></TableHeader>
              <TableBody>
                {s.trace.map((r, i) => (
                  <TableRow key={i} className={cn(r.cls === "gate" && "bg-warning-soft hover:bg-warning-soft", r.cls === "block" && "bg-destructive-soft hover:bg-destructive-soft")}>
                    <TableCell className="font-mono text-[11px] leading-snug">
                      <span className={cn("font-medium text-primary", r.cls === "gate" && "text-warning", r.cls === "block" && "text-destructive")}>{r.fn}</span>
                      <span className="block break-all text-muted-foreground">({r.args})</span>
                    </TableCell>
                    <TableCell className="text-end font-mono text-[11px] tabular-nums text-muted-foreground">
                      {r.ms != null ? `${r.ms} ms` : r.cls === "gate" ? <Badge variant="warning">wait</Badge> : !r.cls ? <Loader2 className="ms-auto size-3.5 animate-spin" /> : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}

function Memory({ s, l }) {
  const m = s.memory, ar = s.lang === "ar";
  let lang = "—", consent = "—", appt = "—", next = "—";
  if (m) {
    lang = m.lang === "ar" ? (ar ? "العربية" : "Arabic") : (ar ? "الإنجليزية" : "English");
    consent = m.consentN == null ? "—" : l.consentLimited(m.consentN);
    appt = m.ref ? `${m.ref} · ${ar ? "مؤكد (تجريبي)" : "confirmed (mock)"}` : "—";
    next = m.next === "attend" ? (ar ? "حضور الموعد مع ملخص التسليم" : "Attend appointment with handoff")
      : m.next === "emergency" ? (ar ? "طلب رعاية طارئة (998)" : "Seek emergency care (998)") : "—";
  }
  const rows = [[Languages, l.mLang, lang], [ShieldCheck, l.mConsent, consent], [CalendarCheck, l.mAppt, appt], [ArrowRightCircle, l.mNext, next]];
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2"><BrainCircuit className="size-4 text-primary" /><CardTitle className="text-base">{l.pMemory}</CardTitle></div>
        <Badge variant={m ? "success" : "muted"}>{m ? tr(s.lang, "4 fields", "4 حقول") : tr(s.lang, "empty", "فارغة")}</Badge>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-2.5">
          {rows.map(([Icon, k, v]) => (
            <div key={k} className="flex items-start gap-2.5 text-sm">
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <dt className="w-24 shrink-0 text-muted-foreground">{k}</dt>
              <dd className={cn("min-w-0 break-words font-medium", v === "—" && "text-muted-foreground")}>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 flex gap-2 rounded-md bg-muted p-2.5 text-xs text-muted-foreground"><Lock className="mt-0.5 size-3.5 shrink-0" />{l.memFoot}</p>
      </CardContent>
    </Card>
  );
}

function ConsentRow({ k, s, l, actions, extra }) {
  const on = s.consent[k];
  return (
    <label htmlFor={"ck-" + k}
      className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50",
        on && !extra && "border-primary/30 bg-accent/60 hover:bg-accent", on && extra && "border-warning/40 bg-warning-soft hover:bg-warning-soft",
        s.route === "urgent" && "cursor-not-allowed opacity-60")}>
      <Checkbox id={"ck-" + k} checked={on} disabled={s.route === "urgent"} onCheckedChange={(v) => actions.toggle(k, v === true)} className="mt-0.5" />
      <span className="leading-snug">{l.cItems[k]}</span>
      {extra && on && <Badge variant="warning" className="ms-auto shrink-0">{tr(s.lang, "opted in", "بموافقة")}</Badge>}
    </label>
  );
}

function Consent({ s, l, actions }) {
  const st = s.approved ? ["success", l.cApproved, CheckCircle2] : s.booking ? ["warning", l.cReady, PauseCircle] : ["muted", l.cPending, Circle];
  const StIcon = st[2];
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><CardTitle className="text-base">{l.pConsent}</CardTitle></div>
        <Badge variant={st[0]}><StIcon />{st[1]}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground rtl:tracking-normal">{l.share}</p>
          {SHARE_KEYS.map((k) => <ConsentRow key={k} k={k} s={s} l={l} actions={actions} />)}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground rtl:tracking-normal">{l.dontShare}</p>
          {EXTRA_KEYS.map((k) => <ConsentRow key={k} k={k} s={s} l={l} actions={actions} extra />)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-xs">
          <span className="text-muted-foreground">{l.purpose}: <b className="font-semibold text-foreground">{l.purposeV}</b></span>
          <span className="font-mono tabular-nums text-muted-foreground">{sharedCount(s.consent)} {l.of} 7</span>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2">
        <Button id="approve" disabled={!s.booking || s.approved || s.busy} onClick={actions.approve}><FileCheck2 />{l.approve}</Button>
        <p className="text-xs text-muted-foreground">{l.approveHint}</p>
      </CardFooter>
    </Card>
  );
}

function Sec({ label, children, added }) {
  return (
    <div className={cn("space-y-1", added && "rounded-md bg-warning-soft p-2.5")}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground rtl:text-xs rtl:tracking-normal">{label}</p>
      <div className="text-sm leading-relaxed [&_ul]:list-disc [&_ul]:space-y-0.5 [&_ul]:ps-5">{children}</div>
    </div>
  );
}
function HandoffEN({ s }) {
  const c = s.consent, b = s.booking, p = b.p;
  return (<div className="space-y-4">
    <h4 className="text-base font-semibold">Clinician Handoff — Prototype</h4>
    {c.symptoms && <Sec label="Reported symptoms and duration">Headache and blurry vision, 3 days (patient-reported). Onset Day 1; navigation request on Day 3.</Sec>}
    {c.history && <Sec label="Relevant patient-confirmed context">{PATIENT.history}</Sec>}
    {c.meds && <Sec label="Current medicines and allergies"><ul>{PATIENT.meds.map((x) => <li key={x}>{x}</li>)}<li>Allergy: {PATIENT.allergies}</li></ul></Sec>}
    {c.medflag && <Sec label="Medication-reference item for clinician / pharmacist">NSAID use (ibuprofen, as needed) alongside amlodipine: reference lists possible effect on blood-pressure control. For review only.</Sec>}
    {c.fullHistory && <Sec added label="Full consultation history (patient opted in)"><ul>{PATIENT.fullHistory.map((x) => <li key={x}>{x}</li>)}</ul></Sec>}
    {c.family && <Sec added label="Family history (patient opted in)">{PATIENT.family}</Sec>}
    {c.unrelated && <Sec added label="Other historical notes (patient opted in)">{PATIENT.unrelated}</Sec>}
    <Sec label="Appointment details">{p.doc} · Neurology · {p.clinic}, {p.area} · {p.when} · Ref <span className="font-mono">{b.ref}</span> (mock)</Sec>
    <Sec label="Patient questions for clinician"><ul><li>What signs mean I should go to emergency care?</li><li>Should I keep using ibuprofen for the headache?</li><li>Do I need a blood-pressure check today?</li></ul></Sec>
    <Alert variant="destructive" className="py-2.5"><ShieldAlert className="size-4" /><AlertDescription className="text-foreground">Safety note: navigation support only; not a diagnosis or treatment plan. Synthetic data · prototype.</AlertDescription></Alert>
  </div>);
}
function HandoffAR({ s }) {
  const c = s.consent, b = s.booking, p = b.p;
  const shared = [...SHARE_KEYS, ...EXTRA_KEYS].filter((k) => c[k]);
  const notShared = EXTRA_KEYS.filter((k) => !c[k]);
  return (<div className="space-y-4 font-arabic">
    <h4 className="text-base font-semibold">ملخص الزيارة للمريض ومقدم الرعاية</h4>
    <Sec label="الخطوة التالية">حضور الموعد التجريبي وإحضار هذا الملخص. يُنصح بتقييم الطبيب خلال اليوم أو الغد وفقاً لإرشادات الفرز المعتمدة.</Sec>
    <Sec label="الموعد">{p.docAr} · طب الأعصاب · {p.clinicAr}، {p.areaAr} · {p.whenAr} · الرقم المرجعي <span className="font-mono" dir="ltr">{b.ref}</span> (تجريبي)</Sec>
    {c.symptoms && <Sec label="الأعراض كما وصفتها">صداع وتشوش في الرؤية منذ ثلاثة أيام.</Sec>}
    {c.medflag && <Sec label="سؤال للطبيب أو الصيدلي">هل يؤثر تناول الإيبوبروفين مع أملوديبين على ضغط الدم؟</Sec>}
    <Sec label="المعلومات التي ستتم مشاركتها مع الطبيب"><ul>{shared.length ? shared.map((k) => <li key={k}>{T.ar.cItems[k]}</li>) : <li>—</li>}</ul></Sec>
    {notShared.length > 0 && <Sec label="لن تتم مشاركتها"><ul>{notShared.map((k) => <li key={k}>{T.ar.cItems[k]}</li>)}</ul></Sec>}
    <Alert variant="destructive" className="py-2.5"><ShieldAlert className="size-4" /><AlertDescription className="text-foreground">كير بريدج لا يقوم بالتشخيص أو وصف الأدوية أو تحديد الجرعات. إذا ساءت الأعراض أو شعرت بأنها طارئة، اتصل بالرقم 998 أو توجّه إلى أقرب قسم طوارئ. هذه ليست نصيحة طبية. بيانات اصطناعية · نموذج أولي.</AlertDescription></Alert>
  </div>);
}

/* ================================================================
   PDF export — A4 handoff report (page 1 English clinician handoff,
   page 2 Arabic RTL patient/caregiver summary). Rendered off-screen with
   fixed print colours, captured with html2canvas, assembled with jsPDF.
   In a claude.ai artifact the file is offered through the `downloads`
   capability; anywhere else jsPDF triggers a normal browser download.
================================================================ */
const PX = { w: 794, h: 1123 }; // A4 at 96 dpi
const INK = {
  ink: "#14211E", muted: "#5B6B66", line: "#D9E1DD", faint: "#F4F7F6", teal: "#0B6E69", tealSoft: "#E3F1EF",
  sand: "#9A5A12", sandSoft: "#FCF1E3", red: "#B42318", redSoft: "#FDEDEB", white: "#FFFFFF",
};
const F_EN = '"IBM Plex Sans","IBM Plex Sans Arabic",Arial,sans-serif';
const F_AR = '"IBM Plex Sans Arabic","IBM Plex Sans",Tahoma,sans-serif';
const F_MONO = '"IBM Plex Mono",Menlo,monospace';

function pdfStamp() {
  const d = new Date();
  return {
    en: d.toLocaleString("en-GB", { timeZone: "Asia/Dubai", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " GST",
    ar: d.toLocaleString("ar-AE-u-nu-latn", { timeZone: "Asia/Dubai", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
  };
}

function PdfPage({ dir = "ltr", font, children, page, total, footer }) {
  return (
    <div dir={dir} lang={dir === "rtl" ? "ar" : "en"} style={{ width: PX.w, minHeight: PX.h, background: INK.white, color: INK.ink, fontFamily: font, position: "relative", boxSizing: "border-box", padding: "40px 48px 86px", fontSize: 12.5, lineHeight: 1.5 }}>
      {children}
      <div style={{ position: "absolute", insetInline: 48, bottom: 30, borderTop: `1px solid ${INK.line}`, paddingTop: 10, display: "flex", justifyContent: "space-between", gap: 24, fontSize: 9.5, color: INK.muted }}>
        <span style={{ maxWidth: 560 }}>{footer}</span>
        <span style={{ whiteSpace: "nowrap", fontFamily: F_MONO }}>{page} / {total}</span>
      </div>
    </div>
  );
}

function PdfHeader({ title, subtitle, refLabel, refValue, stampLabel, stamp, badge, rtl }) {
  // html2canvas splits letter-spaced text into single glyphs, which breaks Arabic joining: no tracking on RTL text
  const track = (v) => (rtl ? 0 : v);
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: INK.teal, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <HeartPulse color={INK.white} size={24} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>CareBridge UAE</div>
            <div style={{ fontSize: 10.5, color: INK.muted }}>{subtitle}</div>
          </div>
        </div>
        <div style={{ textAlign: "end", fontSize: 10.5, color: INK.muted }}>
          <div style={{ display: "inline-block", fontSize: 9, fontWeight: 700, letterSpacing: track("0.08em"), color: INK.sand, background: INK.sandSoft, borderRadius: 4, padding: "3px 8px", marginBottom: 6 }}>{badge}</div>
          <div>{refLabel} <b style={{ color: INK.ink, fontFamily: F_MONO }}>{refValue}</b></div>
          <div>{stampLabel} {stamp}</div>
        </div>
      </div>
      <div style={{ marginTop: 18, paddingBottom: 10, borderBottom: `3px solid ${INK.teal}` }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: track("-0.01em") }}>{title}</div>
      </div>
    </div>
  );
}

function PdfLabel({ children, rtl }) {
  return <div style={{ fontSize: rtl ? 11 : 9.5, fontWeight: 700, letterSpacing: rtl ? 0 : "0.07em", textTransform: rtl ? "none" : "uppercase", color: INK.teal, marginBottom: 5 }}>{children}</div>;
}
function PdfSection({ label, children, rtl, tone }) {
  const bg = tone === "extra" ? INK.sandSoft : tone === "flag" ? INK.faint : "transparent";
  return (
    <div style={{ marginBottom: 14, background: bg, borderRadius: 6, padding: tone ? "10px 12px" : 0 }}>
      <PdfLabel rtl={rtl}>{label}</PdfLabel>
      <div>{children}</div>
    </div>
  );
}
function PdfFacts({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: `1px solid ${INK.line}`, borderRadius: 8, overflow: "hidden", marginBottom: 18 }}>
      {items.map(([k, v], i) => (
        <div key={i} style={{ padding: "10px 14px", background: i % 4 === 0 || i % 4 === 3 ? INK.faint : INK.white, borderTop: i > 1 ? `1px solid ${INK.line}` : "none" }}>
          <div style={{ fontSize: 9.5, color: INK.muted }}>{k}</div>
          <div style={{ fontWeight: 600, marginTop: 1 }}>{v}</div>
        </div>
      ))}
    </div>
  );
}
function PdfTable({ head, rows, mono }) {
  const cell = { padding: "7px 10px", borderBottom: `1px solid ${INK.line}`, textAlign: "start", verticalAlign: "top" };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
      <thead><tr>{head.map((h, i) => <th key={i} style={{ ...cell, background: INK.faint, fontSize: 9.5, color: INK.muted, fontWeight: 600 }}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ ...cell, fontFamily: mono && j === 0 ? F_MONO : undefined, fontSize: mono && j === 0 ? 9.5 : 11 }}>{c}</td>)}</tr>)}</tbody>
    </table>
  );
}
function PdfSafety({ children }) {
  return <div style={{ marginTop: 16, borderInlineStart: `4px solid ${INK.red}`, background: INK.redSoft, borderRadius: 6, padding: "10px 14px", fontSize: 11 }}>{children}</div>;
}
function Dot({ on }) {
  return <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, marginInlineEnd: 8, verticalAlign: "-2px", background: on ? INK.teal : INK.white, border: `1.5px solid ${on ? INK.teal : "#A9B6B1"}`, position: "relative" }}>{on && <Check color={INK.white} size={9} strokeWidth={4} style={{ position: "absolute", top: 0.5, left: 0.5 }} />}</span>;
}

const HandoffPdfTemplate = React.forwardRef(function HandoffPdfTemplate({ s }, ref) {
  const c = s.consent, b = s.booking, p = b.p, st = pdfStamp();
  const n = sharedCount(c);
  const audit = EVENTS.filter((e) => s.ev[e]?.state === "done").map((e) => [e, T.en.ev[e], `+${(s.ev[e].at / 1000).toFixed(1)} s`]);
  const footerEn = "Prototype using synthetic data and simulated provider tools. CareBridge UAE supports healthcare navigation; it does not diagnose, prescribe, or replace clinicians. Not medical advice.";
  const footerAr = "نموذج أولي يستخدم بيانات اصطناعية وأدوات مقدمي رعاية محاكاة. يدعم كير بريدج الإمارات التوجيه الصحي؛ ولا يقوم بالتشخيص أو وصف الأدوية أو استبدال الأطباء. ليست نصيحة طبية.";
  const allKeys = [...SHARE_KEYS, ...EXTRA_KEYS];
  return (
    <div ref={ref} style={{ position: "fixed", left: -20000, top: 0, width: PX.w, pointerEvents: "none" }} aria-hidden="true">
      {/* Page 1 — clinician handoff (English) */}
      <PdfPage font={F_EN} page={1} total={2} footer={footerEn}>
        <PdfHeader title="Clinician Handoff" subtitle="Care-navigation handoff · Health Companion" refLabel="Booking ref" refValue={b.ref}
          stampLabel="Generated" stamp={st.en} badge="PROTOTYPE · SYNTHETIC DATA" />
        <PdfFacts items={[
          ["Patient", "Gary (synthetic profile) · Dubai"],
          ["Appointment", `${p.doc} · Neurology`],
          ["Clinic", `${p.clinic}, ${p.area} (mock)`],
          ["Time", `${p.when[0].toUpperCase() + p.when.slice(1)} · ${st.en.split(",")[0]}`],
          ["Consent", `Limited handoff · ${n} of 7 items`],
          ["Purpose", "This mock appointment only"],
        ]} />
        {c.symptoms && <PdfSection label="Reported symptoms and duration">Headache and blurry vision for 3 days (patient-reported). Onset Day 1; care-navigation request on Day 3. Triage guidance: clinician assessment within 24 hours.</PdfSection>}
        {c.history && <PdfSection label="Relevant patient-confirmed context">{PATIENT.history}</PdfSection>}
        {c.meds && (
          <PdfSection label="Current medicines and allergies">
            <PdfTable head={["Medicine / allergy", "Detail"]} rows={[
              ["Amlodipine", "5 mg once daily"],
              ["Ibuprofen", "As needed · self-reported, over the counter"],
              ["Allergy", PATIENT.allergies],
            ]} />
          </PdfSection>
        )}
        {c.medflag && <PdfSection tone="flag" label="Medication-reference item for clinician / pharmacist">NSAID use (ibuprofen, as needed) alongside amlodipine: the reference lists a possible effect on blood-pressure control. Flagged for professional review only.</PdfSection>}
        {c.fullHistory && <PdfSection tone="extra" label="Full consultation history · patient opted in">{PATIENT.fullHistory.join("  ·  ")}</PdfSection>}
        {c.family && <PdfSection tone="extra" label="Family history · patient opted in">{PATIENT.family}</PdfSection>}
        {c.unrelated && <PdfSection tone="extra" label="Other historical notes · patient opted in">{PATIENT.unrelated}</PdfSection>}
        <PdfSection label="Patient questions for clinician">
          <ol style={{ margin: 0, paddingInlineStart: 18, listStyle: "decimal" }}>
            <li>What signs mean I should go to emergency care?</li>
            <li>Should I keep using ibuprofen for the headache?</li>
            <li>Do I need a blood-pressure check today?</li>
          </ol>
        </PdfSection>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.25fr", gap: 18, marginTop: 4 }}>
          <div>
            <PdfLabel>Consent snapshot</PdfLabel>
            {allKeys.map((k) => <div key={k} style={{ fontSize: 11, marginBottom: 4, color: c[k] ? INK.ink : INK.muted }}><Dot on={c[k]} />{T.en.cItems[k]}</div>)}
          </div>
          <div>
            <PdfLabel>Agent activity (non-sensitive audit)</PdfLabel>
            <PdfTable mono head={["Event", "Time"]} rows={audit.map(([code, , t]) => [code, t])} />
          </div>
        </div>
        <PdfSafety><b>Safety note.</b> Navigation support only; not a diagnosis or treatment plan. If symptoms worsen or feel urgent, call 998 or go to the nearest emergency department.</PdfSafety>
      </PdfPage>

      {/* Page 2 — patient / caregiver summary (Arabic, RTL) */}
      <PdfPage dir="rtl" font={F_AR} page={2} total={2} footer={footerAr}>
        <PdfHeader title="ملخص الزيارة للمريض ومقدم الرعاية" subtitle="ملخص التوجيه الصحي · رفيق الصحة" refLabel="الرقم المرجعي" refValue={b.ref}
          stampLabel="تاريخ الإنشاء" stamp={st.ar} badge="نموذج أولي · بيانات اصطناعية" rtl />
        <PdfFacts items={[
          ["المريض", "غاري (ملف اصطناعي) · دبي"],
          ["الطبيب", `${p.docAr} · طب الأعصاب`],
          ["العيادة", `${p.clinicAr}، ${p.areaAr} (تجريبي)`],
          ["الموعد", p.whenAr],
          ["الموافقة", `مشاركة محدودة · ${n} من 7 عناصر`],
          ["الغرض", "هذا الموعد التجريبي فقط"],
        ]} />
        <PdfSection rtl label="الخطوة التالية">احضر الموعد التجريبي وأحضر معك هذا الملخص. وفقاً لإرشادات الفرز المعتمدة، يُنصح بأن يقيّمك الطبيب خلال اليوم أو الغد.</PdfSection>
        {c.symptoms && <PdfSection rtl label="الأعراض كما وصفتها">صداع وتشوش في الرؤية منذ ثلاثة أيام.</PdfSection>}
        {c.medflag && <PdfSection rtl tone="flag" label="سؤال للطبيب أو الصيدلي">هل يؤثر تناول الإيبوبروفين مع أملوديبين على ضغط الدم؟</PdfSection>}
        <PdfSection rtl label="ماذا ستتم مشاركته مع الطبيب">
          {allKeys.map((k) => <div key={k} style={{ fontSize: 12, marginBottom: 5, color: c[k] ? INK.ink : INK.muted }}><Dot on={c[k]} />{T.ar.cItems[k]}{!c[k] && " — لن تتم مشاركته"}</div>)}
        </PdfSection>
        <PdfSection rtl label="ما الذي لا يفعله كير بريدج">لا يقوم كير بريدج بالتشخيص أو وصف الأدوية أو تحديد الجرعات أو التوصية بالعلاج. هذه القرارات يتخذها أخصائي رعاية صحية مرخّص.</PdfSection>
        <div style={{ marginTop: 18, border: `2px solid ${INK.red}`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontFamily: F_MONO, fontSize: 30, fontWeight: 700, color: INK.red }}>998</div>
          <div style={{ fontSize: 12.5 }}><b>إذا ساءت الأعراض أو شعرت بأنها طارئة</b><br />اتصل بالرقم 998 لطلب سيارة إسعاف، أو توجّه إلى أقرب قسم طوارئ. لا تنتظر موعدك.</div>
        </div>
        <PdfSafety>هذه ليست نصيحة طبية. هذا الملخص مخصص لك ولمقدم الرعاية فقط لهذا الموعد.</PdfSafety>
      </PdfPage>
    </div>
  );
});

async function buildHandoffPdf(root, s) {
  if (document.fonts?.ready) await document.fonts.ready;
  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
  const pages = Array.from(root.children);
  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], { scale: 2, backgroundColor: "#FFFFFF", logging: false, useCORS: true });
    const ratio = canvas.height / canvas.width;
    let w = W, h = W * ratio, x = 0;
    if (h > H) { h = H; w = H / ratio; x = (W - w) / 2; }
    if (i > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", x, 0, w, h, undefined, "FAST");
  }
  pdf.setProperties({ title: `CareBridge UAE — Handoff ${s.booking.ref}`, subject: "Clinician handoff and patient/caregiver summary (prototype, synthetic data)", author: "CareBridge UAE (prototype)", creator: "CareBridge UAE" });
  return pdf;
}

function Handoff({ s, l, actions }) {
  const doc = useRef(null);
  const tpl = useRef(null);
  const [copied, setCopied] = useState(false);
  const [pdf, setPdf] = useState({ state: "idle" }); // idle | working | saved | declined | error
  const [renderTpl, setRenderTpl] = useState(false);
  const ar = s.lang === "ar";

  const copy = () => {
    const el = doc.current; if (!el) return;
    const selectAll = () => { const r = document.createRange(); r.selectNodeContents(el); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); };
    try { navigator.clipboard.writeText(el.innerText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }, selectAll); } catch (_) { selectAll(); }
  };

  const downloadPdf = async () => {
    if (pdf.state === "working") return;
    setPdf({ state: "working" });
    setRenderTpl(true);
    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const file = await buildHandoffPdf(tpl.current, s);
      const filename = `CareBridge-Handoff-${s.booking.ref}.pdf`;
      const downloads = typeof window.claude?.use === "function" ? await window.claude.use("downloads") : null;
      if (downloads) {
        try {
          await downloads.save({ filename, data: file.output("blob") });
          setPdf({ state: "saved" });
        } catch (e) {
          setPdf({ state: e?.code === "declined" ? "declined" : "error", code: e?.code });
        }
      } else {
        file.save(filename);
        setPdf({ state: "saved" });
      }
    } catch (e) {
      setPdf({ state: "error", code: "render" });
    } finally {
      setRenderTpl(false);
    }
  };

  const note = {
    saved: ["success", tr(s.lang, "PDF ready — check your downloads", "ملف PDF جاهز — تحقق من التنزيلات")],
    declined: ["muted", tr(s.lang, "Download cancelled", "تم إلغاء التنزيل")],
    error: ["danger", tr(s.lang, "Couldn't create the PDF here. Try again, or open the dashboard in your browser.", "تعذّر إنشاء ملف PDF هنا. حاول مرة أخرى أو افتح اللوحة في المتصفح.")],
  }[pdf.state];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <div className="flex items-center gap-2"><FileText className="size-4 text-primary" /><CardTitle className="text-base">{l.pHandoff}</CardTitle></div>
        {s.approved && (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={copy}>{copied ? <Check /> : <Copy />}{copied ? l.copied : l.copy}</Button>
            <Button size="sm" onClick={downloadPdf} disabled={pdf.state === "working"}>
              {pdf.state === "working" ? <Loader2 className="animate-spin" /> : <FileDown />}
              {pdf.state === "working" ? tr(s.lang, "Preparing…", "جارٍ التحضير…") : tr(s.lang, "Download PDF", "تنزيل PDF")}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {s.approved && note && (
          <div className="mb-3"><Badge variant={note[0]} className="font-medium">{note[1]}</Badge></div>
        )}
        <Tabs value={s.tab} onValueChange={actions.tab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="en"><Stethoscope className="size-3.5" />{l.tabEn}</TabsTrigger>
            <TabsTrigger value="ar"><Users className="size-3.5" />{l.tabAr}</TabsTrigger>
          </TabsList>
          {["en", "ar"].map((t) => (
            <TabsContent key={t} value={t} className="mt-4">
              {!s.approved ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                  <FileClock className="size-6" />{l.hEmpty}
                </div>
              ) : (
                <div ref={s.tab === t ? doc : null} dir={t === "ar" ? "rtl" : "ltr"} lang={t}>
                  {t === "ar" ? <HandoffAR s={s} /> : <HandoffEN s={s} />}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
        {s.approved && (
          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileDown className="size-3.5 shrink-0" />
            {tr(s.lang, "PDF: 2 A4 pages — English clinician handoff + Arabic patient summary, with consent and audit trail.",
              "ملف PDF: صفحتان A4 — ملخص الطبيب بالإنجليزية وملخص المريض بالعربية، مع الموافقة وسجل النشاط.")}
          </p>
        )}
      </CardContent>
      {renderTpl && s.booking && createPortal(<HandoffPdfTemplate ref={tpl} s={s} />, document.body)}
    </Card>
  );
}

/* ================================================================
   Page
================================================================ */
export default function CareBridgeDashboard() {
  const [s, setS] = useState(() => {
    let lang = "en"; try { const v = localStorage.getItem("cb-lang"); if (v === "ar" || v === "en") lang = v; } catch (_) {}
    return initial(lang);
  });
  const ref = useRef(s); ref.current = s;
  const run = useRef(0);
  const up = (fn) => setS((prev) => { const next = { ...prev, ...fn(prev) }; ref.current = next; return next; });
  const [clock, setClock] = useState(now());
  const [backendStatus, setBackendStatus] = useState(null); // null=checking, else {online, llm, provider, model}
  const l = T[s.lang];
  const dir = s.lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    let cancelled = false;
    backend.health()
      .then((h) => { if (!cancelled) { setBackendStatus({ online: true, llm: h.llm_configured, provider: h.llm_provider, model: h.llm_model }); agent.online = true; } })
      .catch(() => { if (!cancelled) { setBackendStatus({ online: false }); agent.online = false; } });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    document.documentElement.lang = s.lang; document.documentElement.dir = dir;
    try { localStorage.setItem("cb-lang", s.lang); } catch (_) {}
  }, [s.lang]);
  useEffect(() => {
    if (!s.t0 || s.t1 || s.route === "urgent") return;
    const id = setInterval(() => setClock(now()), 250); return () => clearInterval(id);
  }, [s.t0, s.t1, s.route]);

  const guard = (id) => run.current === id;
  const say = (type, extra) => up((p) => ({ msgs: [...p.msgs, { role: "agent", type, ...extra }] }));
  const mark = (code, state) => up((p) => ({ ev: { ...p.ev, [code]: { state, at: p.t0 ? Math.round(now() - p.t0) : 0 } } }));
  const trace = (row) => up((p) => ({ trace: [...p.trace, row] }));
  const startClock = () => up((p) => (p.t0 ? {} : { t0: now() }));
  const tool = async (id, fn, args, ms, real = null) => {
    const idx = ref.current.trace.length;
    up((p) => ({ tools: p.tools + 1, loop: "thinking", trace: [...p.trace, { fn, args, ms: null, cls: "" }] }));
    const st = now(); await agent.callTool(real, ms);
    if (!guard(id)) return false;
    const took = Math.round(now() - st);
    up((p) => ({ trace: p.trace.map((r, i) => (i === idx ? { ...r, ms: took } : r)) }));
    return true;
  };
  const think = async (id, ms) => { up(() => ({ busy: true, typing: true })); await sleep(ms); if (!guard(id)) return false; up(() => ({ typing: false })); return true; };
  const finish = () => up((p) => ({ busy: false, loop: p.loop === "thinking" ? "idle" : p.loop }));

  async function clarify(id) {
    startClock(); up((p) => ({ route: p.route || "clarify" }));
    if (!(await think(id, 700))) return;
    say("text", { k: "clarify" });
    up(() => ({ awaitingDuration: true, loop: "waiting", busy: false }));
  }
  async function routineFlow(id) {
    startClock(); up(() => ({ awaitingDuration: false, busy: true, loop: "thinking" }));
    if (!(await tool(id, "knowledge_base.retrieve", "query=•••", 900,
      { name: "retrieve_guidance", args: { query: "headache with blurry vision, 3 days, hypertension" } }))) return; mark("TRIAGE_GUIDANCE_RETRIEVED", "done");
    if (!(await tool(id, "get_patient_profile", "patient_id=•••, fields=[history, medications, allergies]", 700,
      { name: "get_patient_profile", args: { patient_id: "P001", context_type: "relevant" } }))) return; mark("RELEVANT_CONTEXT_RETRIEVED", "done");
    if (!(await tool(id, "check_medication_interactions", "medications=•••", 800,
      { name: "check_medication_interactions", args: { medications: ["Ibuprofen", "Amlodipine"] } }))) return; mark("MEDICATION_REFERENCE_CHECKED", "done");
    up(() => ({ route: "routine" }));
    if (!(await tool(id, "search_providers", 'specialty="Neurology", location="Dubai", availability="≤24h"', 900,
      { name: "search_providers", args: { specialty: "Neurology", location: "Dubai" } }))) return; mark("PROVIDER_OPTIONS_FOUND", "done");
    up((p) => ({ ev: { ...p.ev, URGENT_ESCALATION_SHOWN: { state: "skip" } } }));
    say("text", { k: "routine", safety: true }); say("text", { k: "medflag" }); say("options");
    trace({ fn: "⏸ human-in-the-loop", args: "await provider choice + confirmation", ms: null, cls: "gate" });
    mark("BOOKING_AWAITING_CONFIRMATION", "wait");
    up(() => ({ optionsShown: true, loop: "waiting", busy: false }));
  }
  async function urgentFlow(id) {
    startClock(); up(() => ({ busy: true, loop: "thinking", awaitingDuration: false }));
    if (!(await tool(id, "knowledge_base.retrieve", "query=•••", 900,
      { name: "retrieve_guidance", args: { query: "sudden severe headache, worsening vision, one-sided weakness" } }))) return;
    mark("TRIAGE_GUIDANCE_RETRIEVED", "done");
    up((p) => {
      const ev = { ...p.ev };
      EVENTS.slice(1, 7).forEach((c) => { if (ev[c]?.state !== "done") ev[c] = { state: "skip" }; });
      return { route: "urgent", ev, selected: null, msgs: p.msgs.filter((m) => m.type !== "confirm") };
    });
    trace({ fn: "route_decision", args: "red flag per retrieved guidance → routine booking blocked", ms: null, cls: "block" });
    mark("URGENT_ESCALATION_SHOWN", "alert");
    say("urgent");
    up((p) => ({ memory: { lang: p.lang, consentN: null, ref: p.booking?.ref || null, next: "emergency" }, loop: "stopped", busy: false }));
  }
  async function refusal(id, kind) {
    if (!(await think(id, 600))) return;
    trace({ fn: "guardrail / policy", args: `denied topic: ${kind === "dose" ? "medication dosing" : "medical diagnosis"} → refused`, ms: null, cls: "block" });
    up((p) => ({ route: !p.route || p.route === "clarify" ? "refused" : p.route }));
    say("text", { k: kind, refusal: true }); finish();
  }
  async function nextStep(id) {
    if (!(await think(id, 500))) return;
    up((p) => ({ tools: p.tools + 1, trace: [...p.trace, { fn: "memory.read", args: "language, consent_preference, appointment_ref, next_action", ms: 120, cls: "" }] }));
    say("text", { k: ref.current.booking ? "nextBooked" : "nextNone" }); finish();
  }
  /* Free-text turns that aren't a scripted scenario go to the live LLM agent
     (real backend, real tools, guardrails). Falls back to the canned reply if
     the backend is unreachable. */
  async function askLLM(id, text) {
    const cur = ref.current;
    const history = cur.msgs
      .filter((m) => m.role === "user" || (m.role === "agent" && (m.raw || m.k)))
      .slice(-6)
      .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.role === "user" ? m.text : (m.raw || l.a[m.k] || "") }))
      .filter((m) => m.content);
    up(() => ({ busy: true, typing: true, loop: "thinking" }));
    let resp;
    try {
      resp = await backend.chat(text, history, cur.lang);
    } catch (_) {
      if (!guard(id)) return;
      up(() => ({ typing: false })); say("text", { k: "fallback" }); finish(); return;
    }
    if (!guard(id)) return;
    up(() => ({ typing: false }));
    if (resp.guardrail) {
      trace({ fn: "guardrail / policy", args: `denied topic: ${resp.reason} → refused`, ms: 0, cls: "block" });
      up((p) => ({ route: !p.route || p.route === "clarify" ? "refused" : p.route }));
      say("text", { k: resp.refusal_key || "dose", refusal: true }); finish(); return;
    }
    (resp.trace || []).forEach((r) => { trace({ fn: r.fn, args: r.args, ms: r.ms, cls: r.cls || "" }); up((p) => ({ tools: p.tools + 1 })); });
    Object.entries(resp.events || {}).forEach(([code, st]) => mark(code, st));
    if (resp.providers && resp.providers.length && !ref.current.optionsShown) up(() => ({ optionsShown: true }));
    say("text", { raw: resp.reply || l.a.fallback, safety: !resp.no_key });
    finish();
  }

  const actions = {
    async send(text) {
      const cur = ref.current;
      if (cur.busy || !text || !text.trim()) return;
      const id = run.current;
      up((p) => ({ msgs: [...p.msgs, { role: "user", text }] }));
      const intent = classify(text, cur.awaitingDuration);
      if (intent === "red") return urgentFlow(id);
      if (intent === "dose" || intent === "dx") return refusal(id, intent);
      if (intent === "next") return nextStep(id);
      if (intent === "book") {
        if (!cur.optionsShown) { if (await think(id, 500)) { say("text", { k: "fallback" }); finish(); } return; }
        if (!cur.selected) {
          if (/4:30/.test(text)) return actions.pick(PROVIDERS[0]);
          if (await think(id, 400)) { say("text", { k: "pickFirst" }); finish(); } return;
        }
        return actions.confirm();
      }
      if (intent === "vague") return clarify(id);
      if (intent === "symptoms" || intent === "duration") return routineFlow(id);
      return askLLM(id, text);
    },
    pick(p) {
      const cur = ref.current; if (cur.booking || cur.busy) return;
      up((prev) => ({ selected: p, msgs: [...prev.msgs.filter((m) => m.type !== "confirm"), { role: "agent", type: "confirm" }] }));
    },
    cancel() { up((p) => ({ selected: null, msgs: [...p.msgs.filter((m) => m.type !== "confirm"), { role: "agent", type: "text", k: "cancelled" }] })); },
    async confirm() {
      const cur = ref.current; if (!cur.selected || cur.booking) return;
      const id = run.current, p = cur.selected;
      up((prev) => ({ busy: true, msgs: [...prev.msgs.filter((m) => m.type !== "confirm"), { role: "user", text: prev.lang === "ar" ? "نعم، أكد الحجز." : "Yes, confirm the booking." }] }));
      mark("BOOKING_AWAITING_CONFIRMATION", "done");
      if (!(await tool(id, "book_appointment", `provider_id="${p.id}", patient_id=•••, date="${p.short}", user_confirmed=true`, 800,
        { name: "book_appointment", args: { provider_id: p.id, patient_id: "P001", time: p.short, date: p.short, user_confirmed: true } }))) return;
      const backendRef = agent.lastResult && agent.lastResult.booking_reference;
      up(() => ({ booking: { ref: backendRef || "CB-" + (4200 + Math.floor(Math.random() * 700)), p } }));
      mark("MOCK_BOOKING_CONFIRMED", "done");
      trace({ fn: "⏸ human-in-the-loop", args: "await consent snapshot approval", ms: null, cls: "gate" });
      say("text", { k: "booked" });
      up(() => ({ loop: "waiting", busy: false }));
    },
    async approve() {
      const cur = ref.current; if (!cur.booking || cur.approved || cur.busy) return;
      const id = run.current;
      up(() => ({ busy: true, loop: "thinking" }));
      if (!(await tool(id, "generate_visit_summary", "patient_id=•••, symptoms=•••, duration=•••, consent=limited", 1000,
        { name: "generate_visit_summary", args: { patient_id: "P001", symptoms: "Headache and blurry vision", duration: "3 days", language_preference: ref.current.lang === "ar" ? "arabic" : "english" } }))) return;
      up(() => ({ approved: true })); mark("VISIT_SUMMARY_GENERATED", "done");
      if (!(await tool(id, "memory.write", "language, consent_preference, appointment_ref, next_action", 400))) return;
      up((p) => ({ memory: { lang: p.lang, consentN: sharedCount(p.consent), ref: p.booking.ref, next: "attend" }, t1: now() }));
      say("text", { k: "handoff" });
      up(() => ({ loop: "done", busy: false }));
    },
    toggle(k, v) {
      up((p) => {
        const consent = { ...p.consent, [k]: v };
        return { consent, memory: p.memory && p.memory.consentN != null ? { ...p.memory, consentN: sharedCount(consent) } : p.memory };
      });
    },
    tab(t) { up(() => ({ tab: t })); },
    lang(lang) { if (!lang) return; up((p) => ({ lang, tab: lang, memory: p.memory ? { ...p.memory, lang } : null })); },
    reset() { run.current++; setS((p) => { const n = initial(p.lang); ref.current = n; return n; }); },
  };

  return (
    <DirectionProvider dir={dir}>
      <TooltipProvider delayDuration={150}>
        <div dir={dir} className="min-h-screen bg-background">
          <header className="border-b bg-card">
            <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm"><HeartPulse className="size-5" /></div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold tracking-tight">CareBridge UAE</h1>
                    <Badge variant="outline" className="hidden font-medium sm:inline-flex">Health Companion</Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{l.tagline}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {backendStatus === null ? (
                  <Badge variant="muted" className="hidden sm:inline-flex"><Loader2 className="animate-spin" />{tr(s.lang, "Connecting…", "جارٍ الاتصال…")}</Badge>
                ) : !backendStatus.online ? (
                  <Badge variant="danger" className="hidden sm:inline-flex"><OctagonAlert />{tr(s.lang, "Backend offline", "الخادم غير متصل")}</Badge>
                ) : backendStatus.llm ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span><Badge variant="success" className="hidden sm:inline-flex"><BrainCircuit />{tr(s.lang, "Live agent", "وكيل مباشر")}</Badge></span>
                    </TooltipTrigger>
                    <TooltipContent>{`${backendStatus.provider} · ${backendStatus.model}`}</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span><Badge variant="warning" className="hidden sm:inline-flex"><Database />{tr(s.lang, "Backend live · add LLM key", "الخادم متصل · أضف مفتاح")}</Badge></span>
                    </TooltipTrigger>
                    <TooltipContent>{tr(s.lang, "Tools use the live backend. Add an API key in backend/server/.env to enable the LLM agent.", "الأدوات تستخدم الخادم المباشر. أضف مفتاحاً في backend/server/.env لتفعيل الوكيل.")}</TooltipContent>
                  </Tooltip>
                )}
                <Badge variant="warning" className="hidden md:inline-flex"><FlaskConical />{l.demoTag}</Badge>
                <ToggleGroup type="single" size="sm" variant="outline" value={s.lang} onValueChange={actions.lang} aria-label="Language" className="rounded-md">
                  <ToggleGroupItem value="en" aria-label="English">EN</ToggleGroupItem>
                  <ToggleGroupItem value="ar" aria-label="العربية" lang="ar" className="font-arabic">العربية</ToggleGroupItem>
                </ToggleGroup>
                <Button variant="outline" size="sm" onClick={actions.reset}><RotateCcw />{l.reset}</Button>
              </div>
            </div>
          </header>

          <main className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-5 sm:px-6">
            <Alert variant="info" className="py-2.5">
              <FlaskConical className="size-4" />
              <AlertDescription className="flex flex-wrap items-center gap-x-2"><span className="font-semibold">{l.demoTag}.</span>{l.demoText}</AlertDescription>
            </Alert>
            <Stats s={s} l={l} clock={clock} />
            <div className="grid items-start gap-4 lg:grid-cols-12">
              <Chat s={s} l={l} actions={actions} />
              <div className="flex min-w-0 flex-col gap-4 lg:col-span-3"><Activity s={s} l={l} /><Memory s={s} l={l} /></div>
              <div className="flex min-w-0 flex-col gap-4 lg:col-span-4"><Consent s={s} l={l} actions={actions} /><Handoff s={s} l={l} actions={actions} /></div>
            </div>
            <Separator className="mt-2" />
            <p className="pb-2 text-center text-xs text-muted-foreground">{l.footer}</p>
          </main>
        </div>
      </TooltipProvider>
    </DirectionProvider>
  );
}
