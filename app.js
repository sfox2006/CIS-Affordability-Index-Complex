const state = {
  dataset: null,
  selectedSeries: null,
  cpiSeries: null,
  sharedPoints: [],
  mode: "single",
  basketRows: [],
  basketRowId: 0,
};

const WPI_START_DATE = "2010-12-01";
const WPI_DATA = [{"date":"2010-12-01","value":101.0},{"date":"2011-03-01","value":101.909},{"date":"2011-06-01","value":102.6224},{"date":"2011-09-01","value":103.4433},{"date":"2011-12-01","value":104.4778},{"date":"2012-03-01","value":105.5226},{"date":"2012-06-01","value":106.4723},{"date":"2012-09-01","value":107.324},{"date":"2012-12-01","value":108.0753},{"date":"2013-03-01","value":108.8318},{"date":"2013-06-01","value":109.4848},{"date":"2013-09-01","value":110.1417},{"date":"2013-12-01","value":110.9127},{"date":"2014-03-01","value":111.8},{"date":"2014-06-01","value":112.359},{"date":"2014-09-01","value":113.0332},{"date":"2014-12-01","value":113.7114},{"date":"2015-03-01","value":114.3936},{"date":"2015-06-01","value":114.9656},{"date":"2015-09-01","value":115.6554},{"date":"2015-12-01","value":116.2337},{"date":"2016-03-01","value":116.8149},{"date":"2016-06-01","value":117.3989},{"date":"2016-09-01","value":117.8685},{"date":"2016-12-01","value":118.4579},{"date":"2017-03-01","value":119.1686},{"date":"2017-06-01","value":119.7645},{"date":"2017-09-01","value":120.3633},{"date":"2017-12-01","value":121.0855},{"date":"2018-03-01","value":121.6909},{"date":"2018-06-01","value":122.421},{"date":"2018-09-01","value":123.1556},{"date":"2018-12-01","value":123.7713},{"date":"2019-03-01","value":124.3902},{"date":"2019-06-01","value":125.1365},{"date":"2019-09-01","value":125.7622},{"date":"2019-12-01","value":126.391},{"date":"2020-03-01","value":127.023},{"date":"2020-06-01","value":127.277},{"date":"2020-09-01","value":127.4043},{"date":"2020-12-01","value":128.0413},{"date":"2021-03-01","value":128.9376},{"date":"2021-06-01","value":129.5823},{"date":"2021-09-01","value":130.2302},{"date":"2021-12-01","value":131.1418},{"date":"2022-03-01","value":132.0598},{"date":"2022-06-01","value":133.1163},{"date":"2022-09-01","value":134.4475},{"date":"2022-12-01","value":135.523},{"date":"2023-03-01","value":136.8783},{"date":"2023-06-01","value":137.9733},{"date":"2023-09-01","value":139.7669},{"date":"2023-12-01","value":141.3044},{"date":"2024-03-01","value":142.2935},{"date":"2024-06-01","value":143.5742},{"date":"2024-09-01","value":144.8663},{"date":"2024-12-01","value":145.8804},{"date":"2025-03-01","value":147.1933},{"date":"2025-06-01","value":148.5181},{"date":"2025-09-01","value":149.7062},{"date":"2025-12-01","value":150.9038}];

const elements = {
  sourceText: document.getElementById("source-text"),
  modeSelect: document.getElementById("mode-select"),
  seriesSelect: document.getElementById("series-search"),
  startSelect: document.getElementById("start-date-search"),
  endSelect: document.getElementById("end-date-search"),
  horizonSelect: document.getElementById("time-horizon-search"),
  selectionMeta: document.getElementById("selection-meta"),
  basketBuilder: document.getElementById("basket-builder"),
  basketRows: document.getElementById("basket-rows"),
  basketSummary: document.getElementById("basket-summary"),
  addBasketRow: document.getElementById("add-basket-row"),
  equalWeights: document.getElementById("equal-weights"),
  primaryStatLabel: document.getElementById("primary-stat-label"),
  selectedChange: document.getElementById("selected-change"),
  cpiChange: document.getElementById("cpi-change"),
  wpiChange: document.getElementById("wpi-change"),
  gapCpiChange: document.getElementById("gap-cpi-change"),
  gapWpiChange: document.getElementById("gap-wpi-change"),
  selectedRange: document.getElementById("selected-range"),
  cpiRange: document.getElementById("cpi-range"),
  wpiRange: document.getElementById("wpi-range"),
  gapCpiRange: document.getElementById("gap-cpi-range"),
  gapWpiRange: document.getElementById("gap-wpi-range"),
  legendSelected: document.getElementById("legend-selected"),
  wpiLegendSelected: document.getElementById("wpi-legend-selected"),
  cpiChartTitle: document.getElementById("cpi-chart-title"),
  cpiChartSubtitle: document.getElementById("cpi-chart-subtitle"),
  wpiChartTitle: document.getElementById("wpi-chart-title"),
  wpiChartSubtitle: document.getElementById("wpi-chart-subtitle"),
  wpiLegend: document.getElementById("wpi-legend"),
  cpiChart: document.getElementById("cpi-chart"),
  wpiChart: document.getElementById("wpi-chart"),
  emptyState: document.getElementById("empty-state"),
};

const HORIZON_OPTIONS = [
  { value: "custom", label: "Custom range" },
  { value: "1y", label: "Last 1 year" },
  { value: "3y", label: "Last 3 years" },
  { value: "5y", label: "Last 5 years" },
  { value: "10y", label: "Last 10 years" },
  { value: "max", label: "Maximum shared history" },
];

function getAvailableSeries() {
  return state.dataset.series.filter((series) => series.seriesId !== state.dataset.overallCpiSeriesId);
}

function formatQuarter(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `Q${quarter} ${date.getUTCFullYear()}`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function setMetricTone(element, value, invert = false) {
  element.classList.remove("metric-positive", "metric-negative", "metric-neutral");
  if (!Number.isFinite(value)) {
    element.classList.add("metric-neutral");
    return;
  }
  if (value === 0) {
    element.classList.add("metric-neutral");
    return;
  }
  const favorable = invert ? value < 0 : value > 0;
  element.classList.add(favorable ? "metric-negative" : "metric-positive");
}

function computePercentChange(startValue, endValue) {
  if (!Number.isFinite(startValue) || !Number.isFinite(endValue) || startValue === 0) {
    return null;
  }
  return ((endValue - startValue) / startValue) * 100;
}

function fillSelect(select, options, formatter = (option) => option.label) {
  select.innerHTML = "";
  options.forEach((option) => {
    const optionEl = document.createElement("option");
    optionEl.value = option.value;
    optionEl.textContent = formatter(option);
    select.appendChild(optionEl);
  });
}

function populateSeriesSelect() {
  const options = getAvailableSeries().map((series) => ({
    value: series.seriesId,
    label: `${series.label} (${series.seriesId})`,
  }));
  fillSelect(elements.seriesSelect, options);
}

function getWpiLookup() {
  return new Map(WPI_DATA.map((point) => [point.date, point.value]));
}

function populateHorizonSelect() {
  fillSelect(elements.horizonSelect, HORIZON_OPTIONS);
}

function populateDateSelects(sharedPoints) {
  const options = sharedPoints.map((point) => ({
    value: point.date,
    label: formatQuarter(point.date),
  }));

  fillSelect(elements.startSelect, options);
  fillSelect(elements.endSelect, options);

  if (options.length) {
    elements.startSelect.value = options[0].value;
    elements.endSelect.value = options[options.length - 1].value;
  }
}

function applyQuickRange() {
  if (!state.sharedPoints.length || elements.horizonSelect.value === "custom") {
    return;
  }

  const endIndex = state.sharedPoints.length - 1;
  const quartersByHorizon = {
    "1y": 4,
    "3y": 12,
    "5y": 20,
    "10y": 40,
    max: state.sharedPoints.length,
  };
  const periods = quartersByHorizon[elements.horizonSelect.value] ?? state.sharedPoints.length;
  const startIndex = Math.max(0, endIndex - periods + 1);

  elements.startSelect.value = state.sharedPoints[startIndex].date;
  elements.endSelect.value = state.sharedPoints[endIndex].date;
}

function updateStatCards(filteredPoints) {
  const firstPoint = filteredPoints[0];
  const lastPoint = filteredPoints[filteredPoints.length - 1];
  const selectedChange = computePercentChange(firstPoint.selectedValue, lastPoint.selectedValue);
  const cpiChange = computePercentChange(firstPoint.cpiValue, lastPoint.cpiValue);
  const wpiAvailable = firstPoint.date >= WPI_START_DATE && Number.isFinite(firstPoint.wpiValue) && Number.isFinite(lastPoint.wpiValue);
  const wpiChange = wpiAvailable ? computePercentChange(firstPoint.wpiValue, lastPoint.wpiValue) : null;
  const gapCpi = Number.isFinite(selectedChange) && Number.isFinite(cpiChange) ? selectedChange - cpiChange : null;
  const gapWpi = wpiAvailable && Number.isFinite(selectedChange) && Number.isFinite(wpiChange) ? selectedChange - wpiChange : null;
  const rangeLabel = `${formatQuarter(firstPoint.date)} to ${formatQuarter(lastPoint.date)}`;

  elements.selectedChange.textContent = formatPercent(selectedChange);
  elements.cpiChange.textContent = formatPercent(cpiChange);
  elements.wpiChange.textContent = wpiAvailable ? formatPercent(wpiChange) : "No data";
  elements.gapCpiChange.textContent = formatPercent(gapCpi);
  elements.gapWpiChange.textContent = wpiAvailable ? formatPercent(gapWpi) : "No data";
  elements.selectedRange.textContent = rangeLabel;
  elements.cpiRange.textContent = rangeLabel;
  elements.wpiRange.textContent = wpiAvailable ? rangeLabel : "No data available before Dec 2010.";
  elements.gapCpiRange.textContent = "Selected good minus CPI over the chosen window.";
  elements.gapWpiRange.textContent = wpiAvailable
    ? "Selected good minus WPI over the chosen window."
    : "WPI is unavailable because the chosen range starts before Dec 2010.";

  setMetricTone(elements.selectedChange, selectedChange, true);
  setMetricTone(elements.cpiChange, cpiChange, true);
  if (wpiAvailable) {
    setMetricTone(elements.wpiChange, wpiChange, true);
  } else {
    elements.wpiChange.classList.remove("metric-positive", "metric-negative", "metric-neutral");
    elements.wpiChange.classList.add("metric-neutral");
  }
  setMetricTone(elements.gapCpiChange, gapCpi, true);
  if (wpiAvailable) {
    setMetricTone(elements.gapWpiChange, gapWpi, true);
  } else {
    elements.gapWpiChange.classList.remove("metric-positive", "metric-negative", "metric-neutral");
    elements.gapWpiChange.classList.add("metric-neutral");
  }

  return { wpiAvailable };
}

function rebasePoints(points, keys) {
  const firstPoint = points[0];
  return points.map((point) => {
    const rebased = { date: point.date };
    keys.forEach((key) => {
      const baseValue = firstPoint[key];
      rebased[key] = Number.isFinite(point[key]) && Number.isFinite(baseValue) && baseValue !== 0
        ? (point[key] / baseValue) * 100
        : null;
    });
    return rebased;
  });
}

function linePath(points, width, height, margin, key, minValue, maxValue) {
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const xStep = points.length > 1 ? plotWidth / (points.length - 1) : 0;
  const range = maxValue - minValue || 1;

  return points
    .map((point, index) => {
      const x = margin.left + xStep * index;
      const y = margin.top + plotHeight - ((point[key] - minValue) / range) * plotHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function renderChart(target, filteredPoints, config) {
  const width = 920;
  const height = 420;
  const margin = { top: 24, right: 26, bottom: 48, left: 68 };
  const values = filteredPoints.flatMap((point) => config.keys.map((key) => point[key]).filter(Number.isFinite));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const yTicks = 5;
  const plotHeight = height - margin.top - margin.bottom;
  const plotWidth = width - margin.left - margin.right;

  const paths = config.keys.map((key) => ({
    key,
    className: config.classNames[key],
    d: linePath(filteredPoints, width, height, margin, key, minValue, maxValue),
  }));

  const gridLines = Array.from({ length: yTicks }, (_, index) => {
    const ratio = index / (yTicks - 1);
    const y = margin.top + plotHeight * ratio;
    const tickValue = maxValue - (maxValue - minValue) * ratio;
    return `
      <line class="grid-line" x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}"></line>
      <text class="axis-label" x="${margin.left - 10}" y="${y + 4}" text-anchor="end">${tickValue.toFixed(1)}</text>
    `;
  }).join("");

  const xTicks = [0, Math.floor((filteredPoints.length - 1) / 2), filteredPoints.length - 1]
    .filter((value, index, array) => array.indexOf(value) === index)
    .map((pointIndex) => {
      const x = margin.left + (filteredPoints.length > 1 ? (plotWidth / (filteredPoints.length - 1)) * pointIndex : plotWidth / 2);
      return `<text class="axis-label" x="${x}" y="${height - 14}" text-anchor="middle">${formatQuarter(filteredPoints[pointIndex].date)}</text>`;
    })
    .join("");

  target.innerHTML = `
    <line class="axis-line" x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}"></line>
    <line class="axis-line" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}"></line>
    ${gridLines}
    ${paths.map((path) => `<path class="series-line ${path.className}" d="${path.d}"></path>`).join("")}
    ${xTicks}
  `;
}

function resetEmptyState(message) {
  elements.cpiChartTitle.textContent = "Waiting for a selection";
  elements.cpiChartSubtitle.textContent = "Both series are rebased to 100 at the selected start date.";
  elements.wpiChartTitle.textContent = "Waiting for a selection";
  elements.wpiChartSubtitle.textContent = "Both series are rebased to 100 at the selected start date. Wage data from Q4 2010 only.";
  elements.cpiChart.innerHTML = "";
  elements.wpiChart.innerHTML = "";
  elements.emptyState.textContent = message;
  elements.selectedChange.textContent = "--";
  elements.cpiChange.textContent = "--";
  elements.wpiChange.textContent = "--";
  elements.gapCpiChange.textContent = "--";
  elements.gapWpiChange.textContent = "--";
  elements.wpiRange.textContent = "Available from Dec 2010 onward.";
  elements.gapCpiRange.textContent = "Selected good minus CPI over the chosen window.";
  elements.gapWpiRange.textContent = "Selected good minus WPI over the chosen window.";
  elements.wpiLegend.classList.add("is-hidden");
  [
    elements.selectedChange,
    elements.cpiChange,
    elements.wpiChange,
    elements.gapCpiChange,
    elements.gapWpiChange,
  ].forEach((element) => {
    element.classList.remove("metric-positive", "metric-negative");
    element.classList.add("metric-neutral");
  });
}

function getSharedRangePoints(series) {
  const cpiLookup = new Map(state.cpiSeries.observations.map((point) => [point.date, point.value]));
  const wpiLookup = getWpiLookup();
  return series.observations
    .filter((point) => cpiLookup.has(point.date))
    .map((point) => ({
      date: point.date,
      selectedValue: point.value,
      cpiValue: cpiLookup.get(point.date),
      wpiValue: wpiLookup.get(point.date),
    }));
}

function getBasketSelections() {
  return state.basketRows
    .map((row) => {
      const series = state.dataset.series.find((item) => item.seriesId === row.seriesId);
      const weight = Number(row.weight);
      if (!series || !Number.isFinite(weight) || weight <= 0) {
        return null;
      }
      return { series, weight };
    })
    .filter(Boolean);
}

function buildBasketSeries() {
  const selections = getBasketSelections();
  if (selections.length < 2) {
    return { points: [], label: "Custom basket", description: "Add at least two goods with positive weights." };
  }

  const totalWeight = selections.reduce((sum, item) => sum + item.weight, 0);
  const normalized = selections.map((item) => ({
    ...item,
    weight: item.weight / totalWeight,
  }));

  const sharedDates = normalized.reduce((dates, item, index) => {
    const itemDates = new Set(item.series.observations.map((point) => point.date));
    if (index === 0) {
      return itemDates;
    }
    return new Set([...dates].filter((date) => itemDates.has(date)));
  }, new Set(state.cpiSeries.observations.map((point) => point.date)));

  const cpiLookup = new Map(state.cpiSeries.observations.map((point) => [point.date, point.value]));
  const wpiLookup = getWpiLookup();
  const seriesLookups = normalized.map((item) => ({
    label: item.series.label,
    weight: item.weight,
    lookup: new Map(item.series.observations.map((point) => [point.date, point.value])),
  }));

  const dates = [...sharedDates].filter((date) => cpiLookup.has(date)).sort();
  const points = dates.map((date) => ({
    date,
    selectedValue: seriesLookups.reduce((sum, item) => sum + item.lookup.get(date) * item.weight, 0),
    cpiValue: cpiLookup.get(date),
    wpiValue: wpiLookup.get(date),
  }));

  return {
    points,
    label: "Custom basket",
    description: `${selections.length} goods combined using your weights (normalized to 100%).`,
  };
}

function updateView() {
  if (!state.sharedPoints.length) {
    return;
  }

  const filteredPoints = state.sharedPoints.filter(
    (point) => point.date >= elements.startSelect.value && point.date <= elements.endSelect.value
  );

  if (filteredPoints.length < 2) {
    resetEmptyState("Choose a wider date range. The current range does not have enough observations.");
    return;
  }

  const rebasedCpiPoints = rebasePoints(filteredPoints, ["selectedValue", "cpiValue"]);
  const wpiAvailable = filteredPoints[0].date >= WPI_START_DATE && filteredPoints.every((point) => Number.isFinite(point.wpiValue));
  const rebasedWpiPoints = wpiAvailable ? rebasePoints(filteredPoints, ["selectedValue", "wpiValue"]) : [];

  elements.emptyState.textContent = "";
  updateStatCards(filteredPoints);
  renderChart(elements.cpiChart, rebasedCpiPoints, {
    keys: ["cpiValue", "selectedValue"],
    classNames: { selectedValue: "selected", cpiValue: "cpi" },
  });

  if (wpiAvailable) {
    renderChart(elements.wpiChart, rebasedWpiPoints, {
      keys: ["wpiValue", "selectedValue"],
      classNames: { selectedValue: "selected", wpiValue: "wpi" },
    });
    elements.wpiLegend.classList.remove("is-hidden");
    elements.wpiChartSubtitle.textContent = "Both series are rebased to 100 at the selected start date. Wage data from Q4 2010 only.";
  } else {
    elements.wpiChart.innerHTML = "";
    elements.wpiLegend.classList.add("is-hidden");
    elements.wpiChartSubtitle.textContent = "No WPI data: wage data is only available from Q4 2010 (Dec 2010) onward. Please adjust your start date.";
  }
}

function renderBasketRows() {
  elements.basketRows.innerHTML = "";
  const usedIds = state.basketRows.map((row) => row.seriesId);

  state.basketRows.forEach((row, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "basket-row";

    // Row number badge
    const numBadge = document.createElement("div");
    numBadge.className = "basket-row-num";
    numBadge.textContent = index + 1;

    const select = document.createElement("select");
    const options = getAvailableSeries().map((series) => ({
      value: series.seriesId,
      label: `${series.label} (${series.seriesId})`,
    }));
    fillSelect(select, options);
    select.value = row.seriesId;
    select.style.cssText = "width:100%;min-height:40px;padding:0 14px;border-radius:8px;border:1.5px solid var(--line);background:var(--surface);font:600 0.88rem Manrope,sans-serif;color:var(--ink);appearance:none;cursor:pointer;";
    select.addEventListener("change", () => {
      row.seriesId = select.value;
      refreshModeView();
    });

    // Weight group
    const weightWrap = document.createElement("div");
    weightWrap.className = "basket-weight";

    const weightInput = document.createElement("input");
    weightInput.type = "number";
    weightInput.min = "0";
    weightInput.step = "0.1";
    weightInput.value = row.weight;
    weightInput.addEventListener("input", () => {
      row.weight = weightInput.value;
      updateWeightBar();
      refreshModeView();
    });

    // Weight fill bar
    const barWrap = document.createElement("div");
    barWrap.className = "basket-weight-bar";
    const barFill = document.createElement("div");
    barFill.className = "basket-weight-fill";
    barWrap.appendChild(barFill);

    function updateWeightBar() {
      const total = state.basketRows.reduce((s, r) => s + Math.max(0, Number(r.weight)), 0);
      const pct = total > 0 ? Math.min(100, (Math.max(0, Number(row.weight)) / total) * 100) : 0;
      barFill.style.width = pct.toFixed(1) + "%";
    }
    updateWeightBar();

    weightWrap.append(weightInput, barWrap);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "danger-button";
    removeButton.textContent = "Remove";
    removeButton.disabled = state.basketRows.length <= 2;
    removeButton.addEventListener("click", () => {
      state.basketRows = state.basketRows.filter((item) => item.id !== row.id);
      refreshModeView();
    });

    if (usedIds.filter((id) => id === row.seriesId).length > 1) {
      wrapper.classList.add("basket-row-warning");
    }

    wrapper.append(numBadge, select, weightWrap, removeButton);
    elements.basketRows.appendChild(wrapper);
  });

  const totalWeight = getBasketSelections().reduce((sum, item) => sum + item.weight, 0);
  const duplicateCount = usedIds.length - new Set(usedIds).size;
  let summary = `Weight total: ${totalWeight.toFixed(1)} — automatically normalised to 100% for the chart.`;
  if (duplicateCount > 0) {
    summary += " ⚠ Duplicate goods detected.";
  }
  elements.basketSummary.textContent = summary;
}

function addBasketRow(seriesId = null, weight = 1) {
  const options = getAvailableSeries();
  const fallback = options[state.basketRows.length % options.length];
  state.basketRows.push({
    id: ++state.basketRowId,
    seriesId: seriesId || fallback.seriesId,
    weight,
  });
}

function applyEqualWeights() {
  if (!state.basketRows.length) {
    return;
  }
  const weight = 100 / state.basketRows.length;
  state.basketRows.forEach((row) => {
    row.weight = weight.toFixed(1);
  });
  refreshModeView();
}

function updateSingleSeriesView() {
  const series = state.dataset.series.find((item) => item.seriesId === elements.seriesSelect.value);
  state.selectedSeries = series;
  state.sharedPoints = getSharedRangePoints(series);
  elements.selectionMeta.textContent = `${series.description} Available from ${formatQuarter(series.start)} to ${formatQuarter(series.end)}.`;
  elements.primaryStatLabel.textContent = "Selected good change";
  elements.legendSelected.textContent = series.label;
  elements.wpiLegendSelected.textContent = series.label;
  populateDateSelects(state.sharedPoints);
  if (elements.horizonSelect.value !== "custom") {
    applyQuickRange();
  }
  elements.cpiChartTitle.textContent = `${series.label} vs CPI`;
  elements.cpiChartSubtitle.textContent = `${series.seriesId} and All groups CPI, both rebased to 100 at the selected start date.`;
  elements.wpiChartTitle.textContent = `${series.label} vs WPI`;
  elements.wpiChartSubtitle.textContent = `${series.seriesId} and All sector WPI, both rebased to 100 at the selected start date. Wage data from Q4 2010 only.`;
  updateView();
}

function updateBasketView() {
  renderBasketRows();
  const basket = buildBasketSeries();
  state.sharedPoints = basket.points;
  elements.primaryStatLabel.textContent = "Custom basket change";
  elements.legendSelected.textContent = basket.label;
  elements.wpiLegendSelected.textContent = basket.label;
  elements.selectionMeta.textContent = basket.description;

  if (!basket.points.length) {
    resetEmptyState("Add at least two goods with positive weights to build a basket.");
    return;
  }

  populateDateSelects(state.sharedPoints);
  if (elements.horizonSelect.value !== "custom") {
    applyQuickRange();
  }
  elements.cpiChartTitle.textContent = `${basket.label} vs CPI`;
  elements.cpiChartSubtitle.textContent = "Custom basket and All groups CPI, both rebased to 100 at the selected start date.";
  elements.wpiChartTitle.textContent = `${basket.label} vs WPI`;
  elements.wpiChartSubtitle.textContent = "Custom basket and All sector WPI, both rebased to 100 at the selected start date. Wage data from Q4 2010 only.";
  updateView();
}

function refreshModeView() {
  const basketMode = state.mode === "basket";
  elements.basketBuilder.classList.toggle("is-hidden", !basketMode);
  elements.seriesSelect.closest(".control-group").classList.toggle("is-hidden", basketMode);

  if (basketMode) {
    updateBasketView();
  } else {
    updateSingleSeriesView();
  }
}

async function init() {
  const dataset = window.CPI_DATA;

  if (!dataset) {
    throw new Error("Bundled CPI dataset is missing.");
  }

  state.dataset = dataset;
  state.cpiSeries = dataset.series.find((series) => series.seriesId === dataset.overallCpiSeriesId);

  populateSeriesSelect();
  populateHorizonSelect();

  elements.sourceText.textContent = `${dataset.source}. ${elements.seriesSelect.options.length} goods and goods-group series available.`;
  elements.horizonSelect.value = "custom";

  const initialSeries =
    dataset.series.find((series) => series.label === "Major household appliances") ||
    dataset.series.find((series) => series.seriesId !== dataset.overallCpiSeriesId);

  elements.seriesSelect.value = initialSeries.seriesId;

  addBasketRow(initialSeries.seriesId, 50);
  addBasketRow(getAvailableSeries().find((series) => series.seriesId !== initialSeries.seriesId)?.seriesId, 50);

  elements.modeSelect.addEventListener("change", () => {
    state.mode = elements.modeSelect.value;
    elements.horizonSelect.value = "custom";
    refreshModeView();
  });

  elements.seriesSelect.addEventListener("change", () => {
    elements.horizonSelect.value = "custom";
    refreshModeView();
  });

  elements.startSelect.addEventListener("change", () => {
    if (elements.startSelect.value > elements.endSelect.value) {
      elements.endSelect.value = elements.startSelect.value;
    }
    elements.horizonSelect.value = "custom";
    updateView();
  });

  elements.endSelect.addEventListener("change", () => {
    if (elements.endSelect.value < elements.startSelect.value) {
      elements.startSelect.value = elements.endSelect.value;
    }
    elements.horizonSelect.value = "custom";
    updateView();
  });

  elements.horizonSelect.addEventListener("change", () => {
    applyQuickRange();
    updateView();
  });

  elements.addBasketRow.addEventListener("click", () => {
    addBasketRow();
    refreshModeView();
  });

  elements.equalWeights.addEventListener("click", applyEqualWeights);

  document.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-info-toggle]");
    if (!toggle) {
      document.querySelectorAll(".info-popover.is-open").forEach((popover) => popover.classList.remove("is-open"));
      return;
    }

    const targetId = toggle.getAttribute("data-info-toggle");
    const popover = document.getElementById(targetId);
    const willOpen = !popover.classList.contains("is-open");
    document.querySelectorAll(".info-popover.is-open").forEach((openPopover) => openPopover.classList.remove("is-open"));
    if (willOpen) {
      popover.classList.add("is-open");
    }
  });

  refreshModeView();
}

init().catch((error) => {
  console.error(error);
  elements.sourceText.textContent = "Unable to load the bundled CPI dataset.";
  elements.selectionMeta.textContent = "The static data bundle could not be loaded.";
  resetEmptyState("The application could not load the workbook data.");
});
