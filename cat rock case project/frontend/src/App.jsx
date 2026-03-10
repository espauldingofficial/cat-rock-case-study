import { useState } from "react"
import "./App.css"

//base URL for our backend API
const API = "/api"

//format raw dollar value (in units) into readable $XM string
function fmt(val) {
  if (val == null) return "N/A"
  return "$" + (val / 1e6).toFixed(0) + "M"
}

//format decimal ratio as percentage string
function pct(val) {
  if (val == null) return "N/A"
  return (val * 100).toFixed(1) + "%"
}

//calculate year-over-year growth between two values
function calcGrowth(current, prior) {
  if (prior == null || prior === 0) return null
  return (current - prior) / Math.abs(prior)
}

//calculate margin ratio (ex. operating income / revenue)
function calcMargin(numerator, denominator) {
  if (denominator == null || denominator === 0) return null
  return numerator / denominator
}

//transform raw API data into display rows with all calculated fields
//isAnnual controls lookback window --> 1 year back for annual, 4 quarters back for quarterly
function buildRows(data, isAnnual) {
  const { revenue, operating_income, dna } = data
  const lookback = isAnnual ? 1 : 4

  return revenue.map((r, i) => {
    const rev = r.val
    const oi = operating_income[i]?.val ?? null
    const d = dna[i]?.val ?? null

    //EBITDA = Operating Income + Depreciation & Amortization
    const ebitda = oi != null && d != null ? oi + d : null

    //prior period values for YoY growth calculation
    const prevRev = revenue[i - lookback]?.val ?? null
    const prevOi = operating_income[i - lookback]?.val ?? null
    const prevDna = dna[i - lookback]?.val ?? null
    const prevEbitda = prevOi != null && prevDna != null ? prevOi + prevDna : null

    return {
      period: r.end,
      revenue: rev,
      revenueGrowth: calcGrowth(rev, prevRev),
      operatingIncome: oi,
      oiMargin: calcMargin(oi, rev),            //Operating Income / Revenue
      ebitda,
      ebitdaMargin: calcMargin(ebitda, rev),    //EBITDA / Revenue
    }
  })
}

//reusable table component for both quarterly & annual views
function Table({ rows, title }) {
    return (
      <div className="table-panel">
        <h2>{title}</h2>
        <table>
          <thead>
            <tr>
              {["Period", "Revenue", "Rev YoY", "Op Income", "OI Margin", "EBITDA", "EBITDA Mgn"].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.period}</td>
                <td>{fmt(r.revenue)}</td>
                <td className={r.revenueGrowth > 0 ? "positive" : r.revenueGrowth < 0 ? "negative" : ""}>
                  {pct(r.revenueGrowth)}
                </td>
                <td>{fmt(r.operatingIncome)}</td>
                <td>{pct(r.oiMargin)}</td>
                <td>{fmt(r.ebitda)}</td>
                <td>{pct(r.ebitdaMargin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  
  export default function App() {
    const [ticker, setTicker] = useState("")
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
  
    async function fetchData() {
      if (!ticker.trim()) return
      setLoading(true)
      setError(null)
      setData(null)
      try {
        const r = await fetch(`${API}/${ticker.trim()}`)
        if (!r.ok) throw new Error("Ticker not found or data unavailable")
        const json = await r.json()
        setData(json)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
  
    function handleKeyDown(e) {
      if (e.key === "Enter") fetchData()
    }
  
    const quarterlyRows = data ? buildRows(data.quarterly, false) : []
    const annualRows = data ? buildRows(data.annual, true) : []
  
    return (
      <div className="app">
        <h1>Financial Dashboard</h1>
        <div className="search-bar">
          <input
            value={ticker}
            onChange={e => setTicker(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter ticker (ex. AAPL)"
          />
          <button onClick={fetchData}>
            {loading ? "Loading..." : "Search"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        {data && (
          <div className="dashboard">
            <Table rows={quarterlyRows} title="Last 8 Quarters" />
            <Table rows={annualRows} title="Last 3 Fiscal Years" />
          </div>
        )}
      </div>
    )
  }