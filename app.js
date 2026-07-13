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
You convert a customer's plain-English sentence into structured vehicle search JSON.

Return ONLY valid JSON:
{"year":"","make":"","model":"","keywords":[]}

CRITICAL MAKE NORMALIZATION:
- GMC, Chevrolet, Chevy, GM → GM
- RAM, Ram, Dodge Ram → RAM
- Ford → Ford
- Toyota → Toyota

Other makes:
Jeep, Dodge, Chrysler, Honda, Subaru, Audi, Buick, Mazda, Mercedes

MODEL RULES:
- F150 / F-150 → F-150
- F-250 / F-350 / Super Duty → Super Duty
- Combine: Sierra 1500, Silverado 1500

MODELS:
Sierra, Silverado, 1500, 2500, 3500, F-150, Super Duty, Ranger, Colorado, Canyon, Tacoma, Tundra

KEYWORDS:
relocation, tailgate, cargo, mirror, 360, surround, LVDS, adjustable, fixed, plug and play, universal, camper, factory, OEM, replacement, trailer, license plate, topper

Example:
"I removed my tailgate on my 2024 GMC Sierra 1500"
→ {"year":"2024","make":"GM","model":"Sierra 1500","keywords":["tailgate","relocation"]}
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
function normalizeFields(raw) {
  return {
    year:     typeof raw.year  === "string" ? raw.year.trim()  : "",
    make:     typeof raw.make  === "string" ? raw.make.trim()  : "",
    model:    typeof raw.model === "string" ? raw.model.trim() : "",
    keywords: Array.isArray(raw.keywords)   ? raw.keywords     : []
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

    } catch (e) {
      console.error("AI parsing failed, using fallback parser:", e?.message || e);
      fields = fallbackParse(sentence);
      usedFallback = true;
    }

    // ---------------- POST-NORMALIZE ----------------
    fields.make  = MAKE_MAP[fields.make?.toLowerCase()]  || fields.make;
    fields.model = MODEL_MAP[fields.model?.toLowerCase()] || fields.model;

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

    const isFallback = usedFallback || products.length === 0;
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
