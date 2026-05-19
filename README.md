# CIS Affordability Index

Local website for comparing selected CPI goods or custom baskets against:

- `All groups CPI`
- `Wage Price Index (WPI)`

## Static deployment

The front end now runs as a static site using the bundled `data.js` file, so the main comparison interface can be hosted on GitHub Pages without `server.py`.

## Run locally

Static front end:

```text
Open index.html directly in a browser
```

Python server version:

```powershell
python server.py
```

Then open:

```text
http://127.0.0.1:8000
```

## Main files

- `index.html` for the page structure
- `app.js` for the comparison logic and chart rendering
- `styles.css` for styling
- `data.js` for the bundled CPI dataset used by the static site
- `server.py` for local Python serving and data tooling

## Features

- single-good comparison
- custom basket mode with user weights
- CPI and WPI percentage comparisons
- rebased charts starting at `1`
- separate price-vs-CPI and price-vs-WPI charts

## Data sources

- CPI workbook: `C:\Users\samfo\Downloads\6401018 (1).xlsx`
- WPI workbook: `C:\Users\samfo\Downloads\WPI to 2010.xlsx`
