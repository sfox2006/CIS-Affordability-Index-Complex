const groupChartState = {
  selectedIds: new Set(),
};

const GROUP_EXCLUDED_DEFAULTS = new Set(["A2332596F"]);
const GROUP_PALETTE = [
  "#9b1c31",
  "#c24a63",
  "#df7f95",
  "#efb2bf",
  "#263238",
  "#57b565",
  "#2f7f42",
  "#78c579",
  "#4f9a59",
  "#1e7036",
  "#0e6b5c",
  "#0b6ea8",
];

function groupFormatQuarter(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return `Q${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`;
}

function groupFormatPercent(value) {
  if (!Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function groupShortLabel(label, maxLength = 28) {
  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}...` : label;
}

function escapeGroupAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function groupSeries() {
  const data = window.CPI_DATA;
  if (!data) return [];
  return data.series.filter((series) => series.seriesId !== data.overallCpiSeriesId);
}

function groupOverallCpi() {
  return window.CPI_DATA?.series.find((series) => series.seriesId === window.CPI_DATA.overallCpiSeriesId);
}

function groupWpiLookup() {
  return new Map((window.WPI_DATA || []).map((point) => [point.date, point.value]));
}

function pointLookup(series) {
  return new Map(series.observations.map((point) => [point.date, point.value]));
}

function sharedGroupDates(includeAllSelected = false) {
  const wpiDates = new Set((window.WPI_DATA || []).map((point) => point.date));
  const cpiDates = new Set((groupOverallCpi()?.observations || []).map((point) => point.date));
  const selected = includeAllSelected
    ? groupSeries().filter((series) => groupChartState.selectedIds.has(series.seriesId))
    : [];

  return [...wpiDates]
    .filter((date) => cpiDates.has(date))
    .filter((date) => selected.every((series) => pointLookup(series).has(date)))
    .sort();
}

function fillGroupDateSelects() {
  const dates = sharedGroupDates(true);
  const startSelect = document.getElementById("group-start-date");
  const endSelect = document.getElementById("group-end-date");
  if (!startSelect || !endSelect) return;
  const previousStart = startSelect.value;
  const previousEnd = endSelect.value;

  const options = dates.map((date) => `<option value="${date}">${groupFormatQuarter(date)}</option>`).join("");
  startSelect.innerHTML = options;
  endSelect.innerHTML = options;

  if (dates.includes(previousStart)) {
    startSelect.value = previousStart;
  } else if (dates.includes("1997-09-01")) {
    startSelect.value = "1997-09-01";
  } else if (dates.length) {
    startSelect.value = dates[0];
  }

  if (dates.includes(previousEnd)) {
    endSelect.value = previousEnd;
  } else if (dates.length) {
    endSelect.value = dates[dates.length - 1];
  }
}

function createGroupToggles() {
  const target = document.getElementById("group-category-toggles");
  if (!target) return;

  const series = groupSeries();
  groupChartState.selectedIds = new Set(
    series
      .filter((item) => !GROUP_EXCLUDED_DEFAULTS.has(item.seriesId))
      .map((item) => item.seriesId)
  );

  target.innerHTML = series.map((item, index) => `
    <label class="category-toggle">
      <input type="checkbox" value="${item.seriesId}" ${groupChartState.selectedIds.has(item.seriesId) ? "checked" : ""}>
      <span class="category-swatch" style="--category-color:${GROUP_PALETTE[index % GROUP_PALETTE.length]}"></span>
      <span>${item.label}</span>
    </label>
  `).join("");

  target.addEventListener("change", (event) => {
    const input = event.target.closest("input[type='checkbox']");
    if (!input) return;
    if (input.checked) {
      groupChartState.selectedIds.add(input.value);
    } else {
      groupChartState.selectedIds.delete(input.value);
    }
    fillGroupDateSelects();
    renderGroupCharts();
  });
}

function getRangeDates() {
  const start = document.getElementById("group-start-date")?.value;
  const end = document.getElementById("group-end-date")?.value;
  return { start, end };
}

function valueAt(series, date) {
  return pointLookup(series).get(date);
}

function percentChange(startValue, endValue) {
  if (!Number.isFinite(startValue) || !Number.isFinite(endValue) || startValue === 0) return null;
  return ((endValue - startValue) / startValue) * 100;
}

function buildLineSeries(start, end) {
  const selected = groupSeries().filter((series) => groupChartState.selectedIds.has(series.seriesId));
  const cpi = groupOverallCpi();
  const wpiLookup = groupWpiLookup();
  const selectedLookups = selected.map((series) => ({ series, lookup: pointLookup(series) }));
  const cpiLookup = pointLookup(cpi);
  const dates = sharedGroupDates(true).filter((date) => date >= start && date <= end);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  if (!startDate || !endDate) return { dates: [], lines: [] };

  const lines = selectedLookups.map((item, index) => {
    const base = item.lookup.get(startDate);
    return {
      id: item.series.seriesId,
      label: item.series.label,
      color: GROUP_PALETTE[index % GROUP_PALETTE.length],
      values: dates
        .filter((date) => item.lookup.has(date))
        .map((date) => ({
          date,
          value: percentChange(base, item.lookup.get(date)),
        })),
    };
  });

  lines.push({
    id: "cpi",
    label: "Overall inflation (CPI)",
    color: "#2436b7",
    strokeDasharray: "8 8",
    values: dates.map((date) => ({
      date,
      value: percentChange(cpiLookup.get(startDate), cpiLookup.get(date)),
    })),
  });

  lines.push({
    id: "wpi",
    label: "Wage Price Index",
    color: "#222222",
    strokeWidth: 4,
    values: dates.map((date) => ({
      date,
      value: percentChange(wpiLookup.get(startDate), wpiLookup.get(date)),
    })),
  });

  return { dates, lines };
}

function svgPath(values, width, height, margin, minValue, maxValue) {
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const range = maxValue - minValue || 1;
  const step = values.length > 1 ? plotWidth / (values.length - 1) : plotWidth;

  return values
    .map((point, index) => {
      const x = margin.left + step * index;
      const y = margin.top + plotHeight - ((point.value - minValue) / range) * plotHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function renderGroupLineChart(start, end) {
  const svg = document.getElementById("group-line-chart");
  if (!svg) return;

  const { dates, lines } = buildLineSeries(start, end);
  const values = lines.flatMap((line) => line.values.map((point) => point.value).filter(Number.isFinite));
  if (dates.length < 2 || values.length < 2) {
    svg.innerHTML = '<text class="axis-label" x="40" y="80">Select at least one category and a wider shared date range.</text>';
    return;
  }

  const width = 980;
  const height = 520;
  const margin = { top: 34, right: 250, bottom: 58, left: 74 };
  const minValue = Math.min(0, Math.min(...values));
  const maxValue = Math.max(...values) * 1.08;
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const tickCount = 6;

  const grid = Array.from({ length: tickCount }, (_, index) => {
    const ratio = index / (tickCount - 1);
    const y = margin.top + plotHeight * ratio;
    const tickValue = maxValue - (maxValue - minValue) * ratio;
    return `
      <line class="grid-line" x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}"></line>
      <text class="axis-label" x="${margin.left - 10}" y="${y + 4}" text-anchor="end">${tickValue.toFixed(0)}%</text>
    `;
  }).join("");

  const xTickIndexes = [0, Math.floor((dates.length - 1) / 2), dates.length - 1]
    .filter((item, index, array) => array.indexOf(item) === index);
  const xTicks = xTickIndexes.map((index) => {
    const x = margin.left + (dates.length > 1 ? (plotWidth / (dates.length - 1)) * index : plotWidth / 2);
    return `<text class="axis-label" x="${x}" y="${height - 20}" text-anchor="middle">${groupFormatQuarter(dates[index])}</text>`;
  }).join("");

  const labelItems = lines.map((line) => {
    const last = line.values[line.values.length - 1];
    const y = margin.top + plotHeight - ((last.value - minValue) / (maxValue - minValue || 1)) * plotHeight;
    return { line, last, y };
  }).sort((a, b) => a.y - b.y);

  const minLabelGap = 18;
  labelItems.forEach((item, index) => {
    if (index === 0) {
      item.labelY = Math.max(margin.top + 12, item.y);
      return;
    }
    item.labelY = Math.max(item.y, labelItems[index - 1].labelY + minLabelGap);
  });
  for (let index = labelItems.length - 1; index >= 0; index -= 1) {
    const maxY = height - margin.bottom - 8 - (labelItems.length - 1 - index) * minLabelGap;
    labelItems[index].labelY = Math.min(labelItems[index].labelY, maxY);
    if (index < labelItems.length - 1) {
      labelItems[index].labelY = Math.min(labelItems[index].labelY, labelItems[index + 1].labelY - minLabelGap);
    }
  }

  const labelYById = new Map(labelItems.map((item) => [item.line.id, item.labelY]));

  const lineMarkup = lines.map((line) => {
    const last = line.values[line.values.length - 1];
    const x = width - margin.right + 14;
    const y = labelYById.get(line.id) ?? margin.top;
    const pathD = svgPath(line.values, width, height, margin, minValue, maxValue);
    const points = line.values.map((point, pointIndex) => {
      if (!Number.isFinite(point.value)) return "";
      const pointX = margin.left + (line.values.length > 1 ? (plotWidth / (line.values.length - 1)) * pointIndex : plotWidth / 2);
      const pointY = margin.top + plotHeight - ((point.value - minValue) / (maxValue - minValue || 1)) * plotHeight;
      const title = `${groupFormatQuarter(point.date)}\n${line.label}: ${groupFormatPercent(point.value)} since start quarter`;
      return `
        <g class="group-point-group"
          data-date="${escapeGroupAttribute(point.date)}"
          data-date-label="${escapeGroupAttribute(groupFormatQuarter(point.date))}"
          data-series="${escapeGroupAttribute(line.label)}"
          data-change="${escapeGroupAttribute(groupFormatPercent(point.value))}"
          data-color="${escapeGroupAttribute(line.color)}"
          data-x="${pointX.toFixed(2)}"
          data-y="${pointY.toFixed(2)}">
          <circle class="group-point-hit" cx="${pointX.toFixed(2)}" cy="${pointY.toFixed(2)}" r="8">
            <title>${escapeGroupAttribute(title)}</title>
          </circle>
          <circle class="group-point" cx="${pointX.toFixed(2)}" cy="${pointY.toFixed(2)}" r="2.8" fill="${line.color}"></circle>
        </g>
      `;
    }).join("");
    return `
      <path class="group-series-line" d="${pathD}"
        stroke="${line.color}" stroke-width="${line.strokeWidth || 2.2}" ${line.strokeDasharray ? `stroke-dasharray="${line.strokeDasharray}"` : ""}>
        <title>${line.label}: ${groupFormatPercent(last.value)} by ${groupFormatQuarter(last.date)}</title>
      </path>
      ${points}
      <text class="group-line-label" x="${x}" y="${y + 4}" fill="${line.color}">${groupShortLabel(line.label)} (${groupFormatPercent(last.value)})</text>
    `;
  }).join("");

  svg.innerHTML = `
    <line class="axis-line" x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}"></line>
    <line class="axis-line" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}"></line>
    <text class="chart-zone-label chart-zone-bad" x="${margin.left + 20}" y="${margin.top + 38}">MORE EXPENSIVE</text>
    <text class="chart-zone-label chart-zone-good" x="${margin.left + 20}" y="${height - margin.bottom - 20}">MORE AFFORDABLE</text>
    ${grid}
    ${lineMarkup}
    ${xTicks}
  `;
}

function hideGroupLineTooltip() {
  const svg = document.getElementById("group-line-chart");
  const tooltip = document.getElementById("group-line-tooltip");
  tooltip?.classList.remove("visible");
  svg?.querySelectorAll(".group-point-group.is-active").forEach((item) => item.classList.remove("is-active"));
}

function showGroupLineTooltip(group) {
  const svg = document.getElementById("group-line-chart");
  const tooltip = document.getElementById("group-line-tooltip");
  const frame = svg?.closest(".chart-frame");
  if (!svg || !tooltip || !frame || !group) return;

  const x = Number(group.dataset.x || 0);
  const y = Number(group.dataset.y || 0);
  const frameWidth = frame.clientWidth;
  const frameHeight = frame.clientHeight;
  const leftPx = (x / 980) * frameWidth;
  const topPx = (y / 520) * frameHeight;
  const tooltipWidth = 230;
  let tooltipLeft = leftPx + 16;
  if (tooltipLeft + tooltipWidth > frameWidth - 10) {
    tooltipLeft = leftPx - tooltipWidth - 16;
  }
  tooltipLeft = Math.max(10, tooltipLeft);

  tooltip.innerHTML = `
    <div class="tooltip-date">${group.dataset.dateLabel || ""}</div>
    <div class="tooltip-row">
      <span class="tooltip-dot" style="background:${group.dataset.color || "#0e6b5c"}"></span>
      <span>${group.dataset.series || "Series"}</span>
      <span class="tooltip-val">${group.dataset.change || "--"}</span>
    </div>
    <div class="tooltip-note">Cumulative change since the selected start quarter.</div>
  `;
  tooltip.style.left = `${tooltipLeft}px`;
  tooltip.style.top = `${Math.max(10, topPx - 48)}px`;
  tooltip.classList.add("visible");
}

function wireGroupLineHover() {
  const svg = document.getElementById("group-line-chart");
  if (!svg || svg.dataset.groupHoverWired === "true") return;
  svg.dataset.groupHoverWired = "true";

  svg.addEventListener("mousemove", (event) => {
    const group = event.target.closest(".group-point-group");
    if (!group) {
      hideGroupLineTooltip();
      return;
    }
    svg.querySelectorAll(".group-point-group.is-active").forEach((item) => {
      if (item !== group) item.classList.remove("is-active");
    });
    group.classList.add("is-active");
    showGroupLineTooltip(group);
  });

  svg.addEventListener("mouseleave", hideGroupLineTooltip);
}

function buildAbundanceRows(start, end) {
  const wpi = groupWpiLookup();
  const groups = groupSeries().filter((series) => groupChartState.selectedIds.has(series.seriesId));
  const cpi = groupOverallCpi();
  const rows = [...groups, cpi].map((series) => {
    const lookup = pointLookup(series);
    const startValue = lookup.get(start);
    const endValue = lookup.get(end);
    const wageStart = wpi.get(start);
    const wageEnd = wpi.get(end);
    const priceRatio = endValue / startValue;
    const wageRatio = wageEnd / wageStart;
    return {
      label: series.seriesId === window.CPI_DATA.overallCpiSeriesId ? "Overall products and services" : series.label,
      value: Number.isFinite(priceRatio) && Number.isFinite(wageRatio) ? (wageRatio / priceRatio - 1) * 100 : null,
    };
  });
  return rows.filter((row) => Number.isFinite(row.value)).sort((a, b) => b.value - a.value);
}

function renderAbundanceChart(start, end) {
  const svg = document.getElementById("group-abundance-chart");
  if (!svg) return;

  const rows = buildAbundanceRows(start, end);
  const width = 980;
  const rowHeight = 42;
  const margin = { top: 28, right: 140, bottom: 28, left: 280 };
  const height = Math.max(420, margin.top + margin.bottom + rows.length * rowHeight);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  if (!rows.length) {
    svg.innerHTML = '<text class="axis-label" x="40" y="80">Select categories to compare against wages.</text>';
    return;
  }

  const values = rows.map((row) => row.value);
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values);
  const maxAbs = Math.max(Math.abs(minValue), Math.abs(maxValue)) || 1;
  const plotLeft = margin.left;
  const plotRight = width - margin.right;
  const zeroX = plotLeft + (plotRight - plotLeft) / 2;
  const scale = (plotRight - plotLeft) / 2 / maxAbs;

  const bars = rows.map((row, index) => {
    const y = margin.top + index * rowHeight;
    const barY = y + 7;
    const barHeight = 24;
    const x = row.value >= 0 ? zeroX : zeroX + row.value * scale;
    const barWidth = Math.abs(row.value * scale);
    const labelX = row.value >= 0 ? x + barWidth + 8 : x - 8;
    const labelAnchor = row.value >= 0 ? "start" : "end";
    const rowLabelX = row.value >= 0 ? zeroX - 12 : zeroX + 12;
    const rowLabelAnchor = row.value >= 0 ? "end" : "start";
    return `
      <text class="bar-row-label" x="${rowLabelX}" y="${y + 25}" text-anchor="${rowLabelAnchor}">${row.label}</text>
      <rect class="${row.value >= 0 ? "abundance-positive" : "abundance-negative"}" x="${x}" y="${barY}" width="${Math.max(2, barWidth)}" height="${barHeight}" rx="2">
        <title>${row.label}: ${groupFormatPercent(row.value)} relative to wages</title>
      </rect>
      <text class="bar-value-label" x="${labelX}" y="${y + 25}" text-anchor="${labelAnchor}">${groupFormatPercent(row.value)}</text>
    `;
  }).join("");

  svg.innerHTML = `
    <line class="axis-line" x1="${zeroX}" y1="${margin.top - 8}" x2="${zeroX}" y2="${height - margin.bottom + 2}"></line>
    ${bars}
  `;
}

function updateGroupSummary(start, end) {
  const summary = document.getElementById("group-summary");
  const range = document.getElementById("group-range-label");
  const rows = buildAbundanceRows(start, end);
  if (range) {
    range.textContent = `${groupFormatQuarter(start)} to ${groupFormatQuarter(end)}. WPI source: ${window.WPI_METADATA?.seriesId || "WPI"}.`;
  }
  if (!summary || !rows.length) return;
  const moreAffordable = rows.filter((row) => row.value > 0).length;
  const lessAffordable = rows.filter((row) => row.value < 0).length;
  const best = rows[0];
  const worst = rows[rows.length - 1];
  summary.textContent = `${moreAffordable} selected groups became more affordable relative to wages and ${lessAffordable} became less affordable. Biggest improvement: ${best.label} (${groupFormatPercent(best.value)}). Biggest pressure: ${worst.label} (${groupFormatPercent(worst.value)}).`;
}

function renderGroupCharts() {
  const { start, end } = getRangeDates();
  if (!start || !end) return;

  const startSelect = document.getElementById("group-start-date");
  const endSelect = document.getElementById("group-end-date");
  if (start > end) {
    endSelect.value = start;
  }

  const range = getRangeDates();
  renderGroupLineChart(range.start, range.end);
  renderAbundanceChart(range.start, range.end);
  updateGroupSummary(range.start, range.end);
}

function initGroupCharts() {
  if (!window.CPI_DATA || !window.WPI_DATA) return;
  createGroupToggles();
  fillGroupDateSelects();
  document.getElementById("group-start-date")?.addEventListener("change", renderGroupCharts);
  document.getElementById("group-end-date")?.addEventListener("change", renderGroupCharts);
  document.getElementById("group-reset")?.addEventListener("click", () => {
    createGroupToggles();
    fillGroupDateSelects();
    renderGroupCharts();
  });
  wireGroupLineHover();
  renderGroupCharts();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGroupCharts);
} else {
  initGroupCharts();
}
