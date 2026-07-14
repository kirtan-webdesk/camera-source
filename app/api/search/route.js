import { Ratelimit } from '@upstash/ratelimit';
import { Redis }     from '@upstash/redis';

const ALLOW_ORIGIN = '*';

// ---------------- RATE LIMITER ----------------
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

// ---------------- VEHICLE DATASET ----------------
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

// ---------------- SYSTEM PROMPT ----------------
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
AUDI        : a3, a-3, a 3 → A3
BUICK       : enclave/enclav → Enclave | encore/encor → Encore | regal → Regal | verano/verno → Verano
CADILLAC    : ats → ATS | cts → CTS | elr → ELR | escalade/escalad → Escalade | srx → SRX | xts → XTS
CHEVROLET   : avalanche → Avalanche | camaro/camero → Camaro | colorado → Colorado | corvette → Corvette
              cruze/cruz → Cruze | equinox → Equinox | impala → Impala | malibu → Malibu
              silverado → Silverado | silverado hd/silverado heavy duty → Silverado HD
              suburban → Suburban | tahoe → Tahoe | traverse → Traverse | volt → Volt
FORD        : f-150/f150/f 150 → F-150 | f-250/f250/f-350/f350 → Super Duty
              super duty/superduty → Super Duty | bronco → Bronco | edge → Edge | escape → Escape
              expedition → Expedition | explorer → Explorer | flex → Flex | focus → Focus
              fusion → Fusion | maverick → Maverick | mustang → Mustang | ranger → Ranger
HONDA       : civic → Civic | odyssey → Odyssey
JEEP        : wrangler/wranglr → Wrangler
RAM         : 1500/fifteen hundred → 1500 | hd/heavy duty/2500/3500 → HD
TOYOTA      : camry → Camry | corolla → Corolla | rav4/rav 4/rav-4 → RAV4 | tacoma → Tacoma | tundra → Tundra

━━━━━━━━━━━━━━━━━━━━━━
CAMERA SOURCE PRODUCT INTENT
━━━━━━━━━━━━━━━━━━━━━━
At least ONE must be present for context = "IN":
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

━━━━━━━━━━━━━━━━━━━━━━
CONTEXT RULES
━━━━━━━━━━━━━━━━━━━━━━
context = "IN" ONLY WHEN ALL true:
  1. make is in catalog | 2. model belongs to that make | 3. year in range or empty | 4. product intent present

context = "OUT" WHEN ANY:
  • make not in catalog (GMC, Dodge, Nissan, Lincoln, Subaru are NOT supported)
  • model not in catalog for that make | year out of range | no product intent | low confidence

EXAMPLES
"backup camera for my 2015 Chevrolet Silverado" → {"make":"Chevrolet","model":"Silverado","year":"2015","context":"IN"}
"does my 2019 Ford F150 have a reverse camera?"  → {"make":"Ford","model":"F-150","year":"2019","context":"IN"}
"tailgate cam for chevy silverado"               → {"make":"Chevrolet","model":"Silverado","year":"","context":"IN"}
"backup camera for 2022 GMC Sierra"              → {"make":"GMC","model":"Sierra","year":"2022","context":"OUT"}
"best camera for camping"                        → {"make":"","model":"","year":"","context":"OUT"}
"2025 Toyota Camry backup camera"                → {"make":"Toyota","model":"Camry","year":"2025","context":"OUT"}
`;

// ---------------- NORMALIZATION MAPS ----------------
const MAKE_MAP = {
  "audi": "Audi", "auddi": "Audi", "audy": "Audi", "adi": "Audi",
  "buick": "Buick", "buik": "Buick", "buickk": "Buick", "buic": "Buick",
  "cadillac": "Cadillac", "cadilac": "Cadillac", "cadillak": "Cadillac",
  "cadilak": "Cadillac", "caddilac": "Cadillac", "caddy": "Cadillac",
  "chevrolet": "Chevrolet", "chev": "Chevrolet", "chevy": "Chevrolet",
  "chevro": "Chevrolet", "cheverlet": "Chevrolet", "chevyet": "Chevrolet",
  "chevorlet": "Chevrolet", "chevrolett": "Chevrolet", "chevrlet": "Chevrolet",
  "ford": "Ford", "foord": "Ford", "fard": "Ford", "fordd": "Ford",
  "honda": "Honda", "hnda": "Honda", "hondda": "Honda", "hoda": "Honda",
  "jeep": "Jeep", "jep": "Jeep", "jeeep": "Jeep", "jeap": "Jeep",
  "ram": "Ram", "ramm": "Ram", "raam": "Ram", "dodge ram": "Ram",
  "toyota": "Toyota", "toyta": "Toyota", "toyyota": "Toyota",
  "toiyota": "Toyota", "toyotaa": "Toyota",
};

const MODEL_MAP = {
  "a3": "A3", "a-3": "A3", "a 3": "A3",
  "enclave": "Enclave", "enclav": "Enclave", "enclve": "Enclave",
  "encore": "Encore", "encor": "Encore", "encoore": "Encore",
  "regal": "Regal", "regall": "Regal",
  "verano": "Verano", "verno": "Verano", "veranno": "Verano",
  "ats": "ATS", "a t s": "ATS", "cts": "CTS", "c t s": "CTS", "elr": "ELR",
  "escalade": "Escalade", "escalad": "Escalade", "escalede": "Escalade", "escaladde": "Escalade",
  "srx": "SRX", "s r x": "SRX", "xts": "XTS", "x t s": "XTS",
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
  "civic": "Civic", "civc": "Civic", "civicc": "Civic",
  "odyssey": "Odyssey", "oddysey": "Odyssey", "odessy": "Odyssey",
  "wrangler": "Wrangler", "wranglr": "Wrangler", "wrengler": "Wrangler",
  "1500": "1500", "fifteen hundred": "1500",
  "hd": "HD", "h d": "HD", "heavy duty": "HD", "ram hd": "HD", "2500": "HD", "3500": "HD",
  "camry": "Camry", "camary": "Camry", "camryy": "Camry",
  "corolla": "Corolla", "corola": "Corolla", "corrolla": "Corolla",
  "rav4": "RAV4", "rav 4": "RAV4", "rav-4": "RAV4", "r4v": "RAV4",
  "tacoma": "Tacoma", "tacma": "Tacoma", "tacooma": "Tacoma",
  "tundra": "Tundra", "tundera": "Tundra", "tundraa": "Tundra",
};

const KEYWORDS = {
  "backup camera": "backup camera", "back up camera": "backup camera",
  "back-up camera": "backup camera", "rear camera": "backup camera",
  "reverse camera": "backup camera", "reversing camera": "backup camera",
  "dash cam": "dash camera", "dashcam": "dash camera", "dash camera": "dash camera",
  "tailgate camera": "tailgate camera", "tailgate cam": "tailgate camera",
  "tailgate": "tailgate camera", "tail gate": "tailgate camera",
  "cargo camera": "cargo camera", "bed camera": "cargo camera", "truck bed camera": "cargo camera",
  "side camera": "side camera", "blind spot": "side camera",
  "mirror camera": "mirror camera", "mirror cam": "mirror camera", "mirror": "mirror camera",
  "360": "360 system", "surround view": "360 system", "surround": "360 system",
  "monitor": "monitor", "display": "monitor", "backup monitor": "monitor",
  "parking sensor": "parking sensor", "park sensor": "parking sensor", "reverse sensor": "parking sensor",
  "wiring harness": "wiring harness", "wire harness": "wiring harness",
  "wiring kit": "wiring harness", "wire kit": "wiring harness", "harness": "wiring harness",
  "lvds": "LVDS", "lvds cable": "LVDS", "lvds harness": "LVDS",
  "mount": "mount", "bracket": "mount", "camera mount": "mount",
  "oem replacement": "OEM replacement", "factory replacement": "OEM replacement", "oem": "OEM replacement",
  "plug and play": "plug and play", "plug n play": "plug and play",
  "universal": "universal", "relocate": "relocation", "reposition": "relocation",
  "trailer": "trailer", "license plate": "license plate", "topper": "topper",
};

// ---------------- HELPERS ----------------
function stringSimilarity(a, b) {
  let matches = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) matches++;
  }
  return matches / Math.max(a.length, b.length);
}

function fuzzyMatch(input, map) {
  input = input.toLowerCase();
  let best = "", score = 0;
  for (let key in map) {
    const s = stringSimilarity(input, key);
    if (s > score) { score = s; best = map[key]; }
  }
  return score > 0.6 ? best : "";
}

function fallbackParse(sentence) {
  const text = sentence.toLowerCase();
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  let year = yearMatch ? yearMatch[0] : "";
  let make = "", model = "", keywords = [];

  for (let key in MAKE_MAP) {
    if (text.includes(key)) { make = MAKE_MAP[key]; break; }
  }
  if (!make) make = fuzzyMatch(text, MAKE_MAP);

  for (let key in MODEL_MAP) {
    if (text.includes(key)) { model = MODEL_MAP[key]; break; }
  }
  if (!model) model = fuzzyMatch(text, MODEL_MAP);

  for (let key in KEYWORDS) {
    if (text.includes(key)) keywords.push(KEYWORDS[key]);
  }
  return { year, make, model, keywords: [...new Set(keywords)] };
}

function normalizeFields(raw) {
  return {
    make:     typeof raw.make    === "string" ? raw.make.trim()    : "",
    model:    typeof raw.model   === "string" ? raw.model.trim()   : "",
    year:     typeof raw.year    === "string" ? raw.year.trim()    : (raw.year ? String(raw.year) : ""),
    context:  raw.context === "IN" ? "IN" : "OUT",
    keywords: [],
  };
}

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

const corsHeaders = {
  'Access-Control-Allow-Origin':  ALLOW_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ---------------- ROUTE HANDLERS (App Router) ----------------
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request) {
  if (ratelimit) {
    const ip = getClientIp(request);
    const { success, limit, remaining, reset } = await ratelimit.limit(ip);
    if (!success) {
      return Response.json(
        { error: 'Too many requests. Please wait a moment and try again.', retryAfter: Math.ceil((reset - Date.now()) / 1000) },
        { status: 429, headers: { ...corsHeaders, 'X-RateLimit-Limit': String(limit), 'X-RateLimit-Remaining': String(remaining), 'X-RateLimit-Reset': String(reset) } }
      );
    }
  }

  try {
    let body;
    try { body = await request.json(); } catch { body = {}; }

    const { sentence } = body;
    if (!sentence)             return Response.json({ error: 'Missing sentence' },                          { status: 400, headers: corsHeaders });
    if (sentence.length > 300) return Response.json({ error: 'Query too long (max 300 characters)' },      { status: 400, headers: corsHeaders });

    let fields, usedFallback = false;

    try {
      const ai = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + process.env.OPENAI_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user',   content: sentence },
          ],
        }),
      }).then(r => r.json());

      fields = normalizeFields(JSON.parse(ai.choices[0].message.content));

      const fallback = fallbackParse(sentence);
      fields.keywords = fallback.keywords;

      if (fields.context === "OUT") {
        if (!fields.make)  fields.make  = fallback.make;
        if (!fields.model) fields.model = fallback.model;
        if (!fields.year)  fields.year  = fallback.year;
      }
    } catch (e) {
      console.error("AI parsing failed, using fallback:", e?.message || e);
      fields = fallbackParse(sentence);
      fields.context = "OUT";
      usedFallback = true;
    }

    if (usedFallback) {
      fields.make  = MAKE_MAP[fields.make?.toLowerCase()]  || fields.make;
      fields.model = MODEL_MAP[fields.model?.toLowerCase()] || fields.model;
    }

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

    const searchQuery = [fields.year, fields.make, fields.model, ...(fields.keywords || [])]
      .filter(Boolean).join(" ");

    // ---------------- SHOPIFY STOREFRONT API ----------------
    let products = [];
    try {
      const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
      const shopToken  = process.env.SHOPIFY_STOREFRONT_TOKEN;

      if (shopDomain && shopToken && searchQuery) {
        const gql = await fetch(`https://${shopDomain}/api/2024-01/graphql.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': shopToken,
          },
          body: JSON.stringify({
            query: `
              query SearchProducts($q: String!) {
                search(query: $q, first: 10, types: PRODUCT) {
                  edges {
                    node {
                      ... on Product {
                        id
                        title
                        handle
                        featuredImage { url altText }
                        priceRange {
                          minVariantPrice { amount currencyCode }
                        }
                      }
                    }
                  }
                }
              }
            `,
            variables: { q: searchQuery },
          }),
        }).then(r => r.json());

        products = (gql?.data?.search?.edges || []).map(({ node }) => ({
          id:       node.id,
          title:    node.title,
          handle:   node.handle,
          url:      `https://${shopDomain}/products/${node.handle}`,
          image:    node.featuredImage?.url    || '',
          imageAlt: node.featuredImage?.altText || node.title,
          price:    node.priceRange?.minVariantPrice?.amount       || '',
          currency: node.priceRange?.minVariantPrice?.currencyCode || 'CAD',
        }));
      }
    } catch (e) {
      console.error("Shopify search failed:", e?.message || e);
    }

    const isFallback = fields.context === "OUT" || usedFallback || products.length === 0;
    const fallbackUrl = `https://${process.env.SHOPIFY_STORE_DOMAIN}/search?q=${encodeURIComponent(searchQuery)}`;

    return Response.json({ fields, searchQuery, products, isFallback, fallbackUrl }, { headers: corsHeaders });

  } catch (err) {
    console.error("Unhandled error:", err);
    return Response.json({ error: 'Server error', detail: String(err) }, { status: 500, headers: corsHeaders });
  }
}
