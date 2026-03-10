# Financial Dashboard
A full-stack web application that generates a single-page financial dashboard for any US-listed company using data sourced directly from SEC EDGAR filings. Enter a stock ticker to view Revenue, Operating Income, & EBITDA alongside calculated year-over-year growth & margins for the last 8 quarters & last 3 fiscal years.

## How It Works
**Backend (Node.js + Express)**
The backend is a REST API with a single endpoint that accepts a stock ticker. It first converts the ticker to a CIK number, which is the SEC's internal company identifier, by querying EDGAR's public company index. It then fetches that company's full XBRL facts file, which contains every financial figure they have ever reported to the SEC. From that data it extracts Revenue, Operating Income, & Depreciation & Amortization by searching for their standard GAAP tag names. It deduplicates entries across filing amendments by keeping the most recently filed version of each period, then returns the last 8 quarters & last 3 fiscal years as JSON.

**Frontend (React + Vite)**
The frontend presents a single input where the user types a ticker & hits Search. It calls the backend API, receives the structured data, & computes derived metrics client-side: EBITDA is calculated as Operating Income plus D&A, year-over-year growth compares each period against the equivalent period one year prior, & margins are computed as a ratio against Revenue. Results are displayed in two side-by-side tables with positive growth highlighted in green & negative in red.

## Project Structure
```
project/
  package.json          #root package.json, runs both servers with one command
  README.md
  backend/
    package.json
    server.js           #express API, EDGAR data fetching and parsing
  frontend/
    index.html
    package.json
    vite.config.js
    src/
      App.jsx           #React app, calculations, & dashboard rendering
      App.css           #styling
      main.jsx          #React entry point
```

## Running the program
### Prerequisites
have Node.js installed; check by running:
```bash
node -v
npm -v
```

if not installed, download it from https://nodejs.org.

### Installation
clone or download project, then install dependencies for all three packages:
```bash
#install root dependencies (concurrently)
npm install

#install backend dependencies
cd backend
npm install

#install frontend dependencies
cd ../frontend
npm install

#return to root
cd ..
```

### Running the App
from the project root, run:
```bash
npm start
```

This starts both servers simultaneously:
- backend API running on http://localhost:8000
- frontend running on http://localhost:3000

a browser window will open automatically at http://localhost:3000.

## Usage

1. the a valid US stock ticker into the search bar (ex. `AAPL`)
2. press **Search** or hit **Enter**
3. the dashboard will display two tables side by side:
   - **Last 8 Quarters** on the left
   - **Last 3 Fiscal Years** on the right

each table shows:
- **Revenue** — total reported revenue in $M
- **Rev YoY** — year-over-year revenue growth
- **Op Income** — operating income in $M
- **OI Margin** — operating income as a percentage of revenue
- **EBITDA** — operating income plus depreciation & amortization in $M
- **EBITDA Mgn** — EBITDA as a percentage of revenue

## Test Examples
- `AAPL` — Apple
- `MSFT` — Microsoft
- `GOOGL` — Google
- `META` — Meta
- `JPM` — JPMorgan
- `COST` — Costco

> note --> some companies use non-standard XBRL tags for revenue, which may result in N/A values for certain fields; inancial companies like banks have a different accounting structure & may display incomplete data

## Known Limitations
- EBITDA will show N/A if a company does not separately report Depreciation & Amortization in their EDGAR filings
- some companies use non-standard XBRL revenue tags not covered by the current fallback list
- financial companies (banks, insurers) use a different accounting structure & may return incomplete results
- Ddta reflects what companies have filed with the SEC & may lag the most recent earnings by a few weeks

---

## Data Source
All data is sourced from the [SEC EDGAR API](https://www.sec.gov/developer), which is free & requires no API key. The only requirement is a valid User-Agent header identifying your application, set in `backend/server.js`.