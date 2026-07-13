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

// ---------------- SYSTEM PROMPT (must be declared before handler) ----------------
const SYSTEM_PROMPT = `
ROLE: You are an AI vehicle + product intent parser.

GOAL: Convert a customer's plain-English query into structured vehicle data and determine if it matches supported products using strict normalization and dataset + product catalog validation.

OUTPUT (STRICT JSON ONLY):
{"make":"","model":"","year":"","context":"IN"|"OUT"}

RULES:
- No extra text or explanation
- If no vehicle found → {"make":null,"model":null,"year":null,"context":"OUT"}
- If multiple vehicles → return FIRST clear make-model-year in reading order
- If uncertain → return null fields and "OUT"

YEAR:
- Must be 4-digit (1980–current year)
- If invalid/missing → year=null
- Must ALSO fall within dataset range

SOURCE OF TRUTH:
- You will be provided:
  1. Vehicle dataset (make, model, year range)
  2. Supported product catalog (Camera Source)
- Use ONLY dataset values for make/model
- NEVER invent values
- Model MUST belong to selected make

NORMALIZATION:

MAKE:
- audi, auddi, audy, adi → Audi
- buick, buik, buickk, buic → Buick
- cadillac, cadilac, cadillac, cadillak, cadilak, caddilac, caddy → Cadillac
- chev, chevy, chevro, chevrolet, cheverlet, chevyet, chevorlet, chevrolett, chevrlet → Chevrolet
- chrysler, crysler, chryslar, chrisler, chrysler, chryslr → Chrysler
- dodge, dodg, doodge, dogde → Dodge
- ford, foord, fard, fordd → Ford
- gmc, g m c, gmcc, jmc → GMC
- honda, hnda, hondda, hoda → Honda
- jeep, jep, jeeep, jeap → Jeep
- lincoln, lincon, linclon, lincolnn → Lincoln
- ram, ramm, raam → Ram
- scion, scionn, scionn, sion → Scion
- subaru, subru, subaru, subaruu, subruu → Subaru
- toyota, toyta, toyyota, toiyota, toyotaa → Toyota


MODEL:
- a3, a-3, a 3 → A3
- enclave, enclav, enclve → Enclave
- encore, encor, encoore → Encore
- regal, regall, regal → Regal
- verano, verno, veranno → Verano
- ats, a t s, atss → ATS
- cts, c t s, ctss → CTS
- elr, e l r, elrr → ELR
- escalade, escalad, escalede, escaladde → Escalade
- srx, s r x, srxx → SRX
- xts, x t s, xtss → XTS
- avalanche, avalanch, avalance → Avalanche
- cab & chassis, cab and chassis, cab n chassis, cab chassis → Cab & Chassis
- camaro, camero, camarro → Camaro
- colorado, colorodo, colarado → Colorado
- corvette, corvet, corvett → Corvette
- cruze, cruz, cruzee → Cruze
- equinox, equniox, equinoxx → Equinox
- impala, impalla, inpala → Impala
- malibu, malbo, malibuu → Malibu
- silverado, silveredo, silverdao → Silverado
- silverado hd, silveradohd, silverado h d, silverado heavy duty → Silverado HD
- suburban, suburbun, suberban → Suburban
- tahoe, taho, tahoee → Tahoe
- traverse, travers, travarse → Traverse
- volt, voltt, voolt → Volt
- 200, two hundred → 200
- 300, three hundred → 300
- aspen, asspen, aspen → Aspen
- sebring, sebrng, seabring → Sebring
- town and country, town & country, town n country, town country → Town and Country
- avenger, avengar, avenjer → Avenger
- caliber, calibar, caliberr → Caliber
- challenger, chalenger, challanger → Challenger
- charger, chargar, charjer → Charger
- dakota, dakotta, dakoda → Dakota
- durango, durengo, durango → Durango
- grand caravan, grand carvan, grand caravan, grandcaravan → Grand Caravan
- journey, jurney, journy → Journey
- magnum, magnam, magnom → Magnum
- nitro, nitroo, nytro → Nitro
- srt viper, srtviper, srt-viper, viper srt → SRT Viper
- bronco, bronko, broncco → Bronco
- c-max, c max, cmax, c-maxx → C-Max
- edge, edg, edgee → Edge
- escape, escpe, esacpe → Escape
- expedition, expidition, expedtion → Expedition
- explorer, exploror, explorrer → Explorer
- f-150, f150, f 150, f-15o → F-150
- flex, flexx, flecks → Flex
- focus, focuss, foccus → Focus
- fusion, fussion, fuson → Fusion
- maverick, maverik, maveric → Maverick
- mustang, mustng, mustan → Mustang
- ranger, rangar, renger → Ranger
- super duty, superduty, super dutyy → Super Duty
- taurus, tauras, tauruss → Taurus
- canyon, cannyon, canion → Canyon
- sierra, sieraa, sierrra → Sierra
- sierra hd, sierrahd, sierra h d, sierra heavy duty → Sierra HD
- terrain, terrian, terrrain → Terrain
- yukon, yukonn, yukan → Yukon
- civic, civc, civicc → Civic
- odyssey, oddysey, odessy → Odyssey
- cherokee, cheroke, cheroakee → Cherokee
- commander, comandar, commender → Commander
- compass, compas, compasss → Compass
- gladiator, gladiater, gladitor → Gladiator
- grand cherokee, grand cheroke, grand cheroakee → Grand Cherokee
- liberty, liberti, libarty → Liberty
- patriot, patriat, patriott → Patriot
- wrangler, wranglr, wrengler → Wrangler
- mkc, m k c, mkcc → MKC
- mks, m k s, mkss → MKS
- mkt, m k t, mktt → MKT
- mkx, m k x, mkxx → MKX
- mkz, m k z, mkzz → MKZ
- 1500, fifteen hundred → 1500
- hd, h d, hdd → HD
- fr-s, frs, fr s, f-r-s → FR-S
- iq, i q, iqq → iQ
- tc, t c, tcc → tC
- xb, x b, xbb → xB
- brz, b r z, brzz → BRZ
- legacy, legasy, legaci → Legacy
- outback, outbak, outbackk → Outback
- 4runner, 4 runner, four runner, 4runnr → 4Runner
- avalon, avalan, avalonn → Avalon
- camry, camary, camryy → Camry
- corolla, corola, corrolla → Corolla
- highlander, highlender, highlandr → Highlander
- matrix, mattrix, matrx → Matrix
- prius, prius, prious → Prius
- rav4, rav 4, rav-4, r4v → RAV4
- sequoia, sequoiaa, sequioa → Sequoia
- sienna, siena, siennaa → Sienna
- tacoma, tacma, tacooma → Tacoma
- tundra, tundera, tundraa → Tundra
- venza, venzaa, vensa → Venza


PRODUCT INTENT NORMALIZATION:
- camera, backup camera, rear camera → camera
- mirror, side mirror → mirror
- tailgate, tail gate → tailgate
- Ignore unrelated words
- Extract intent only if clearly product-related

FUZZY MATCHING:
- Fix minor typos (chevrlet → Chevrolet, silvarado → Silverado)
- Only apply if high confidence
- If ambiguous → return null fields

PROCESS:
- Ignore punctuation/case
- Extract vehicle (make, model, year)
- Extract product intent
- Normalize → Validate → Output

VALIDATION:

context="IN" ONLY IF:
- make exists in dataset
- model exists for that make
- year is valid AND within dataset range
- vehicle is supported by product catalog for extracted intent

context="OUT" IF:
- no vehicle found OR
- make/model not in dataset OR
- model does not belong to make OR
- year invalid or out of range OR
- vehicle not supported by product catalog OR
- product intent missing/unclear OR
- confidence is low

FINAL:
- OUT must represent: invalid vehicle OR unsupported product OR unclear query
- RETURN ONLY JSON
`;

// ---------------- NORMALIZATION MAPS ----------------

const MAKE_MAP = {
  "gmc":        "GM",
  "chevrolet":  "GM",
  "chevy":      "GM",
  "gm":         "GM",
  "ram":        "RAM",
  "dodge ram":  "RAM",
  "ford":       "Ford",
  "jeep":       "Jeep",
  "dodge":      "Dodge",
  "chrysler":   "Chrysler",
  "honda":      "Honda",
  "subaru":     "Subaru",
  "audi":       "Audi",
  "buick":      "Buick",
  "mazda":      "Mazda",
  "mercedes":   "Mercedes",
  "toyota":     "Toyota"
};

const MODEL_MAP = {
  "sierra":      "Sierra",
  "silverado":   "Silverado",
  "1500":        "1500",
  "2500":        "2500",
  "3500":        "3500",
  "f150":        "F-150",
  "f-150":       "F-150",
  "super duty":  "Super Duty",
  "f-250":       "Super Duty",
  "f-350":       "Super Duty",
  "ranger":      "Ranger",
  "colorado":    "Colorado",
  "canyon":      "Canyon",
  "tacoma":      "Tacoma",
  "tundra":      "Tundra"
};

const KEYWORDS = {
  "relocate":       "relocation",
  "move":           "relocation",
  "reposition":     "relocation",
  "tailgate":       "tailgate",
  "cargo":          "cargo",
  "mirror":         "mirror",
  "360":            "360",
  "surround":       "surround",
  "lvds":           "LVDS",
  "adjustable":     "adjustable",
  "fixed":          "fixed",
  "plug and play":  "plug and play",
  "universal":      "universal",
  "camper":         "camper",
  "factory":        "factory",
  "oem":            "OEM",
  "replacement":    "replacement",
  "trailer":        "trailer",
  "license plate":  "license plate",
  "topper":         "topper"
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
    // Note: new prompt keeps GMC as GMC (not merged to GM).
    // MAKE_MAP still applied for fallback parser results.
    if (usedFallback) {
      fields.make  = MAKE_MAP[fields.make?.toLowerCase()]  || fields.make;
      fields.model = MODEL_MAP[fields.model?.toLowerCase()] || fields.model;
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
