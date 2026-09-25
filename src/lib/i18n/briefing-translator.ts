/**
 * Dynamic translator for deterministic situation briefing sentences.
 *
 * Converts backend-generated operational sentences (vehicles moving,
 * corridor closures, risk forecasts, incident reports, operational recommendations)
 * into the user's selected regional language.
 */

type Dict = Record<string, string>;

const SEVERITY_TRANSLATION: Record<string, Dict> = {
  CRITICAL: {
    hi: "गंभीर",
    as: "গুৰুতৰ",
    mni: "য়াম্না লুনা",
    ne: "गम्भीर",
    brx: "गोख्रोन्थार",
    lus: "Hlauhawm zual",
    trp: "Gwbwrwi",
    kha: "Ba shyrkhei",
  },
  HIGH: {
    hi: "उच्च",
    as: "উচ্চ",
    mni: "ৱাংবা",
    ne: "उच्च",
    brx: "गोजौ",
    lus: "Sang",
    trp: "Chwng",
    kha: "Ba khlain",
  },
  MEDIUM: {
    hi: "मध्यम",
    as: "মধ্যম",
    mni: "ময়াই ওয়াবা",
    ne: "मध्यम",
    brx: "गेजेर",
    lus: "Laihawl",
    trp: "Kwchwng",
    kha: "Ba pdeng",
  },
  LOW: {
    hi: "निम्न",
    as: "নিম্ন",
    mni: "নেম্বা",
    ne: "न्यून",
    brx: "गाहाय",
    lus: "Hniam",
    trp: "Kwla",
    kha: "Ba rit",
  },
};

const INCIDENT_TYPE_TRANSLATION: Record<string, Dict> = {
  landslide: {
    hi: "भूस्खलन",
    as: "ভূমিস্খলন",
    mni: "চিংশিৎপা",
    ne: "पहिरो",
    brx: "हा बाग्लायनाय",
    lus: "Leimin",
    trp: "Hani baha",
    kha: "Khyndew ba khyllem",
  },
  flood: {
    hi: "बाढ़",
    as: "বানপানী",
    mni: "ঈচাও",
    ne: "बाढी",
    brx: "दै बाना",
    lus: "Tui lian",
    trp: "Twi kwbwr",
    kha: "Ka jingshlei um",
  },
  "road damage": {
    hi: "सड़क क्षति",
    as: "পথৰ ক্ষতি",
    mni: "লম্বী মাংবা",
    ne: "सडक क्षति",
    brx: "लामा गाज्रि जानाय",
    lus: "Kawng chhia",
    trp: "Lama hamya",
    kha: "Ka jingjot ka surok",
  },
  "bridge damage": {
    hi: "पुल क्षति",
    as: "দলংৰ ক্ষতি",
    mni: "থোং মাংবা",
    ne: "पुल क्षति",
    brx: "दोलं गाज्रि जानाय",
    lus: "Leihlawn chhia",
    trp: "Kiri hamya",
    kha: "Ka jingjot ka jingkieng",
  },
  accident: {
    hi: "दुर्घटना",
    as: "দুৰ্ঘটনা",
    mni: "খুদোংথীবা",
    ne: "दुर्घटना",
    brx: "जाथाय",
    lus: "Chetsualna",
    trp: "Kaphang hamya",
    kha: "Ka jingjia ba sngewsih",
  },
  traffic: {
    hi: "यातायात जाम",
    as: "যানজঁট",
    mni: "লম্বী থিংবা",
    ne: "ट्राफिक जाम",
    brx: "गाडी थांनाय-फैनाय हेंथा",
    lus: "Innawr tawt",
    trp: "Lama beruk",
    kha: "Ka jingdheng kali",
  },
};

const CARGO_TRANSLATION: Record<string, Dict> = {
  medicine: {
    hi: "दवा",
    as: "ঔষধ",
    mni: "হিদাক-লাংথক",
    ne: "औषधि",
    brx: "मुली",
    lus: "Damdawi",
    trp: "Sam",
    kha: "Dawai",
  },
  emergency: {
    hi: "आपातकालीन राहत",
    as: "জৰুৰীকালীন সাহায্য",
    mni: "অকূপ্পা সাহায্য",
    ne: "आपतकालीन राहत",
    brx: "गोख्रोन्थार अनसुंथाइ",
    lus: "Chhanhim hmanrua",
    trp: "Hortoli samphang",
    kha: "Jingshai kyrkieh",
  },
  food: {
    hi: "खाद्य सामग्री",
    as: "খাদ্য সামগ্ৰী",
    mni: "চাক-চা",
    ne: "खाद्य आपूर्ति",
    brx: "जाग्रा मुवा",
    lus: "Chaw leh tui",
    trp: "Chaham",
    kha: "Bam bad dih",
  },
  fuel: {
    hi: "ईंधन",
    as: "ইন্ধন",
    mni: "থাউ",
    ne: "इन्धन",
    brx: "थाव",
    lus: "Hman tui",
    trp: "Thaw",
    kha: "Umphniang",
  },
};

export function translateHeadline(headline: string, lng: string): string {
  if (!headline || lng === "en") return headline;

  const m1 = headline.match(/^(\d+)\s+corridor\(s\)\s+closed\s+—\s+(\d+)\s+incident\(s\)\s+active/i);
  if (m1) {
    const [, closed, active] = m1;
    if (lng === "hi") return `${closed} गलियारा(रे) बंद — ${active} घटनाएं सक्रिय`;
    if (lng === "as") return `${closed} টা কৰিড'ৰ বন্ধ — ${active} টা ঘটনা সক্ৰিয়`;
    if (lng === "mni") return `${closed} লম্বী থিংজিনখ্রে — ${active} থৌদোক থোক্লি`;
    if (lng === "ne") return `${closed} करिडोर बन्द — ${active} घटनाहरू सक्रिय`;
    if (lng === "brx") return `${closed} लामा बन्द — ${active} जाथाय सोलिदों`;
    if (lng === "lus") return `Kawng ${closed} khar — buaina ${active} a thleng`;
    if (lng === "trp") return `Lama ${closed} thangba — kok ${active} tongo`;
    if (lng === "kha") return `${closed} tylli ki surok ba la khang — ${active} ki jingjia ba dang pynsyllok`;
  }

  const m2 = headline.match(/^(\d+)\s+incident\(s\)\s+active,\s+network open/i);
  if (m2) {
    const [, active] = m2;
    if (lng === "hi") return `${active} घटनाएं सक्रिय, नेटवर्क खुला है`;
    if (lng === "as") return `${active} টা ঘটনা সক্ৰিয়, নেটৱৰ্ক খোলা`;
    if (lng === "mni") return `${active} থৌদোক থোক্লি, লম্বী হাংলি`;
    if (lng === "ne") return `${active} घटनाहरू सक्रिय, सञ्जाल खुला`;
  }

  if (headline.toLowerCase().includes("network open, no active incidents")) {
    if (lng === "hi") return "नेटवर्क खुला है, कोई सक्रिय घटना नहीं";
    if (lng === "as") return "নেটৱৰ্ক খোলা, কোনো সক্ৰিয় ঘটনা নাই";
    if (lng === "mni") return "লম্বী হাংলি, করিগুম্বা থৌদোক থোক্তে";
    if (lng === "ne") return "सञ्जाल खुला छ, कुनै सक्रिय घटना छैन";
  }

  return headline;
}

export function translateBriefingLine(text: string, lng: string): string {
  if (!text || lng === "en") return text;

  // 1. vehicles moving
  const mVeh = text.match(/^(\d+)\s+of\s+(\d+)\s+vehicles\s+are\s+moving\s+across\s+the\s+region\.?$/i);
  if (mVeh) {
    const [, moving, total] = mVeh;
    if (lng === "hi") return `${total} में से ${moving} वाहन क्षेत्र में सक्रिय रूप से आवागमन कर रहे हैं।`;
    if (lng === "as") return `${total} খনৰ ভিতৰত ${moving} খন বাহন অঞ্চলটোত চলি আছে।`;
    if (lng === "mni") return `অপুনবা ${total} গী মনুংদা ${moving} গাড়ি চৎথোক-চৎশিন তৌরি।`;
    if (lng === "ne") return `${total} मध्ये ${moving} सवारी साधनहरू यस क्षेत्रमा सञ्चालन भइरहेका छन्।`;
    if (lng === "brx") return `${total} नि गेजेराव ${moving} गाडीफोरा हादरखन्द'आव थाबायदों।`;
    if (lng === "lus") return `Motor ${total} zingah ${moving} an tlan mek.`;
    if (lng === "trp") return `Gari ${total} ni bisingo ${moving} chalaio tongo.`;
    if (lng === "kha") return `${moving} na ki ${total} ki kali ki dang iaid ha kane ka thaiñ.`;
  }

  // 2. corridors open
  const mCorr = text.match(/^(\d+)\s+of\s+(\d+)\s+corridors\s+are\s+fully\s+open;\s+(\d+)\s+restricted,\s+(\d+)\s+blocked\.?$/i);
  if (mCorr) {
    const [, open, total, restricted, blocked] = mCorr;
    if (lng === "hi") return `${total} में से ${open} गलियारे पूरी तरह खुले हैं; ${restricted} प्रतिबंधित, ${blocked} अवरुद्ध।`;
    if (lng === "as") return `${total} টাৰ ভিতৰত ${open} টা কৰিড'ৰ সম্পূৰ্ণ খোলা; ${restricted} টা সীমিত, ${blocked} টা বন্ধ।`;
    if (lng === "mni") return `${total} গী মনুংদা ${open} লম্বী হাংলি; ${restricted} লিমিটেড, ${blocked} থিংজিনখ্রে।`;
    if (lng === "ne") return `${total} मध्ये ${open} करिडोर पूर्ण रूपमा खुला छन्; ${restricted} प्रतिबन्धित, ${blocked} बन्द।`;
    if (lng === "brx") return `${total} नि गेजेराव ${open} लामाया जोबोरै खुला; ${restricted} सिमागोनां, ${blocked} बन्द।`;
    if (lng === "lus") return `Kawng ${total} ah ${open} a tluang; ${restricted} khuahkhirh, ${blocked} pin.`;
    if (lng === "trp") return `Lama ${total} ni bisingo ${open} phaio; ${restricted} simit, ${blocked} thangba.`;
    if (lng === "kha") return `${open} na ki ${total} ki surok ki plie pura; ${restricted} ba la pyrkhing, ${blocked} ba la khang.`;
  }

  // 3. incidents active
  const mInc = text.match(/^(\d+)\s+incidents?\s+active,\s+(\d+)\s+at\s+critical\s+severity\.?$/i);
  if (mInc) {
    const [, active, critical] = mInc;
    if (lng === "hi") return `${active} घटनाएं सक्रिय हैं, जिनमें से ${critical} गंभीर स्तर की हैं।`;
    if (lng === "as") return `${active} টা ঘটনা সক্ৰিয়, ${critical} টা গুৰুতৰ স্তৰৰ।`;
    if (lng === "mni") return `${active} থৌদোক থোক্লি, মদুগী মনুংদা ${critical} অকনবা লুনা লৈ।`;
    if (lng === "ne") return `${active} घटनाहरू सक्रिय छन्, ${critical} गम्भीर स्तरमा।`;
    if (lng === "brx") return `${active} जाथाय सोलिदों, ${critical} गोख्रोन्थार थाखोनि।`;
    if (lng === "lus") return `Buaina ${active} a awm, ${critical} a hlauhawm zual.`;
    if (lng === "trp") return `Kok ${active} tongo, ${critical} kwplai gwbwrwi.`;
    if (lng === "kha") return `${active} ki jingjia ba dang jia, ${critical} kiba jur bha.`;
  }

  // 4. consignments
  const mDeliv = text.match(/^(\d+)\s+consignments?\s+in\s+flight,\s+(\d+)\s+delayed\.?$/i);
  if (mDeliv) {
    const [, transit, delayed] = mDeliv;
    if (lng === "hi") return `${transit} खेपें पारगमन में हैं, ${delayed} विलंबित।`;
    if (lng === "as") return `${transit} টা সামগ্ৰী পৰিবহণৰত, ${delayed} টা পলম হৈছে।`;
    if (lng === "mni") return `${transit} পোৎলম চৎথোক্লি, ${delayed} লেংদনা থুংবা ঙমদে।`;
    if (lng === "ne") return `${transit} ढुवानीहरू मार्गमा छन्, ${delayed} ढिलाइ भएका छन्।`;
    if (lng === "brx") return `${transit} मुवा दैथायहरनाया सोलिदों, ${delayed} लेथ जाना दं।`;
    if (lng === "lus") return `Thawn mek ${transit} awmin, ${delayed} a thleng har.`;
    if (lng === "trp") return `Pothang ${transit} lamalo, ${delayed} aswk rwkya.`;
    if (lng === "kha") return `${transit} ki mar ba dang kit, ${delayed} ki la sahkut.`;
  }

  // 5. incident line
  const mIncLine = text.match(/^(CRITICAL|HIGH|MEDIUM|LOW):\s*([a-zA-Z\s]+)\s+at\s+([^,]+),\s*([^(]+)\s*\((verified|unverified report)\)\.?$/i);
  if (mIncLine) {
    const [, sev, rawType, loc, dist, ver] = mIncLine;
    const sevKey = sev.toUpperCase();
    const typeKey = rawType.trim().toLowerCase();
    const isVer = ver.toLowerCase().includes("verified") && !ver.toLowerCase().includes("unverified");

    const sevText = SEVERITY_TRANSLATION[sevKey]?.[lng] || sev;
    const typeText = INCIDENT_TYPE_TRANSLATION[typeKey]?.[lng] || rawType;
    const verText = isVer
      ? (lng === "hi" ? "सत्यापित" : lng === "as" ? "প্ৰমাণিত" : lng === "mni" ? "চেক তৌরবা" : lng === "ne" ? "प्रमाणित" : "verified")
      : (lng === "hi" ? "असत्यापित रिपोर्ट" : lng === "as" ? "অপ্ৰমাণিত প্ৰতিবেদন" : lng === "mni" ? "চেক তৌদবা" : lng === "ne" ? "अप्रमाणित रिपोर्ट" : "unverified report");

    if (lng === "hi") return `${sevText}: ${loc}, ${dist.trim()} में ${typeText} (${verText})।`;
    if (lng === "as") return `${sevText}: ${loc}, ${dist.trim()}ত ${typeText} (${verText})।`;
    if (lng === "mni") return `${sevText}: ${loc}, ${dist.trim()}দা ${typeText} (${verText})।`;
    if (lng === "ne") return `${sevText}: ${loc}, ${dist.trim()}मा ${typeText} (${verText})।`;
    if (lng === "brx") return `${sevText}: ${loc}, ${dist.trim()} आव ${typeText} (${verText})।`;
    if (lng === "lus") return `${sevText}: ${loc}, ${dist.trim()} ah ${typeText} (${verText}).`;
    return `${sevText}: ${typeText} at ${loc}, ${dist} (${verText}).`;
  }

  // 6. risk line
  const mRisk = text.match(/^(.*?)\s+forecast\s+at\s+([^,]+),\s*(.*?)\s*—\s*(\d+\/\d+)\s+at\s+(\d+)%\s+confidence\.?$/i);
  if (mRisk) {
    const [, issue, loc, dist, score, conf] = mRisk;
    if (lng === "hi") return `${loc}, ${dist} में ${issue} का पूर्वानुमान — ${score} (${conf}% विश्वसनीयता)।`;
    if (lng === "as") return `${loc}, ${dist}ত ${issue}ৰ পূৰ্বানুমান — ${score} (${conf}% বিশ্বাসযোগ্যতা)।`;
    if (lng === "mni") return `${loc}, ${dist}দা ${issue}গী পূর্বাভাষ — ${score} (${conf}% থাজবা লৈবা)।`;
    if (lng === "ne") return `${loc}, ${dist}मा ${issue}को पूर्वानुमान — ${score} (${conf}% आत्मविश्वास)।`;
    if (lng === "brx") return `${loc}, ${dist} आव ${issue} सिगां खौरां — ${score} (${conf}% फोथायथाव)।`;
    if (lng === "lus") return `${loc}, ${dist} ah ${issue} tura rin — ${score} (${conf}% rintlak).`;
    return `${issue} forecast at ${loc}, ${dist} — ${score} at ${conf}% confidence.`;
  }

  // 7. road closed
  const mClosed = text.match(/^(.*?)\s+is\s+closed\s+to\s+traffic\s+in\s+(.*?)\.?$/i);
  if (mClosed) {
    const [, road, dist] = mClosed;
    if (lng === "hi") return `${dist} में ${road} यातायात के लिए पूरी तरह बंद है।`;
    if (lng === "as") return `${dist}ত ${road} যাতায়াতৰ বাবে বন্ধ আছে।`;
    if (lng === "mni") return `${dist}দা ${road} চৎথোক-চৎশিন থিংজিনখ্রে।`;
    if (lng === "ne") return `${dist}मा ${road} यातायातका लागि बन्द गरिएको छ।`;
    if (lng === "brx") return `${dist} आव ${road} लामाया गाडी थांनाय-फैनायनि थाखाय बन्द।`;
    if (lng === "lus") return `${dist} ah ${road} khar a ni.`;
    return `${road} is closed to traffic in ${dist}.`;
  }

  // 8. exposed vehicles
  const mExposed = text.match(/^(\d+)\s+vehicle\(s\)\s+are\s+within\s+25\s+km\s+of\s+an\s+active\s+incident,\s+including\s+(.*?)\.?$/i);
  if (mExposed) {
    const [, count, sample] = mExposed;
    if (lng === "hi") return `${count} वाहन सक्रिय घटना के 25 किमी के दायरे में हैं, जिनमें ${sample} शामिल हैं।`;
    if (lng === "as") return `${count} খন বাহন সক্ৰিয় ঘটনাৰ ২৫ কিমি দূৰত্বৰ ভিতৰত আছে, যাৰ ভিতৰত ${sample} অন্তৰ্ভুক্ত।`;
    if (lng === "mni") return `${count} গাড়ি থৌদোক থোক্লিবা মফমদগী ২৫ কিমি মনুংদা লৈ, মদুগী মনুংদা ${sample} য়াওরি।`;
    if (lng === "ne") return `${count} सवारी साधनहरू सक्रिय घटनाको २५ किमी भित्र छन्, जसमा ${sample} समावेश छन्।`;
    if (lng === "brx") return `${count} गाडीफोरा २५ किल'मिटारसिम जाथाय जायगानि खाथियाव दं, जेराव ${sample} दं।`;
    return `${count} vehicle(s) within 25 km of active incident, including ${sample}.`;
  }

  // 9. priority delivery delayed
  const mPriorityDeliv = text.match(/^(CRITICAL|EMERGENCY|HIGH|NORMAL)\s+([a-zA-Z\s]+)\s+consignment\s+to\s+(.*?)\s+is\s+delayed\.?$/i);
  if (mPriorityDeliv) {
    const [, prio, rawCargo, dest] = mPriorityDeliv;
    const prioKey = prio.toUpperCase();
    const cargoKey = rawCargo.trim().toLowerCase();
    const prioText = SEVERITY_TRANSLATION[prioKey]?.[lng] || prio;
    const cargoText = CARGO_TRANSLATION[cargoKey]?.[lng] || rawCargo;

    if (lng === "hi") return `${dest} के लिए ${prioText} ${cargoText} खेप विलंबित है।`;
    if (lng === "as") return `${dest}লৈ ${prioText} ${cargoText} সামগ্ৰী পলম হৈছে।`;
    if (lng === "mni") return `${dest}গীদমক ${prioText} ${cargoText} থুংবা লেংদনা লৈরে।`;
    if (lng === "ne") return `${dest}का लागि ${prioText} ${cargoText} खेप ढिलाइ भएको छ।`;
    if (lng === "brx") return `${dest} सिम ${prioText} ${cargoText} मुवाया लेथ जाबाय।`;
    return `${prioText} ${cargoText} consignment to ${dest} is delayed.`;
  }

  // 10. re-route traffic
  const mReroute = text.match(/^Re-route\s+traffic\s+off\s+(.*?)\s+and\s+publish\s+the\s+alternative\s+corridor\.?$/i);
  if (mReroute) {
    const [, roads] = mReroute;
    if (lng === "hi") return `${roads} से यातायात को डायवर्ट करें और वैकल्पिक सुरक्षित गलियारा प्रकाशित करें।`;
    if (lng === "as") return `${roads}ৰ পৰা যাতায়াত বিকল্প পথলৈ স্থানান্তৰ কৰক আৰু নতুন কৰিড'ৰ প্ৰকাশ কৰক।`;
    if (lng === "mni") return `${roads}দগী অতোপ্পা লম্বীদা ডাইভার্ট তৌবিয়ু অমসুং অনৌবা লম্বী খঙহনবিয়ু।`;
    if (lng === "ne") return `${roads} बाट ट्राफिक डाइभर्ट गर्नुहोस् र वैकल्पिक करिडोर प्रकाशित गर्नुहोस्।`;
    if (lng === "brx") return `${roads} निफ्राय गाडीफोरखौ गुबुन लामायाव दैथाय आरो गोदान लामा खौरां हो।`;
    return `Re-route traffic off ${roads} and publish alternative corridor.`;
  }

  // 11. escalate delayed
  const mEsc = text.match(/^Escalate\s+(\d+)\s+delayed\s+priority\s+consignment\(s\)\s*—\s*reassign\s+or\s+clear\s+a\s+corridor\.?$/i);
  if (mEsc) {
    const [, count] = mEsc;
    if (lng === "hi") return `${count} विलंबित प्राथमिकता खेप(पों) का त्वरित निवारण करें — नया मार्ग दें या गलियारा साफ कराएं।`;
    if (lng === "as") return `${count} টা পলম হোৱা জৰুৰী সামগ্ৰী তৎকালীনভাৱে মুকলি কৰক — বিকল্প দিয়ক বা পথ পৰিষ্কাৰ কৰক।`;
    if (lng === "mni") return `${count} থেংলবা অকনবা পোৎলমশিংদা মমিং থমদুনা অনৌবা লম্বী পীবিয়ু নত্রগা লম্বী শেংদোকপিয়ু।`;
    if (lng === "ne") return `${count} ढिलाइ भएका प्राथमिकता ढुवानीहरूलाई प्राथमिकता दिनुहोस् — पुन: तोक्नुहोस् वा करिडोर खाली गर्नुहोस्।`;
    return `Escalate ${count} delayed priority consignment(s) — reassign or clear a corridor.`;
  }

  // 12. triage unack alerts
  const mTriage = text.match(/^Triage\s+(\d+)\s+unacknowledged\s+critical\s+alerts\.?$/i);
  if (mTriage) {
    const [, count] = mTriage;
    if (lng === "hi") return `${count} अस्वीकृत गंभीर अलर्टों की तत्काल समीक्षा करें।`;
    if (lng === "as") return `${count} টা অস্বীকাৰ কৰা গুৰুতৰ সতৰ্কবাণী তৎকালীনভাৱে পৰ্যালোচনা কৰক।`;
    if (lng === "mni") return `${count} য়েংখিদ্রিবা অকনবা চেকশিন ৱাফমশিংদা মমিং থমদুনা থবক তৌবিয়ু।`;
    if (lng === "ne") return `${count} अस्वीकृत गम्भीर चेतावनीहरूको तत्काल समीक्षा गर्नुहोस्।`;
    return `Triage ${count} unacknowledged critical alerts.`;
  }

  // 13. close road
  const mCloseDiv = text.match(/^Close\s+(.*?)\s+and\s+divert\s+all\s+traffic\s+to\s+the\s+safest\s+alternative\.?$/i);
  if (mCloseDiv) {
    const [, road] = mCloseDiv;
    if (lng === "hi") return `${road} को बंद करें और समस्त यातायात को सबसे सुरक्षित विकल्प पर मोड़ें।`;
    if (lng === "as") return `${road} বন্ধ কৰক আৰু সকলো যান-বাহন আটাইতকৈ সুৰক্ষিত বিকল্প পথলৈ স্থানান্তৰ কৰক।`;
    if (lng === "mni") return `${road} থিংজিনবিয়ু অমসুং অপুনবা গাড়ীশিং খ্বাইদগী নিংথিনা লৈবা লম্বীদা ডাইভার্ট তৌবিয়ু।`;
    if (lng === "ne") return `${road} बन्द गर्नुहोस् र सम्पूर्ण ट्राफिकलाई सबैभन्दा सुरक्षित विकल्पमा मोड्नुहोस्।`;
    return `Close ${road} and divert all traffic to safest alternative.`;
  }

  // 14. suspend movement
  const mSuspend = text.match(/^Suspend\s+movement\s+through\s+(.*?)\s+at\s+(.*?)\s+and\s+divert\s+essential\s+consignments\s+to\s+the\s+safest\s+alternative\.\s*Position\s+clearing\s+equipment\s+at\s+the\s+nearest\s+depot\.?$/i);
  if (mSuspend) {
    const [, road, loc] = mSuspend;
    if (lng === "hi") return `${loc} पर ${road} से आवागमन स्थगित करें और आवश्यक सामग्री को सुरक्षित मार्ग पर मोड़ें। निकटतम डिपो पर मलबा हटाने वाले उपकरण तैनात करें।`;
    if (lng === "as") return `${loc}ত ${road}ৰে যাতায়াত স্থগিত ৰাখক আৰু জৰুৰী সামগ্ৰী সুৰক্ষিত পথলৈ স্থানান্তৰ কৰক। ওচৰৰ ডিপোত উদ্ধাৰকাৰী সঁজুলি মজুত ৰাখক।`;
    if (lng === "mni") return `${loc}দা ${road}গী চৎথোক-চৎশিন লেপকনু অমসুং মরুওইবা পোৎলমশিং নুংঙাইবা লম্বীদা পুথোকপিয়ু। নক্নবা মফমদা লম্বী শেংদোক্নবা মেছিনশিং থমজিনবিয়ু।`;
    if (lng === "ne") return `${loc}मा ${road} बाट आवागमन स्थगित गर्नुहोस् र आवश्यक सामग्री सुरक्षित मार्गमा मोड्नुहोस्। नजिकको डिपोमा मलबार हटाउने उपकरणहरू तैनाथ गर्नुहोस्।`;
    return text;
  }

  // Common fallbacks
  if (text.toLowerCase().includes("no location is currently forecast in the high or critical risk band")) {
    if (lng === "hi") return "वर्तमान में किसी भी स्थान के लिए उच्च या गंभीर जोखिम का पूर्वानुमान नहीं है।";
    if (lng === "as") return "বৰ্তমান কোনো স্থানতে উচ্চ বা গুৰুতৰ বিপদাশংকাৰ পূৰ্বানুমান নাই।";
    if (lng === "mni") return "হৌজিক্কী ওইনা অকনবা করিগুম্বা খুদোংথীবা থোকপগী পূর্বাভাষ লৈতে।";
    if (lng === "ne") return "हाल कुनै पनि स्थान उच्च वा गम्भीर जोखिम क्षेत्रमा पूर्वानुमान गरिएको छैन।";
  }

  if (text.toLowerCase().includes("no operation is currently disrupted")) {
    if (lng === "hi") return "वर्तमान में कोई भी संचालन बाधित नहीं है।";
    if (lng === "as") return "বৰ্তমান কোনো পৰিবহণ বিঘ্নিত হোৱা নাই।";
    if (lng === "mni") return "হৌজিক্কী ওইনা লম্বী-থোং মাংবা করিগুম্বা লৈতে।";
    if (lng === "ne") return "हाल कुनै पनि सञ्चालन अवरुद्ध भएको छैन।";
  }

  if (text.toLowerCase().includes("continue routine monitoring. nothing currently requires escalation")) {
    if (lng === "hi") return "नियमित निगरानी जारी रखें। वर्तमान में किसी आपातकालीन कार्रवाई की आवश्यकता नहीं है।";
    if (lng === "as") return "নিয়মীয়া নিৰীক্ষণ অব্যাহত ৰাখক। বৰ্তমান বিশেষ পদক্ষেপৰ প্ৰয়োজন নাই।";
    if (lng === "mni") return "মখা তানা চেকশিন্না য়েংশিনবিয়ু। হৌজিক্কী ওইনা অকনবা থবক লৌখৎপগী মথৌ তাদে।";
    if (lng === "ne") return "नियमित अनुगमन जारी राख्नुहोस्। हाल कुनै पनि कुरालाई उच्च स्तरमा लैजान आवश्यक छैन।";
  }

  return text;
}

export function translateCategory(cat: string, lng: string): string {
  if (!cat || lng === "en") return cat;
  const c = cat.toLowerCase();
  if (c === "logistics") {
    if (lng === "hi") return "लॉजिस्टिक्स";
    if (lng === "as") return "লজিষ্টিকছ";
    if (lng === "mni") return "লোজিষ্টিক্স";
    if (lng === "ne") return "लजिस्टिक्स";
    if (lng === "brx") return "लजिस्टिक";
    if (lng === "lus") return "Lirthei";
    if (lng === "trp") return "Logistics";
    if (lng === "kha") return "Logistics";
  }
  if (c === "incident") {
    if (lng === "hi") return "घटना";
    if (lng === "as") return "ঘটনা";
    if (lng === "mni") return "থৌদোক";
    if (lng === "ne") return "घटना";
    if (lng === "brx") return "जाथाय";
    if (lng === "lus") return "Chetsualna";
    if (lng === "trp") return "Kok";
    if (lng === "kha") return "Jingjia";
  }
  if (c === "risk") {
    if (lng === "hi") return "जोखिम";
    if (lng === "as") return "বিপদাশংকা";
    if (lng === "mni") return "রিস্ক";
    if (lng === "ne") return "जोखिम";
    if (lng === "brx") return "खिफिद";
    if (lng === "lus") return "Hlauhawm";
    if (lng === "trp") return "Risk";
    if (lng === "kha") return "Jingma";
  }
  if (c === "alert") {
    if (lng === "hi") return "अलर्ट";
    if (lng === "as") return "সতৰ্কবাৰ্তা";
    if (lng === "mni") return "চেকশিনৱা";
    if (lng === "ne") return "चेतावनी";
    if (lng === "brx") return "सांग्रांथि";
    if (lng === "lus") return "Hriattirna";
    if (lng === "trp") return "Alert";
    if (lng === "kha") return "Jingmaham";
  }
  if (c === "system") {
    if (lng === "hi") return "सिस्टम";
    if (lng === "as") return "প্ৰণালী";
    if (lng === "mni") return "সিষ্টেম";
    if (lng === "ne") return "प्रणाली";
    if (lng === "brx") return "सिस्टिम";
    if (lng === "lus") return "System";
    if (lng === "trp") return "System";
    if (lng === "kha") return "System";
  }
  return cat;
}

export function translateSeverityLabel(sev: string, lng: string): string {
  if (!sev || lng === "en") return sev;
  const s = sev.toUpperCase();
  if (SEVERITY_TRANSLATION[s]?.[lng]) {
    return SEVERITY_TRANSLATION[s][lng];
  }
  return sev;
}

export function formatLocalizedTimeAgo(timestamp: number, lng: string): string {
  const now = Date.now();
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (lng === "en" || !lng) {
    if (seconds < 45) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (lng === "hi") {
    if (seconds < 45) return "अभी";
    if (minutes < 60) return `${minutes} मिनट पहले`;
    if (hours < 24) return `${hours} घंटे पहले`;
    return `${days} दिन पहले`;
  }
  if (lng === "as") {
    if (seconds < 45) return "এইমাত্ৰ";
    if (minutes < 60) return `${minutes} মিনিট আগতে`;
    if (hours < 24) return `${hours} ঘণ্টা আগতে`;
    return `${days} দিন আগতে`;
  }
  if (lng === "mni") {
    if (seconds < 45) return "হৌজিক্তমক";
    if (minutes < 60) return `${minutes}মিনিত মমাংদা`;
    if (hours < 24) return `${hours}পুং মমাংদা`;
    return `${days}নুমিৎ মমাংদা`;
  }
  if (lng === "ne") {
    if (seconds < 45) return "भर्खरै";
    if (minutes < 60) return `${minutes} मिनेट अघि`;
    if (hours < 24) return `${hours} घण्टा अघि`;
    return `${days} दिन अघि`;
  }
  if (lng === "brx") {
    if (seconds < 45) return "दासान्दि";
    if (minutes < 60) return `${minutes} मिनिट सिगां`;
    if (hours < 24) return `${hours} घन्टा सिगां`;
    return `${days} सान सिगां`;
  }
  if (lng === "lus") {
    if (seconds < 45) return "tun lawk";
    if (minutes < 60) return `${minutes}m kalta`;
    if (hours < 24) return `${hours}h kalta`;
    return `${days}d kalta`;
  }
  if (lng === "trp") {
    if (seconds < 45) return "tabukno";
    if (minutes < 60) return `${minutes}m saikhe`;
    if (hours < 24) return `${hours}h saikhe`;
    return `${days}d saikhe`;
  }
  if (lng === "kha") {
    if (seconds < 45) return "mynta hi";
    if (minutes < 60) return `${minutes}m mynshuwa`;
    if (hours < 24) return `${hours}h mynshuwa`;
    return `${days}d mynshuwa`;
  }

  if (seconds < 45) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function translateActivityMessage(msg: string, lng: string): string {
  if (!msg || lng === "en" || !lng) return msg;

  // 1. NH-6 risk rose from 45 to 59 — now high.
  const mRiskRose = msg.match(/^(.+?)\s+risk rose from\s+(\d+)\s+to\s+(\d+)\s+—\s+now\s+([a-zA-Z]+)\.?/i);
  if (mRiskRose) {
    const [, road, fromScore, toScore, level] = mRiskRose;
    const lev = translateSeverityLabel(level, lng);
    if (lng === "hi") return `${road} का जोखिम ${fromScore} से बढ़कर ${toScore} हुआ — अब ${lev}।`;
    if (lng === "as") return `${road}ৰ বিপদাশংকা ${fromScore}ৰ পৰা বৃদ্ধি পাই ${toScore} হ'ল — এতিয়া ${lev}।`;
    if (lng === "mni") return `${road}গী রিস্ক ${fromScore}দগী ${toScore}দা হেনগৎলে — হৌজিক ${lev}।`;
    if (lng === "ne") return `${road} जोखिम ${fromScore} बाट बढेर ${toScore} पुग्यो — अब ${lev}।`;
    if (lng === "brx") return `${road} खिफिद ${fromScore} निफ्राय ${toScore} जाबाय — दा ${lev}।`;
    if (lng === "lus") return `${road} hlauhawm chu ${fromScore} atanga ${toScore} a kai — tunah ${lev}.`;
    if (lng === "trp") return `${road} risk ${fromScore} ni baha ${toScore} thangbai — tabuk ${lev}.`;
    if (lng === "kha") return `${road} jingma la kiew na ${fromScore} sha ${toScore} — mynta ${lev}.`;
  }

  // 2. NH-6 blocked at Nongpoh. 3 vehicle(s) halted, 2 route(s) re-planned.
  const mBlocked = msg.match(/^(.+?)\s+blocked at\s+([^.]+)\.\s+(\d+)\s+vehicle\(s\)\s+halted,\s+(\d+)\s+route\(s\)\s+re-planned\.?/i);
  if (mBlocked) {
    const [, road, loc, vehicles, routes] = mBlocked;
    if (lng === "hi") return `${loc} पर ${road} अवरुद्ध। ${vehicles} वाहन रुके, ${routes} मार्गों की पुनर्योजना बनाई गई।`;
    if (lng === "as") return `${loc}ত ${road} অৱৰোধ। ${vehicles} বাহন স্তব্ধ, ${routes} টা পথ পুনৰ নিৰ্ধাৰণ।`;
    if (lng === "mni") return `${loc}দা ${road} লম্বী থিংলে। গারী ${vehicles} লেপখ্রে, লম্বী ${routes} অমুক হন্না শেম্লে।`;
    if (lng === "ne") return `${loc}मा ${road} अवरुद्ध। ${vehicles} सवारी साधन रोकिए, ${routes} मार्गहरू पुन: योजना गरियो।`;
    if (lng === "brx") return `${loc} आव ${road} हेंथा जाबाय। ${vehicles} गारि थाबाय, ${routes} लामा आनजाद खालामफिनबाय।`;
    if (lng === "lus") return `${loc} ah ${road} ping. Lirthei ${vehicles} a tang, kawng ${routes} siamthat a ni.`;
    if (lng === "trp") return `${loc} wo ${road} thangbai. Gari ${vehicles} tongbai, lama ${routes} swnamchapbai.`;
    if (lng === "kha") return `${loc} ha ${road} la khang. ${vehicles} tylli ki kali ki sangeh, ${routes} tylli ki surok la pynkhreh thymmai.`;
  }

  // 3. Assessed 31 locations — 3 critical, 8 high.
  const mAssessed = msg.match(/^Assessed\s+(\d+)\s+locations\s+—\s+(\d+)\s+critical,\s+(\d+)\s+high/i);
  if (mAssessed) {
    const [, total, crit, high] = mAssessed;
    if (lng === "hi") return `${total} स्थानों का आकलन किया गया — ${crit} गंभीर, ${high} उच्च जोखिम।`;
    if (lng === "as") return `${total} টা স্থানৰ মূল্যায়ন সম্পন্ন — ${crit} টা গুৰুতৰ, ${high} টা উচ্চ।`;
    if (lng === "mni") return `মফম ${total} য়েংশিনখ্রে — ${crit} য়াম্না লুনা, ${high} ৱাংনা।`;
    if (lng === "ne") return `${total} स्थानहरूको मूल्याङ्कन गरियो — ${crit} गम्भीर, ${high} उच्च।`;
    if (lng === "brx") return `${total} जायगाफोर नायबिजिरबाय — ${crit} गोख्रोन्थार, ${high} गोजौ।`;
    if (lng === "lus") return `Hmun ${total} enfiah a ni — ${crit} hlauhawm zual, ${high} sang.`;
    if (lng === "trp") return `Jaga ${total} nainai — ${crit} gwbwrwi, ${high} chwng.`;
    if (lng === "kha") return `La thew ${total} tylli ki jaka — ${crit} ba shyrkhei, ${high} ba khlain.`;
  }

  // 4. Seeded 18 vehicles, 30 roads, 6 incidents, 4 alerts.
  const mSeeded = msg.match(/^Seeded\s+(\d+)\s+vehicles,\s+(\d+)\s+roads,\s+(\d+)\s+incidents,\s+(\d+)\s+alerts/i);
  if (mSeeded) {
    const [, veh, roads, inc, alt] = mSeeded;
    if (lng === "hi") return `${veh} वाहन, ${roads} सड़कें, ${incidents_count(inc, lng)}, ${alt} अलर्ट लोड किए गए।`;
    if (lng === "as") return `${veh} বাহন, ${roads} পথ, ${inc} টা ঘটনা, ${alt} সতৰ্কবাৰ্তা সংৰোপিত কৰা হ'ল।`;
    if (lng === "mni") return `গারী ${veh}, লম্বী ${roads}, থৌদোক ${inc}, চেকশিনৱা ${alt} হাপচিনখ্রে।`;
    if (lng === "ne") return `${veh} सवारी, ${roads} सडक, ${inc} घटनाहरू, ${alt} चेतावनीहरू लोड गरियो।`;
  }

  // 5. Reset — removed 1 incident(s), 2 alert(s).
  const mReset = msg.match(/^Reset\s+—\s+removed\s+(\d+)\s+incident\(s\),\s+(\d+)\s+alert\(s\)/i);
  if (mReset) {
    const [, inc, alt] = mReset;
    if (lng === "hi") return `रीसेट संपन्न — ${inc} घटनाएं, ${alt} अलर्ट हटाए गए।`;
    if (lng === "as") return `পুনৰ্নিৰ্ধাৰণ সম্পন্ন — ${inc} টা ঘটনা, ${alt} সতৰ্কবাৰ্তা অপসাৰণ কৰা হ'ল।`;
    if (lng === "mni") return `অমুক হন্না শেম্লে — থৌদোক ${inc}, চেকশিনৱা ${alt} লৌথোকখ্রে।`;
    if (lng === "ne") return `रिसेट सम्पन्न — ${inc} घटनाहरू, ${alt} चेतावनीहरू हटाइयो।`;
  }

  // 6. Alert acknowledged
  if (msg.toLowerCase().startsWith("alert acknowledged")) {
    if (lng === "hi") return msg.replace(/alert acknowledged/i, "अलर्ट स्वीकार किया गया");
    if (lng === "as") return msg.replace(/alert acknowledged/i, "সতৰ্কবাৰ্তা গ্ৰহণ কৰা হ'ল");
    if (lng === "mni") return msg.replace(/alert acknowledged/i, "চেকশিনৱা য়াখ্রে");
    if (lng === "ne") return msg.replace(/alert acknowledged/i, "चेतावनी स्वीकार गरियो");
  }

  return msg;
}

function incidents_count(n: string, lng: string): string {
  if (lng === "hi") return `${n} घटनाएं`;
  if (lng === "as") return `${n} টা ঘটনা`;
  if (lng === "mni") return `থৌদোক ${n}`;
  if (lng === "ne") return `${n} घटनाहरू`;
  return `${n} incidents`;
}

export function translatePredictedIssue(issue: string, lng: string): string {
  if (!issue || lng === "en" || !lng) return issue;
  const map: Record<string, Record<string, string>> = {
    "landslide / slope failure risk": {
      hi: "भूस्खलन / ढलान विफलता जोखिम",
      as: "ভূমিস্খলন / পাহাৰ খহাৰ বিপদাশংকা",
      mni: "লৈহিকপা / চিংখ্ৰুম খাকপগী রিস্ক",
      ne: "पहिरो / ढलान विफलता जोखिम",
      brx: "हा खस्रानाय खिफिद",
      lus: "Leimin hlauhawm",
      trp: "Hani baitiri risk",
      kha: "Jingma kyllon lum",
    },
    "flooding risk": {
      hi: "बाढ़ का जोखिम",
      as: "বানপানীৰ বিপদাশংকা",
      mni: "ঈচাওগী রিস্ক",
      ne: "बाढीको जोखिम",
      brx: "दै बाना खिफिद",
      lus: "Tui lian hlauhawm",
      trp: "Twi twibai risk",
      kha: "Jingma shlei um",
    },
    "severe weather disruption": {
      hi: "गंभीर मौसम व्यवधान",
      as: "প্ৰতিকূল বতৰৰ ব্যাঘাত",
      mni: "নুংশিৎ-নোংগী অকনবা অপনবা",
      ne: "प्रतिकूल मौसम अवरोध",
      brx: "गोख्रोन्थार बार-हावा हेंथा",
      lus: "Khawchhia vanga thil buai",
      trp: "Borok sikari kokthum",
      kha: "Ka jingeh na ka jingkylla suinbneng",
    },
    "road accessibility degradation": {
      hi: "सड़क पहुंच में गिरावट",
      as: "পথৰ সুগমতা হ্ৰাস",
      mni: "লম্বী চৎথোক-চৎশিন হন্থরকপা",
      ne: "सडक पहुँचमा गिरावट",
      brx: "लामा थांनाय-फैनाय खम जानाय",
      lus: "Kawng chhiatna",
      trp: "Lama rwchapya",
      kha: "Ka jingbha ka surok ka hiar",
    },
  };
  const key = issue.toLowerCase().trim();
  return map[key]?.[lng] ?? issue;
}

export function translateRiskFactor(factor: string, lng: string): string {
  if (!factor || lng === "en" || !lng) return factor;
  const map: Record<string, Record<string, string>> = {
    rainfall: {
      hi: "वर्षा",
      as: "বৰষুণ",
      mni: "নোংচুবা",
      ne: "वर्षा",
      brx: "अखा हानाय",
      lus: "Ruahsur",
      trp: "Wata",
      kha: "Jingslap",
    },
    "active incidents": {
      hi: "सक्रिय घटनाएं",
      as: "সক্ৰিয় ঘটনা",
      mni: "সক্রিয় থৌদোক",
      ne: "सक्रिय घटनाहरू",
      brx: "सोलिबाय थानाय जाथाय",
      lus: "Buaina awm mek",
      trp: "Chalai tongnai kok",
      kha: "Ki jingjia ba dang jia",
    },
    "terrain slope": {
      hi: "भूभाग ढलान",
      as: "পাহাৰীয়া ঢাল",
      mni: "চিংগী চিংখ্রুম",
      ne: "भूभाग ढलान",
      brx: "हाजो सोरां",
      lus: "Tlang awmze hmun",
      trp: "Hani slop",
      kha: "Ka rynsan lum",
    },
    "road class": {
      hi: "सड़क श्रेणी",
      as: "পথৰ শ্ৰেণী",
      mni: "লম্বীগী মখল",
      ne: "सडक श्रेणी",
      brx: "लामानि थाखो",
      lus: "Kawng chi",
      trp: "Lamani class",
      kha: "Ka jaid surok",
    },
    "severe weather": {
      hi: "गंभीर मौसम",
      as: "প্ৰতিকূল বতৰ",
      mni: "অকনবা বতর",
      ne: "खराब मौसम",
      brx: "गोख्रोन्थार बार-हावा",
      lus: "Khawchhia",
      trp: "Hukumu gwbwrwi",
      kha: "Ka suinbneng ba jur",
    },
    "historical hazard": {
      hi: "ऐतिहासिक आपदा",
      as: "ঐতিহাসিক দুৰ্যোগ",
      mni: "অরিবা থৌদোক",
      ne: "ऐतिहासिक जोखिम",
      brx: "गोजाम जाब्रबथाय",
      lus: "Chanchin hlui hlauhawm",
      trp: "Kharani chwng",
      kha: "Ki jingjia ba la dep",
    },
  };
  const key = factor.toLowerCase().trim();
  return map[key]?.[lng] ?? factor;
}

export function translateHealthComponent(comp: string, lng: string): string {
  if (!comp || lng === "en" || !lng) return comp;
  const map: Record<string, Record<string, string>> = {
    "road accessibility": {
      hi: "सड़क पहुंच",
      as: "পথ সুগমতা",
      mni: "লম্বীগী এক্সেসিবিলিটি",
      ne: "सडक पहुँच",
      brx: "लामानि सुबिदा",
      lus: "Kawng zawh theih",
      trp: "Lamani phainai",
      kha: "Ka jingshngain ka surok",
    },
    "delivery performance": {
      hi: "वितरण प्रदर्शन",
      as: "বিতৰণ প্ৰদৰ্শন",
      mni: "পোৎলম য়ৌহনবা",
      ne: "ढुवानी प्रदर्शन",
      brx: "मुवा राननाय हाबा",
      lus: "Thil thawn theih zat",
      trp: "Pothang rwchapnai",
      kha: "Ka jingkit mar",
    },
    "incident load": {
      hi: "घटना भार",
      as: "ঘটনাৰ চাপ",
      mni: "থৌদোক্কী তারক",
      ne: "घटनाको भार",
      brx: "जाथायनि बिबान",
      lus: "Buaina tam zawng",
      trp: "Kokni bojha",
      kha: "Ka jingkit jingjia",
    },
    "vehicle availability": {
      hi: "वाहन उपलब्धता",
      as: "বাহন উপলব্ধতা",
      mni: "গাড়ি ফংবা",
      ne: "सवारी साधन उपलब्धता",
      brx: "गाडीनि मोनहैनाय",
      lus: "Lirthei awm zat",
      trp: "Gari manmani",
      kha: "Ka jingdon ki kali",
    },
    "critical alerts": {
      hi: "गंभीर अलर्ट",
      as: "গুৰুতৰ সতৰ্কবাৰ্তা",
      mni: "অকনবা চেকশিনৱা",
      ne: "गम्भीर चेतावनी",
      brx: "गोख्रोन्थार इसारा",
      lus: "Hriattirna hlauhawm",
      trp: "Gwbwrwi alert",
      kha: "Ki jingma ba jur",
    },
    "predicted risk": {
      hi: "पूर्वानुमानित जोखिम",
      as: "পূৰ্বানুমানিত বিপদাশংকা",
      mni: "মাংজৌননা খংবা রিস্ক",
      ne: "पूर्वानुमान गरिएको जोखिम",
      brx: "सिगां खौरां खिफिद",
      lus: "Hlauhawm rin lawk",
      trp: "Phainai risk",
      kha: "Ka jingma ba la iit lypa",
    },
  };
  const key = comp.toLowerCase().trim();
  return map[key]?.[lng] ?? comp;
}

export function translateOptionLabel(label: string, lng: string): string {
  if (!label || lng === "en" || !lng) return label;
  if (/^recommended$/i.test(label.trim())) {
    if (lng === "hi") return "अनुशंसित";
    if (lng === "as") return "পৰামৰ্শিত";
    if (lng === "mni") return "রেকমেন্দ তৌরবা";
    if (lng === "ne") return "सिफारिस गरिएको";
    if (lng === "brx") return "सुबुंथाव";
    if (lng === "lus") return "Duhthusam";
    if (lng === "trp") return "Nangmani";
    if (lng === "kha") return "Ba la ai jingmut";
  }
  const altMatch = label.match(/^alternative\s*(\d+)$/i);
  if (altMatch) {
    const idx = altMatch[1];
    if (lng === "hi") return `वैकल्पिक ${idx}`;
    if (lng === "as") return `বিকল্প ${idx}`;
    if (lng === "mni") return `অতোপ্পা ${idx}`;
    if (lng === "ne") return `वैकल्पिक ${idx}`;
    if (lng === "brx") return `सोलिफिन ${idx}`;
    if (lng === "lus") return `Kawng dang ${idx}`;
    if (lng === "trp") return `Ulo ${idx}`;
    if (lng === "kha") return `Kawei pat ${idx}`;
  }
  return label;
}

export function translateEmergencySummary(summary: string, lng: string): string {
  if (!summary || lng === "en" || !lng) return summary;

  if (/no emergency conditions detected/i.test(summary)) {
    if (lng === "hi") return "निगरानी किए गए क्षेत्र में कोई आपातकालीन स्थिति नहीं पाई गई।";
    if (lng === "as") return "নজৰদাৰী কৰা অঞ্চলত কোনো জৰুৰীকালীন পৰিস্থিতি চিনাক্ত হোৱা নাই।";
    if (lng === "mni") return "য়েংশিল্লিবা লমদম অসিদা অথোইবা অৱাবা ফীভম অমত্তা থোকতে।";
    if (lng === "ne") return "अनुगमन गरिएको क्षेत्रमा कुनै आपतकालीन अवस्था फेला परेन।";
    if (lng === "brx") return "नायबिजिरनाय जायगायाव जेबो जाब्रबथाय जाथाय मोननाय जायाखै।";
    if (lng === "lus") return "Enkawl mek ram chhungah hmanhmawh ngai thil a awm lo.";
    if (lng === "trp") return "Khywna tongnai jygaho mwchang mangliya tongya.";
    if (lng === "kha") return "Ym don kano kano ka jingeh ba kyrkieh ha kane ka thaiñ.";
  }

  const m = summary.match(/^([A-Z]+)\s+—\s+(\d+)\s+corridor\(s\)\s+closed,\s+(\d+)\s+critical\s+incident\(s\),\s+(\d+)\s+district\(s\)\s+affected\.?/i);
  if (m) {
    const [, rawSev, corridors, incidents, districts] = m;
    const sev = translateSeverityLabel(rawSev, lng);
    if (lng === "hi") return `${sev} — ${corridors} गलियारे बंद, ${incidents} गंभीर घटनाएं, ${districts} जिले प्रभावित।`;
    if (lng === "as") return `${sev} — ${corridors} টা কৰিড'ৰ বন্ধ, ${incidents} টা গুৰুতৰ ঘটনা, ${districts} খন জিলা ক্ষতিগ্ৰস্ত।`;
    if (lng === "mni") return `${sev} — লম্বী ${corridors} থিংজিনখ্রে, অকনবা থৌদোক ${incidents}, জিলা ${districts} শোকহনখ্রে।`;
    if (lng === "ne") return `${sev} — ${corridors} करिडोर बन्द, ${incidents} गम्भीर घटनाहरू, ${districts} जिल्लाहरू प्रभावित।`;
    if (lng === "brx") return `${sev} — ${corridors} लामा बन्द, ${incidents} गोख्रोन्थार जाथाय, ${districts} जिल्ला खहा जादों।`;
    if (lng === "lus") return `${sev} — Kawng ${corridors} khar a ni a, buaina hlauhawm ${incidents}, district ${districts} a buai.`;
    if (lng === "trp") return `${sev} — Lama ${corridors} thangba, gwbwrwi kok ${incidents}, district ${districts} dukhu mano.`;
    if (lng === "kha") return `${sev} — ${corridors} ki surok ba la khang, ${incidents} ki jingjia ba jur, ${districts} ki district ba shah ktah.`;
  }

  return summary;
}

export function translateEmergencyAction(action: string, lng: string): string {
  if (!action || lng === "en" || !lng) return action;

  // Confirm clearance ETA
  const mEta = action.match(/^Confirm clearance ETA for (.+) with the road agency\.?$/i);
  if (mEta) {
    const roads = mEta[1];
    if (lng === "hi") return `सड़क एजेंसी के साथ ${roads} के लिए निकासी ईटीए की पुष्टि करें।`;
    if (lng === "as") return `পথ সংস্থাৰ সৈতে ${roads} ৰ মুকলিৰ আনুমানিক সময় নিশ্চিত কৰক।`;
    if (lng === "mni") return `লম্বীগী এজেন্সিগী লোয়ননা ${roads} লম্বী হাংদোকপগী মতম কনফার্ম তৌরো।`;
    if (lng === "ne") return `सडक निकायसँग ${roads} को खुलाउने अनुमानित समय पुष्टि गर्नुहोस्।`;
    if (lng === "brx") return `लामा बिफानजों ${roads} नि लामा उदां खालामनाय समखौ थि खालाम।`;
    if (lng === "lus") return `Kawng enkawltu hnenah ${roads} hawn hun tur zawt chiang rawh.`;
    if (lng === "trp") return `Lama agency bai ${roads} khwna samay thing khwlai.`;
    if (lng === "kha") return `Pynskhem ia ka por ban plie ia ka ${roads} bad ka tnat surok.`;
  }

  // Activate alternative corridor
  if (/Activate the alternative corridor/i.test(action)) {
    if (lng === "hi") return "वैकल्पिक गलियारे को सक्रिय करें और सक्रिय खेप वाले प्रत्येक ऑपरेटर को सूचित करें।";
    if (lng === "as") return "বিকল্প কৰিড'ৰ সক্ৰিয় কৰক আৰু সক্ৰিয় সামগ্ৰী থকা প্ৰতিজন অপাৰেটৰক অৱগত কৰক।";
    if (lng === "mni") return "অতোপ্পা লম্বী শিজিন্নৌ অমসুং পোৎলম পুবা ওপরেটরশিংদা পাও পীউ।";
    if (lng === "ne") return "वैकल्पिक करिडोर सक्रिय गर्नुहोस् र सक्रिय ढुवानी भएका प्रत्येक चालकलाई सूचित गर्नुहोस्।";
    if (lng === "brx") return "गुबुन लामाखौ सोलिहो आरो मुवा लांनाय गासैबो सालायग्राफोरनो खौरां हर।";
    if (lng === "lus") return "Kawng dang zawh tur ruahman la, motor khaltute hriattir rawh.";
    if (lng === "trp") return "Ulo lama chalai tei gari chalaiphangrokno sakhlai.";
    if (lng === "kha") return "Plie ia kawei pat ka surok bad pyntip sha baroh ki nongniah kali.";
  }

  // Give movement priority
  const mPrio = action.match(/^Give movement priority to (\d+) critical\/emergency consignment\(s\)\.?$/i);
  if (mPrio) {
    const n = mPrio[1];
    if (lng === "hi") return `${n} गंभीर/आपातकालीन खेप(पों) को आवागमन प्राथमिकता दें।`;
    if (lng === "as") return `${n} টা গুৰুতৰ/জৰুৰীকালীন সামগ্ৰীক পৰিবহণ অগ্ৰাধিকাৰ দিয়ক।`;
    if (lng === "mni") return `${n} অকনবা/ইমার্জেন্সি পোৎলমদা চৎথোক-চৎশিনগী অহানবা খুদোংচাবা পীউ।`;
    if (lng === "ne") return `${n} गम्भीर/आपतकालीन ढुवानीलाई प्राथमिकता दिनुहोस्।`;
    if (lng === "brx") return `${n} गोख्रोन्थार/जाब्रबथाय मुवाफोरनो लामा सिगां हो।`;
    if (lng === "lus") return `Hmanhmawh ngai thil thawn ${n} te kal hmasak tir rawh.`;
    if (lng === "trp") return `${n} gwbwrwi pothangno lama rwmwng rwkhi.`;
    if (lng === "kha") return `Ai lad nyngkong ia ki ${n} tylli ki jingkit ba kyrkieh.`;
  }

  // Dispatch assessment teams
  const mTeams = action.match(/^Dispatch assessment teams to (.+)\.?$/i);
  if (mTeams) {
    const locs = mTeams[1].replace(/\.$/, "");
    if (lng === "hi") return `${locs} में मूल्यांकन दल भेजें।`;
    if (lng === "as") return `${locs} লৈ মূল্যায়ন দল প্ৰেৰণ কৰক।`;
    if (lng === "mni") return `${locs} দা য়েংশিনবা টিম থাখ্রবা।`;
    if (lng === "ne") return `${locs} मा मूल्याङ्कन टोली खटाउनुहोस्।`;
    if (lng === "brx") return `${locs} आव बिजिरनाय हान्जा थिसन।`;
    if (lng === "lus") return `${locs} ah dinhmun enfiah tute tir rawh.`;
    if (lng === "trp") return `${locs} o naylai teamrokno horkhi.`;
    if (lng === "kha") return `Phah ia ki kynhun jurip sha ${locs}.`;
  }

  // No emergency-status vehicle deployed
  if (/No emergency-status vehicle is deployed/i.test(action)) {
    if (lng === "hi") return "कोई आपातकालीन स्थिति वाला वाहन तैनात नहीं है — उपलब्ध क्षमता में से एक को सौंपने पर विचार करें।";
    if (lng === "as") return "কোনো জৰুৰীকালীন বাহন নিয়োজিত হোৱা নাই — উপলব্ধ বাহনৰ পৰা এখন দায়িত্ব দিয়ক।";
    if (lng === "mni") return "ইমার্জেন্সি গাড়ি অমত্তা থারিবা লৈতে — লৈরিবা গাড়িশিংদগী অমা হাপ্পগী ৱাখল তৌরো।";
    if (lng === "ne") return "कुनै आपतकालीन सवारी साधन परिचालन गरिएको छैन — उपलब्ध क्षमताबाट एउटा खटाउनुहोस्।";
    if (lng === "brx") return "जेबो जाब्रबथाय गाडी थिसननाय जायाखै — दंखानाय गाडीफोरनिफ्राय मोनसे थिसन।";
    if (lng === "lus") return "Hmanhmawh thil atana ruahman motor a awm lo — awm sa atangin ruahman rawh.";
    if (lng === "trp") return "Jwngno emergency gari khorokbo rwya — manmani garini bisingo khoroksa rw.";
    if (lng === "kha") return "Ym pat don kali ba la buh kyrkieh — pynbiang na kiba don.";
  }

  // No emergency response action required
  if (/No emergency response action required/i.test(action)) {
    if (lng === "hi") return "किसी आपातकालीन प्रतिक्रिया कार्रवाई की आवश्यकता नहीं है।";
    if (lng === "as") return "কোনো জৰুৰীকালীন ব্যৱস্থাৰ প্ৰয়োজন নাই।";
    if (lng === "mni") return "ইমার্জেন্সি রেস্পোন্স অমত্তা তৌবগী দরকার লৈতে।";
    if (lng === "ne") return "कुनै आपतकालीन प्रतिक्रियाको आवश्यकता छैन।";
    if (lng === "brx") return "जेबो जाब्रबथाय फिनजाथाय हाबानि गोनांथि गैया।";
    if (lng === "lus") return "Hmanhmawh ngai thil tih tur a awm lo.";
    if (lng === "trp") return "Emergency samung nangya.";
    if (lng === "kha") return "Ym donkam kano kano ka jingpyrkhing ba kyrkieh.";
  }

  return action;
}


