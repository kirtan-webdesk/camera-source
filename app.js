// app.js — Vercel Serverless Function
// AI query parsing + normalization. Shopify layer pending store access.

import { Ratelimit } from '@upstash/ratelimit';
import { Redis }     from '@upstash/redis';

const ALLOW_ORIGIN = '*'; // TODO: lock to production Shopify domain before launch

// ---------------- RATE LIMITER ----------------
// 10 requests per IP per minute (sliding window).
// Requires UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in Vercel env vars.
// If those vars are absent the limiter is skipped — set them before going live.
let ratelimit = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: 'cs_ai_search',
  });
}

// ---------------- VEHICLE DATASET (source of truth from vehicle_data.csv) ----------------
// Structure: make → { model: [start_year, end_year] }
const DATASET = {
  "Audi":       { "A3":           [2015, 2020] },
  "Buick":      { "Enclave":      [2014, 2018],
                  "Encore":       [2014, 2018],
                  "Regal":        [2013, 2018],
                  "Verano":       [2013, 2015] },
  "Cadillac":   { "ATS":          [2014, 2018],
                  "CTS":          [2014, 2018],
                  "ELR":          [2014, 2014],
                  "Escalade":     [2014, 2018],
                  "SRX":          [2014, 2018],
                  "XTS":          [2014, 2018] },
  "Chevrolet":  { "Avalanche":    [2002, 2012],
                  "Camaro":       [2010, 2018],
                  "Colorado":     [2015, 2026],
                  "Corvette":     [2014, 2018],
                  "Cruze":        [2013, 2018],
                  "Equinox":      [2009, 2018],
                  "Impala":       [2014, 2018],
                  "Malibu":       [2013, 2018],
                  "Silverado":    [1999, 2026],
                  "Silverado HD": [1999, 2026],
                  "Suburban":     [2007, 2018],
                  "Tahoe":        [2007, 2018],
                  "Traverse":     [2014, 2018],
                  "Volt":         [2013, 2018] },
  "Ford":       { "Bronco":       [2020, 2026],
                  "Edge":         [2008, 2023],
                  "Escape":       [2011, 2020],
                  "Expedition":   [2011, 2026],
                  "Explorer":     [2008, 2021],
                  "F-150":        [2004, 2026],
                  "Flex":         [2011, 2019],
                  "Focus":        [2011, 2018],
                  "Fusion":       [2011, 2021],
                  "Maverick":     [2022, 2024],
                  "Mustang":      [2011, 2021],
                  "Ranger":       [2008, 2026],
                  "Super Duty":   [1999, 2026] },
  "Honda":      { "Civic":        [2012, 2013],
                  "Odyssey":      [1999, 2017] },
  "Jeep":       { "Wrangler":     [2007, 2018] },
  "Ram":        { "1500":         [2003, 2026],
                  "HD":           [2003, 2026] },
  "Toyota":     { "Camry":        [2012, 2019],
                  "Corolla":      [2012, 2017],
                  "RAV4":         [2014, 2019],
                  "Tacoma":       [2005, 2026],
                  "Tundra":       [2007, 2026] },
};

// ---------------- SYSTEM PROMPT (must be declared before handler) ----------------
const SYSTEM_PROMPT = `
You are the AI search engine for Camera Source — a specialty retailer of backup cameras,
dash cameras, and vehicle camera systems for trucks, SUVs, and vans.

Your ONLY job is to parse a customer's plain-English query and return a single strict JSON object.

═══════════════════════════════════════════
OUTPUT FORMAT (return NOTHING else):
{"make":"","model":"","year":"","context":"IN"|"OUT"}

• All fields are strings. Null/unknown fields → empty string "".
• context "IN"  = vehicle + intent exist in the Camera Source catalog below.
• context "OUT" = vehicle not in catalog, year out of range, intent unclear, or low confidence.
═══════════════════════════════════════════

━━━━━━━━━━━━━━━━━━━━━━
VEHICLE CATALOG (source of truth)
━━━━━━━━━━━━━━━━━━━━━━
ONLY the vehicles below are supported. Any make/model not listed → context = "OUT".
Year must fall within the listed range (inclusive). Missing year is acceptable.

Make        | Model          | Years
------------|----------------|----------
Audi        | A3             | 2015–2020
Buick       | Enclave        | 2014–2018
Buick       | Encore         | 2014–2018
Buick       | Regal          | 2013–2018
Buick       | Verano         | 2013–2015
Cadillac    | ATS            | 2014–2018
Cadillac    | CTS            | 2014–2018
Cadillac    | ELR            | 2014–2014
Cadillac    | Escalade       | 2014–2018
Cadillac    | SRX            | 2014–2018
Cadillac    | XTS            | 2014–2018
Chevrolet   | Avalanche      | 2002–2012
Chevrolet   | Camaro         | 2010–2018
Chevrolet   | Colorado       | 2015–2026
Chevrolet   | Corvette       | 2014–2018
Chevrolet   | Cruze          | 2013–2018
Chevrolet   | Equinox        | 2009–2018
Chevrolet   | Impala         | 2014–2018
Chevrolet   | Malibu         | 2013–2018
Chevrolet   | Silverado      | 1999–2026
Chevrolet   | Silverado HD   | 1999–2026
Chevrolet   | Suburban       | 2007–2018
Chevrolet   | Tahoe          | 2007–2018
Chevrolet   | Traverse       | 2014–2018
Chevrolet   | Volt           | 2013–2018
Ford        | Bronco         | 2020–2026
Ford        | Edge           | 2008–2023
Ford        | Escape         | 2011–2020
Ford        | Expedition     | 2011–2026
Ford        | Explorer       | 2008–2021
Ford        | F-150          | 2004–2026
Ford        | Flex           | 2011–2019
Ford        | Focus          | 2011–2018
Ford        | Fusion         | 2011–2021
Ford        | Maverick       | 2022–2024
Ford        | Mustang        | 2011–2021
Ford        | Ranger         | 2008–2026
Ford        | Super Duty     | 1999–2026
Honda       | Civic          | 2012–2013
Honda       | Odyssey        | 1999–2017
Jeep        | Wrangler       | 2007–2018
Ram         | 1500           | 2003–2026
Ram         | HD             | 2003–2026
Toyota      | Camry          | 2012–2019
Toyota      | Corolla        | 2012–2017
Toyota      | RAV4           | 2014–2019
Toyota      | Tacoma         | 2005–2026
Toyota      | Tundra         | 2007–2026

━━━━━━━━━━━━━━━━━━━━━━
MAKE NORMALIZATION
━━━━━━━━━━━━━━━━━━━━━━
Map typos/variations to the canonical make. If not mappable → make = "".

Audi      : audi, auddi, audy, adi
Buick     : buick, buik, buickk, buic
Cadillac  : cadillac, cadilac, cadillak, cadilak, caddilac, caddy
Chevrolet : chev, chevy, chevro, cheverlet, chevyet, chevorlet, chevrolett, chevrlet
Ford      : ford, foord, fard, fordd
Honda     : honda, hnda, hondda, hoda
Jeep      : jeep, jep, jeeep, jeap
Ram       : ram, ramm, raam, dodge ram
Toyota    : toyota, toyta, toyyota, toiyota, toyotaa

━━━━━━━━━━━━━━━━━━━━━━
MODEL NORMALIZATION
━━━━━━━━━━━━━━━━━━━━━━
The model MUST belong to the identified make (see catalog above).

AUDI        : a3, a-3, a 3 → A3
BUICK       : enclave/enclav/enclve → Enclave | encore/encor → Encore
              regal/regall → Regal | verano/verno/veranno → Verano
CADILLAC    : ats/a t s → ATS | cts/c t s → CTS | elr → ELR
              escalade/escalad/escalede → Escalade | srx/s r x → SRX | xts/x t s → XTS
CHEVROLET   : avalanche/avalanch → Avalanche | camaro/camero/camarro → Camaro
              colorado/colorodo/colarado → Colorado | corvette/corvet → Corvette
              cruze/cruz → Cruze | equinox/equniox → Equinox | impala/impalla → Impala
              malibu/malbu → Malibu | silverado/silveredo/silverdao → Silverado
              silverado hd/silveradohd/silverado heavy duty → Silverado HD
              suburban/suburbun → Suburban | tahoe/taho → Tahoe
              traverse/travers/travarse → Traverse | volt/voltt → Volt
FORD        : f-150/f150/f 150/f-15o → F-150
              f-250/f250/f-350/f350 → Super Duty (F-250/F-350 map to Super Duty)
              super duty/superduty → Super Duty | bronco/bronko → Bronco
              edge/edgee → Edge | escape/escpe/esacpe → Escape
              expedition/expidition → Expedition | explorer/exploror → Explorer
              flex/flexx → Flex | focus/focuss → Focus | fusion/fussion → Fusion
              maverick/maverik → Maverick | mustang/mustng → Mustang
              ranger/rangar → Ranger
HONDA       : civic/civc → Civic | odyssey/oddysey/odessy → Odyssey
JEEP        : wrangler/wranglr/wrengler → Wrangler
RAM         : 1500/fifteen hundred → 1500 | hd/h d/heavy duty → HD
              ram hd/ram heavy → HD | 2500/3500 → HD
TOYOTA      : camry/camary/camryy → Camry | corolla/corola → Corolla
              rav4/rav 4/rav-4/r4v → RAV4 | tacoma/tacma/tacooma → Tacoma
              tundra/tundera/tundraa → Tundra

━━━━━━━━━━━━━━━━━━━━━━
CAMERA SOURCE PRODUCT INTENT
━━━━━━━━━━━━━━━━━━━━━━
At least ONE of these must be present in the query for context = "IN":

backup camera, rear camera, reverse camera, back up camera, back-up camera
dash cam, dashcam, dash camera, front camera, windshield camera
side camera, blind spot camera
tailgate camera, tail gate camera, tailgate cam, tailgate
bed camera, truck bed camera, cargo camera
mirror camera, rearview mirror camera, mirror monitor, mirror
360 camera, surround view, 360 view, bird's eye
parking sensor, park sensor, proximity sensor, reverse sensor
monitor, display, backup monitor
wiring harness, harness, wire kit, wiring kit, cable kit
LVDS, lvds cable, lvds harness
mount, bracket, camera mount, camera bracket
OEM replacement, factory replacement, OEM camera
plug and play, plug n play
camera, cam, backup, reverse

If NO product intent is found → context = "OUT".

━━━━━━━━━━━━━━━━━━━━━━
CONTEXT RULES
━━━━━━━━━━━━━━━━━━━━━━
context = "IN" ONLY WHEN ALL of the following are true:
  1. make is in the Vehicle Catalog above
  2. model belongs to that make in the catalog
  3. year is within the model's year range OR year is empty (acceptable)
  4. at least one product intent keyword is present

context = "OUT" WHEN ANY of the following:
  • make not in catalog (e.g. GMC, Dodge, Nissan, Lincoln, Subaru are NOT supported)
  • model not in catalog for that make
  • year provided but outside the model's year range
  • no product intent found
  • query is vague, non-vehicle, or confidence is low

━━━━━━━━━━━━━━━━━━━━━━
PROCESSING ORDER
━━━━━━━━━━━━━━━━━━━━━━
1. Lowercase and strip punctuation.
2. Extract year (4-digit, 1990–present).
3. Normalise make → check catalog.
4. Normalise model → verify it belongs to the make in catalog.
5. Check year range for that make+model.
6. Extract product intent.
7. Apply context rule → return JSON only.

EXAMPLES
Query: "backup camera for my 2015 Chevrolet Silverado"
→ {"make":"Chevrolet","model":"Silverado","year":"2015","context":"IN"}

Query: "does my 2019 Ford F150 have a reverse camera?"
→ {"make":"Ford","model":"F-150","year":"2019","context":"IN"}

Query: "tailgate cam for chevy silverado"
→ {"make":"Chevrolet","model":"Silverado","year":"","context":"IN"}

Query: "backup camera for 2022 GMC Sierra"
→ {"make":"GMC","model":"Sierra","year":"2022","context":"OUT"}  ← GMC not in catalog

Query: "best camera for camping"
→ {"make":"","model":"","year":"","context":"OUT"}

Query: "2025 Toyota Camry backup camera"
→ {"make":"Toyota","model":"Camry","year":"2025","context":"OUT"}  ← 2025 outside Camry's 2012–2019 range
`;

// ---------------- NORMALIZATION MAPS (trimmed to DATASET makes/models only) ----------------

const MAKE_MAP = {
  // Audi
  "audi": "Audi", "auddi": "Audi", "audy": "Audi", "adi": "Audi",
  // Buick
  "buick": "Buick", "buik": "Buick", "buickk": "Buick", "buic": "Buick",
  // Cadillac
  "cadillac": "Cadillac", "cadilac": "Cadillac", "cadillak": "Cadillac",
  "cadilak": "Cadillac", "caddilac": "Cadillac", "caddy": "Cadillac",
  // Chevrolet (never "GM")
  "chevrolet": "Chevrolet", "chev": "Chevrolet", "chevy": "Chevrolet",
  "chevro": "Chevrolet", "cheverlet": "Chevrolet", "chevyet": "Chevrolet",
  "chevorlet": "Chevrolet", "chevrolett": "Chevrolet", "chevrlet": "Chevrolet",
  // Ford
  "ford": "Ford", "foord": "Ford", "fard": "Ford", "fordd": "Ford",
  // Honda
  "honda": "Honda", "hnda": "Honda", "hondda": "Honda", "hoda": "Honda",
  // Jeep
  "jeep": "Jeep", "jep": "Jeep", "jeeep": "Jeep", "jeap": "Jeep",
  // Ram (Dodge Ram resolves to Ram)
  "ram": "Ram", "ramm": "Ram", "raam": "Ram", "dodge ram": "Ram",
  // Toyota
  "toyota": "Toyota", "toyta": "Toyota", "toyyota": "Toyota",
  "toiyota": "Toyota", "toyotaa": "Toyota",
};

const MODEL_MAP = {
  // AUDI
  "a3": "A3", "a-3": "A3", "a 3": "A3",
  // BUICK
  "enclave": "Enclave", "enclav": "Enclave", "enclve": "Enclave",
  "encore": "Encore", "encor": "Encore", "encoore": "Encore",
  "regal": "Regal", "regall": "Regal",
  "verano": "Verano", "verno": "Verano", "veranno": "Verano",
  // CADILLAC
  "ats": "ATS", "a t s": "ATS",
  "cts": "CTS", "c t s": "CTS",
  "elr": "ELR",
  "escalade": "Escalade", "escalad": "Escalade", "escalede": "Escalade", "escaladde": "Escalade",
  "srx": "SRX", "s r x": "SRX",
  "xts": "XTS", "x t s": "XTS",
  // CHEVROLET
  "avalanche": "Avalanche", "avalanch": "Avalanche", "avalance": "Avalanche",
  "camaro": "Camaro", "camero": "Camaro", "camarro": "Camaro",
  "colorado": "Colorado", "colorodo": "Colorado", "colarado": "Colorado",
  "corvette": "Corvette", "corvet": "Corvette", "corvett": "Corvette",
  "cruze": "Cruze", "cruz": "Cruze", "cruzee": "Cruze",
  "equinox": "Equinox", "equniox": "Equinox", "equinoxx": "Equinox",
  "impala": "Impala", "impalla": "Impala", "inpala": "Impala",
  "malibu": "Malibu", "malbu": "Malibu", "malibuu": "Malibu",
  "silverado": "Silverado", "silveredo": "Silverado", "silverdao": "Silverado", "silvrado": "Silverado",
  "silverado hd": "Silverado HD", "silveradohd": "Silverado HD", "silverado heavy duty": "Silverado HD",
  "suburban": "Suburban", "suburbun": "Suburban", "suberban": "Suburban",
  "tahoe": "Tahoe", "taho": "Tahoe", "tahoee": "Tahoe",
  "traverse": "Traverse", "travers": "Traverse", "travarse": "Traverse",
  "volt": "Volt", "voltt": "Volt", "voolt": "Volt",
  // FORD
  "f-150": "F-150", "f150": "F-150", "f 150": "F-150", "f-15o": "F-150",
  "super duty": "Super Duty", "superduty": "Super Duty", "super dutyy": "Super Duty",
  "f-250": "Super Duty", "f250": "Super Duty", "f-350": "Super Duty", "f350": "Super Duty",
  "bronco": "Bronco", "bronko": "Bronco", "broncco": "Bronco",
  "edge": "Edge", "edg": "Edge", "edgee": "Edge",
  "escape": "Escape", "escpe": "Escape", "esacpe": "Escape",
  "expedition": "Expedition", "expidition": "Expedition", "expedtion": "Expedition",
  "explorer": "Explorer", "exploror": "Explorer", "explorrer": "Explorer",
  "flex": "Flex", "flexx": "Flex", "flecks": "Flex",
  "focus": "Focus", "focuss": "Focus", "foccus": "Focus",
  "fusion": "Fusion", "fussion": "Fusion", "fuson": "Fusion",
  "maverick": "Maverick", "maverik": "Maverick", "maveric": "Maverick",
  "mustang": "Mustang", "mustng": "Mustang", "mustan": "Mustang",
  "ranger": "Ranger", "rangar": "Ranger", "renger": "Ranger",
  // HONDA
  "civic": "Civic", "civc": "Civic", "civicc": "Civic",
  "odyssey": "Odyssey", "oddysey": "Odyssey", "odessy": "Odyssey",
  // JEEP
  "wrangler": "Wrangler", "wranglr": "Wrangler", "wrengler": "Wrangler",
  // RAM
  "1500": "1500", "fifteen hundred": "1500",
  "hd": "HD", "h d": "HD", "heavy duty": "HD",
  "ram hd": "HD", "2500": "HD", "3500": "HD",
  // TOYOTA
  "camry": "Camry", "camary": "Camry", "camryy": "Camry",
  "corolla": "Corolla", "corola": "Corolla", "corrolla": "Corolla",
  "rav4": "RAV4", "rav 4": "RAV4", "rav-4": "RAV4", "r4v": "RAV4",
  "tacoma": "Tacoma", "tacma": "Tacoma", "tacooma": "Tacoma",
  "tundra": "Tundra", "tundera": "Tundra", "tundraa": "Tundra",
};

const KEYWORDS = {
  // Backup / rear camera
  "backup camera":       "backup camera",
  "back up camera":      "backup camera",
  "back-up camera":      "backup camera",
  "rear camera":         "backup camera",
  "reverse camera":      "backup camera",
  "reversing camera":    "backup camera",
  "rearview camera":     "backup camera",
  // Dash cam
  "dash cam":            "dash camera",
  "dashcam":             "dash camera",
  "dash camera":         "dash camera",
  "front camera":        "dash camera",
  "windshield camera":   "dash camera",
  // Tailgate / cargo
  "tailgate camera":     "tailgate camera",
  "tailgate cam":        "tailgate camera",
  "tailgate":            "tailgate camera",
  "tail gate":           "tailgate camera",
  "cargo camera":        "cargo camera",
  "bed camera":          "cargo camera",
  "truck bed camera":    "cargo camera",
  "cargo area":          "cargo camera",
  // Side / blind spot
  "side camera":         "side camera",
  "blind spot":          "side camera",
  "flank camera":        "side camera",
  // Mirror cam
  "mirror camera":       "mirror camera",
  "mirror cam":          "mirror camera",
  "rearview mirror":     "mirror camera",
  "mirror monitor":      "mirror camera",
  "mirror":              "mirror camera",
  // 360 / surround
  "360":                 "360 system",
  "surround view":       "360 system",
  "bird's eye":          "360 system",
  "360 view":            "360 system",
  "surround":            "360 system",
  // Monitor / display
  "monitor":             "monitor",
  "display":             "monitor",
  "screen":              "monitor",
  "backup monitor":      "monitor",
  // Parking sensors
  "parking sensor":      "parking sensor",
  "park sensor":         "parking sensor",
  "proximity sensor":    "parking sensor",
  "reverse sensor":      "parking sensor",
  // Wiring / harness
  "wiring harness":      "wiring harness",
  "wire harness":        "wiring harness",
  "wiring kit":          "wiring harness",
  "wire kit":            "wiring harness",
  "cable kit":           "wiring harness",
  "harness":             "wiring harness",
  // LVDS
  "lvds":                "LVDS",
  "lvds cable":          "LVDS",
  "lvds harness":        "LVDS",
  // Mount / bracket
  "mount":               "mount",
  "bracket":             "mount",
  "camera mount":        "mount",
  "camera bracket":      "mount",
  // OEM / plug-and-play
  "oem replacement":     "OEM replacement",
  "factory replacement": "OEM replacement",
  "oem camera":          "OEM replacement",
  "oem":                 "OEM replacement",
  "plug and play":       "plug and play",
  "plug n play":         "plug and play",
  "universal":           "universal",
  "universal fit":       "universal",
  // Product action verbs
  "relocate":            "relocation",
  "reposition":          "relocation",
  "move":                "relocation",
  "install":             "installation",
  "replace":             "replacement",
  "replacement":         "replacement",
  // Accessory
  "trailer":             "trailer",
  "towing":              "towing",
  "license plate":       "license plate",
  "topper":              "topper",
  "camper":              "camper",
  "adjustable":          "adjustable",
  "fixed":               "fixed",
};

// ---------------- FUZZY MATCH ----------------
function fuzzyMatch(input, map) {
  input = input.toLowerCase();
  let best = "";
  let score = 0;

  for (let key in map) {
    const similarity = stringSimilarity(input, key);
    if (similarity > score) {
      score = similarity;
      best = map[key];
    }
  }

  return score > 0.6 ? best : "";
}

function stringSimilarity(a, b) {
  let matches = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) matches++;
  }
  return matches / Math.max(a.length, b.length);
}

// ---------------- FALLBACK PARSER ----------------
function fallbackParse(sentence) {
  const text = sentence.toLowerCase();

  let yearMatch = text.match(/\b(19|20)\d{2}\b/);
  let year = yearMatch ? yearMatch[0] : "";

  let make = "";
  let model = "";
  let keywords = [];

  for (let key in MAKE_MAP) {
    if (text.includes(key)) { make = MAKE_MAP[key]; break; }
  }
  if (!make) make = fuzzyMatch(text, MAKE_MAP);

  for (let key in MODEL_MAP) {
    if (text.includes(key)) { model = MODEL_MAP[key]; break; }
  }
  if (!model) model = fuzzyMatch(text, MODEL_MAP);

  if (model === "Sierra"    && text.match(/\b1500\b/)) model = "Sierra 1500";
  if (model === "Silverado" && text.match(/\b1500\b/)) model = "Silverado 1500";

  for (let key in KEYWORDS) {
    if (text.includes(key)) keywords.push(KEYWORDS[key]);
  }

  return { year, make, model, keywords: [...new Set(keywords)] };
}

// ---------------- NORMALIZE AI RESPONSE SHAPE ----------------
// New prompt returns {make, model, year, context} — no keywords.
// Keywords are extracted separately by the fallback parser when needed.
function normalizeFields(raw) {
  return {
    make:     typeof raw.make    === "string" ? raw.make.trim()    : "",
    model:    typeof raw.model   === "string" ? raw.model.trim()   : "",
    year:     typeof raw.year    === "string" ? raw.year.trim()    : (raw.year ? String(raw.year) : ""),
    context:  raw.context === "IN" ? "IN" : "OUT",
    keywords: []   // populated by fallback parser or future catalog matching
  };
}

// ---------------- GET CLIENT IP ----------------
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// ---------------- MAIN HANDLER ----------------
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  // ---------------- RATE LIMITING ----------------
  if (ratelimit) {
    const ip = getClientIp(req);
    const { success, limit, remaining, reset } = await ratelimit.limit(ip);

    res.setHeader('X-RateLimit-Limit',     limit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset',     reset);

    if (!success) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment and try again.',
        retryAfter: Math.ceil((reset - Date.now()) / 1000)
      });
    }
  }

  try {
    const { sentence } = req.body || {};

    if (!sentence)             return res.status(400).json({ error: 'Missing sentence' });
    if (sentence.length > 300) return res.status(400).json({ error: 'Query too long (max 300 characters)' });

    let fields;
    let usedFallback = false;

    // ---------------- AI PARSING ----------------
    try {
      const ai = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + process.env.OPENAI_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user',   content: sentence }
          ]
        })
      }).then(r => r.json());

      fields = normalizeFields(JSON.parse(ai.choices[0].message.content));

      // If AI returned OUT context, also run fallback parser to get keywords
      // for a richer Shopify search query even on unsupported vehicles
      if (fields.context === "OUT") {
        const fallback = fallbackParse(sentence);
        fields.keywords = fallback.keywords;
        if (!fields.make)  fields.make  = fallback.make;
        if (!fields.model) fields.model = fallback.model;
        if (!fields.year)  fields.year  = fallback.year;
      }

    } catch (e) {
      console.error("AI parsing failed, using fallback parser:", e?.message || e);
      fields = fallbackParse(sentence);
      fields.context = "OUT";
      usedFallback = true;
    }

    // ---------------- POST-NORMALIZE ----------------
    if (usedFallback) {
      fields.make  = MAKE_MAP[fields.make?.toLowerCase()]  || fields.make;
      fields.model = MODEL_MAP[fields.model?.toLowerCase()] || fields.model;
    }

    // ---------------- SERVER-SIDE DATASET VALIDATION ----------------
    // Second line of defence: even if AI returns "IN", reject if make/model/year
    // don't exist in DATASET. Prevents hallucinated catalog matches reaching the frontend.
    if (fields.context === "IN" && fields.make && fields.model) {
      const makeEntry  = DATASET[fields.make];
      const modelEntry = makeEntry ? makeEntry[fields.model] : null;
      if (!makeEntry || !modelEntry) {
        fields.context = "OUT";
      } else if (fields.year) {
        const yr = parseInt(fields.year, 10);
        const [start, end] = modelEntry;
        if (yr < start || yr > end) fields.context = "OUT";
      }
    }

    // ---------------- BUILD SEARCH STRING ----------------
    const searchQuery = [
      fields.year,
      fields.make,
      fields.model,
      ...(fields.keywords || [])
    ].filter(Boolean).join(" ");

    // ---------------- SHOPIFY STOREFRONT API ----------------
    // Pending: restore once Shopify store access is available.
    // Steps:
    //   1. Query products via Storefront API using `searchQuery`
    //   2. Map results to { id, title, price, image, url }
    //   3. Set `products` below and remove the placeholder
    const products = [];

    // context "OUT" = vehicle not in catalog or query unclear → trigger fallback UI
    const isFallback = fields.context === "OUT" || usedFallback || products.length === 0;
    const fallbackUrl = `/search?q=${encodeURIComponent(searchQuery)}`;

    return res.status(200).json({
      fields,
      searchQuery,
      products,
      isFallback,
      fallbackUrl
    });

  } catch (err) {
    console.error("Unhandled error in AI search handler:", err);
    return res.status(500).json({ error: 'Server error', detail: String(err) });
  }
}
