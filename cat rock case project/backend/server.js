const express = require("express")
const cors = require("cors")
const fetch = require("node-fetch")
const path = require("path")

const app = express()

//allow requests from frontend dev server
app.use(cors())

//serve built frontend static files
app.use(express.static(path.join(__dirname, "../frontend/dist")))

//SEC requires User-Agent header identifying app/email
const HEADERS = { "User-Agent": "your-email@example.com" }

//step 1 --> convert a ticker symbol (ex. "AAPL") to a CIK number
//(CIK is SEC's internal identifier for each company)
async function getCik(ticker) {
  const r = await fetch("https://www.sec.gov/files/company_tickers.json", { headers: HEADERS })
  const data = await r.json()

  //response is object with numeric keys, each value has ticker, cik_str, title
  for (const entry of Object.values(data)) {
    if (entry.ticker.toUpperCase() === ticker.toUpperCase()) {
      //CIK must be zero-padded to 10 digits for EDGAR API
      return String(entry.cik_str).padStart(10, "0")
    }
  }
  throw new Error("Ticker not found")
}

//step 2 --> fetch all XBRL company facts for given CIK
//returns every financial data point the company has ever reported to SEC
async function getFacts(cik) {
  const r = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, { headers: HEADERS })
  return r.json()
}

//step 3 --> pull specific metric out of facts blob
//(trying multiple tag names because companies use slightly different XBRL tags)
function extractMetric(facts, tags) {
  const usGaap = facts?.facts?.["us-gaap"] ?? {}

  for (const tag of tags) {
    if (usGaap[tag]) {
      const entries = usGaap[tag]?.units?.USD ?? []

      //only keep quarterly (10-Q) & annual (10-K) filings, ignore 8-K etc.
      const filtered = entries.filter(e => ["10-Q", "10-K"].includes(e.form))

      //deduplicate --> same period can appear in multiple filings (ex. amendments)
      //keep most recently filed version for each unique period
      const seen = {}
      for (const e of filtered) {
        const key = `${e.start}_${e.end}_${e.form}`
        if (!seen[key] || e.filed > seen[key].filed) seen[key] = e
      }

      //sort chronologically by end date
      return Object.values(seen).sort((a, b) => a.end.localeCompare(b.end))
    }
  }

  //if no tags matched, return empty array
  return []
}

//main endpoint --> accepts ticker & returns structured quarterly + annual data
app.get("/api/:ticker", async (req, res) => {
  try {
    const cik = await getCik(req.params.ticker)
    const facts = await getFacts(cik)

    //try multiple revenue tag names for broader company coverage
    const revenue = extractMetric(facts, [
      "RevenueFromContractWithCustomerExcludingAssessedTax",
      "Revenues",
      "SalesRevenueNet"
    ])

    const opIncome = extractMetric(facts, ["OperatingIncomeLoss"])

    //D&A is used to calculate EBITDA = Operating Income + D&A
    const dna = extractMetric(facts, ["DepreciationDepletionAndAmortization"])

    //helper to filter by filing type
    const byForm = (arr, form) => arr.filter(e => e.form === form)

    res.json({
      quarterly: {
        revenue: byForm(revenue, "10-Q").slice(-8),           // last 8 quarters
        operating_income: byForm(opIncome, "10-Q").slice(-8),
        dna: byForm(dna, "10-Q").slice(-8),
      },
      annual: {
        revenue: byForm(revenue, "10-K").slice(-3),           // last 3 fiscal years
        operating_income: byForm(opIncome, "10-K").slice(-3),
        dna: byForm(dna, "10-K").slice(-3),
      }
    })
  } catch (e) {
    res.status(404).json({ error: e.message })
  }
})

//catch-all --> serve index.html for any non-API route (React handles routing)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"))
})

const PORT = process.env.PORT || 8000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
