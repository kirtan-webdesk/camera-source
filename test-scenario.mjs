// Test: server-side DATASET validation (no API key needed).
// Simulates what happens AFTER the AI returns a result.
// Run: node test-scenario.mjs

const DATASET = {
  "Audi":       { "A3":           [2015, 2020] },
  "Buick":      { "Enclave":      [2014, 2018], "Encore":       [2014, 2018],
                  "Regal":        [2013, 2018], "Verano":       [2013, 2015] },
  "Cadillac":   { "ATS":          [2014, 2018], "CTS":          [2014, 2018],
                  "ELR":          [2014, 2014], "Escalade":     [2014, 2018],
                  "SRX":          [2014, 2018], "XTS":          [2014, 2018] },
  "Chevrolet":  { "Avalanche":    [2002, 2012], "Camaro":       [2010, 2018],
                  "Colorado":     [2015, 2026], "Corvette":     [2014, 2018],
                  "Cruze":        [2013, 2018], "Equinox":      [2009, 2018],
                  "Impala":       [2014, 2018], "Malibu":       [2013, 2018],
                  "Silverado":    [1999, 2026], "Silverado HD": [1999, 2026],
                  "Suburban":     [2007, 2018], "Tahoe":        [2007, 2018],
                  "Traverse":     [2014, 2018], "Volt":         [2013, 2018] },
  "Ford":       { "Bronco":       [2020, 2026], "Edge":         [2008, 2023],
                  "Escape":       [2011, 2020], "Expedition":   [2011, 2026],
                  "Explorer":     [2008, 2021], "F-150":        [2004, 2026],
                  "Flex":         [2011, 2019], "Focus":        [2011, 2018],
                  "Fusion":       [2011, 2021], "Maverick":     [2022, 2024],
                  "Mustang":      [2011, 2021], "Ranger":       [2008, 2026],
                  "Super Duty":   [1999, 2026] },
  "Honda":      { "Civic":        [2012, 2013], "Odyssey":      [1999, 2017] },
  "Jeep":       { "Wrangler":     [2007, 2018] },
  "Ram":        { "1500":         [2003, 2026], "HD":           [2003, 2026] },
  "Toyota":     { "Camry":        [2012, 2019], "Corolla":      [2012, 2017],
                  "RAV4":         [2014, 2019], "Tacoma":       [2005, 2026],
                  "Tundra":       [2007, 2026] },
};

function validate(fields) {
  if (fields.context !== "IN" || !fields.make || !fields.model) return { ...fields };
  const makeEntry  = DATASET[fields.make];
  const modelEntry = makeEntry ? makeEntry[fields.model] : null;
  if (!makeEntry || !modelEntry) {
    return { ...fields, context: "OUT", note: `"${fields.make}" not in catalog` };
  }
  if (fields.year) {
    const yr = parseInt(fields.year, 10);
    const [s, e] = modelEntry;
    if (yr < s || yr > e) {
      return { ...fields, context: "OUT", note: `year ${yr} outside ${s}–${e}` };
    }
  }
  return { ...fields, note: `valid — ${DATASET[fields.make][fields.model].join("–")}` };
}

// Each entry = simulated AI output → what the server does with it
const SCENARIOS = [
  { desc: "✅ Supported vehicle + product intent",
    ai: { make:"Chevrolet", model:"Silverado", year:"2015", context:"IN" } },

  { desc: "✅ No year supplied — still IN (model-only match)",
    ai: { make:"Chevrolet", model:"Silverado", year:"",     context:"IN" } },

  { desc: "✅ Ford F-150 2019",
    ai: { make:"Ford",       model:"F-150",     year:"2019", context:"IN" } },

  { desc: "✅ Ram 1500 2024",
    ai: { make:"Ram",        model:"1500",      year:"2024", context:"IN" } },

  { desc: "❌ GMC Sierra — AI wrongly said IN (make not in catalog)",
    ai: { make:"GMC",        model:"Sierra",    year:"2022", context:"IN" } },

  { desc: "❌ Toyota Camry 2025 — year exceeds 2019 limit",
    ai: { make:"Toyota",     model:"Camry",     year:"2025", context:"IN" } },

  { desc: "❌ Honda Civic 2015 — year exceeds 2013 limit",
    ai: { make:"Honda",      model:"Civic",     year:"2015", context:"IN" } },

  { desc: "❌ No product intent — AI returned OUT, stays OUT",
    ai: { make:"Ford",       model:"F-150",     year:"2019", context:"OUT" } },

  { desc: "❌ Gibberish query",
    ai: { make:"",           model:"",          year:"",     context:"OUT" } },
];

console.log("\n══ Camera Source — Dataset Validation Test ══\n");

for (const s of SCENARIOS) {
  const result = validate(s.ai);
  const pass = result.context === (s.ai.context === "IN"
    ? (result.note?.startsWith("valid") ? "IN" : "OUT")
    : "OUT");
  const tag = result.context === "IN" ? "→ IN " : "→ OUT";
  console.log(`${s.desc}`);
  console.log(`  AI input : ${JSON.stringify(s.ai)}`);
  console.log(`  Server   : ${JSON.stringify(result)}  ${tag}`);
  console.log();
}
