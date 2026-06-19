const MOCK_RECORDS = 90;
const REFRESH_MS = 5000;

const TrafficInsights = (() => {
    let chart;
    const mockData = generateMockData(MOCK_RECORDS);

    function init() {
        renderAll(mockData);
        setInterval(() => {
            renderAll(mockData);
        }, REFRESH_MS);
    }

    function generateMockData(count) {
        const data = [];
        const now = new Date();
        const start = new Date(now.getTime() - (count - 1) * 60000);

        for (let i = 0; i < count; i++) {
            const stamp = new Date(start.getTime() + i * 60000);
            const hour = stamp.getHours();
            const minuteWave = 0.72 + 0.38 * Math.sin((i / count) * Math.PI * 2 - Math.PI / 2);
            const hourFactor = getHourFactor(hour);
            const base = 12 * hourFactor * minuteWave;

            const north = boundedInt(base * 1.12 + randomBetween(-3, 5), 2, 58);
            const south = boundedInt(base * 1.02 + randomBetween(-4, 5), 2, 56);
            const east = boundedInt(base * 0.92 + randomBetween(-3, 4), 1, 54);
            const west = boundedInt(base * 0.86 + randomBetween(-3, 4), 1, 54);

            const volume = north + south + east + west;
            const violations = boundedInt(Math.round(volume / 42 + randomBetween(0, 2)), 0, 10);
            const speedPenalty = volume / 12;
            const avgSpeed = boundedFloat(47 - speedPenalty + randomBetween(-2.2, 2.1), 16, 54);

            data.push({
                time: toTimeLabel(stamp),
                north,
                south,
                east,
                west,
                violations,
                avgSpeed
            });
        }

        return data;
    }

    function getHourFactor(hour) {
        if (hour >= 0 && hour < 5) return 0.42;
        if (hour >= 7 && hour <= 10) return 1.45;
        if (hour >= 17 && hour <= 20) return 1.55;
        if (hour >= 21) return 0.65;
        return 1.0;
    }

    function renderAll(data) {
        renderTrendChart(data);
        renderPeakTraffic(data);

        const avgVolume = average(data.map(d => d.north + d.south + d.east + d.west));
        const avgSpeed = average(data.map(d => d.avgSpeed));
        const totalViolations = sum(data.map(d => d.violations));

        renderCongestion(avgVolume);
        renderEfficiency(avgVolume, avgSpeed, totalViolations, data.length);
        renderViolationSummary(data, totalViolations);
        renderExecutiveInsights(data, avgVolume, avgSpeed, totalViolations);
        updateTimestamp();
    }

    function renderTrendChart(data) {
        const labels = data.map(d => d.time);
        const tickLimit = data.length > 75 ? 12 : 8;
        const config = {
            type: 'line',
            data: {
                labels,
                datasets: [
                    createSeries('North', data.map(d => d.north), '#2bc6ff'),
                    createSeries('South', data.map(d => d.south), '#ffd166'),
                    createSeries('East', data.map(d => d.east), '#7ce38b'),
                    createSeries('West', data.map(d => d.west), '#ff8c8c')
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#cde1ef'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#9bb4c8',
                            maxTicksLimit: tickLimit
                        },
                        grid: {
                            color: 'rgba(155, 180, 200, 0.14)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#9bb4c8'
                        },
                        grid: {
                            color: 'rgba(155, 180, 200, 0.14)'
                        }
                    }
                }
            }
        };

        if (!chart) {
            const ctx = document.getElementById('trafficTrendChart');
            chart = new Chart(ctx, config);
            return;
        }

        chart.data.labels = labels;
        chart.data.datasets.forEach((dataset, idx) => {
            dataset.data = config.data.datasets[idx].data;
        });
        chart.update();
    }

    function createSeries(label, data, color) {
        return {
            label,
            data,
            borderColor: color,
            backgroundColor: color,
            borderWidth: 2,
            pointRadius: 1.4,
            pointHoverRadius: 3,
            tension: 0.32,
            fill: false
        };
    }

    function renderPeakTraffic(data) {
        const peakGrid = document.getElementById('peakTrafficGrid');
        const directions = ['north', 'south', 'east', 'west'];

        const html = directions.map(dir => {
            const peak = data.reduce((best, row) => (row[dir] > best[dir] ? row : best), data[0]);
            return `
                <article class="peak-item">
                    <h3>${dir}</h3>
                    <div class="peak-value">${peak[dir]} vehicles</div>
                    <p class="muted">Peak at ${peak.time}</p>
                </article>
            `;
        }).join('');

        peakGrid.innerHTML = html;
    }

    function renderCongestion(avgVolume) {
        const levelEl = document.getElementById('congestionLevel');
        const hintEl = document.getElementById('congestionHint');
        levelEl.classList.remove('metric-high', 'metric-medium', 'metric-low');

        let level = 'Low';
        let cssClass = 'metric-low';
        let hint = 'Flow is smooth with short queues.';

        if (avgVolume > 88) {
            level = 'High';
            cssClass = 'metric-high';
            hint = 'High queue pressure likely at junction approaches.';
        } else if (avgVolume > 58) {
            level = 'Medium';
            cssClass = 'metric-medium';
            hint = 'Moderate congestion with periodic buildup.';
        }

        levelEl.textContent = level;
        levelEl.classList.add(cssClass);
        hintEl.textContent = `${hint} Avg total flow: ${avgVolume.toFixed(1)} vehicles/min.`;
    }

    function renderEfficiency(avgVolume, avgSpeed, totalViolations, samples) {
        const scoreEl = document.getElementById('efficiencyScore');
        const hintEl = document.getElementById('efficiencyHint');

        const volumePenalty = avgVolume * 0.48;
        const violationPenalty = (totalViolations / samples) * 7;
        const speedBoost = avgSpeed * 0.85;

        const score = boundedInt(Math.round(100 - volumePenalty - violationPenalty + speedBoost), 25, 99);

        scoreEl.textContent = `${score}/100`;
        hintEl.textContent = `Higher speed and lower violations improve score.`;
    }

    function renderViolationSummary(data, totalViolations) {
        const summaryEl = document.getElementById('violationSummary');
        const peakViolation = data.reduce((best, row) => (row.violations > best.violations ? row : best), data[0]);
        const totalVehicles = sum(data.map(d => d.north + d.south + d.east + d.west));
        const rate = totalVehicles === 0 ? 0 : (totalViolations / totalVehicles) * 100;

        summaryEl.innerHTML = [
            `<p><strong>Total Violations:</strong> ${totalViolations}</p>`,
            `<p><strong>Peak Violation Minute:</strong> ${peakViolation.time} (${peakViolation.violations})</p>`,
            `<p><strong>Violation Rate:</strong> ${rate.toFixed(2)} per 100 vehicles</p>`
        ].join('');
    }

    function renderExecutiveInsights(data, avgVolume, avgSpeed, totalViolations) {
        const insights = [];
        const listEl = document.getElementById('executiveInsights');
        const countEl = document.getElementById('insightCount');

        const avgByDirection = {
            north: average(data.map(d => d.north)),
            south: average(data.map(d => d.south)),
            east: average(data.map(d => d.east)),
            west: average(data.map(d => d.west))
        };
        const totalVehicles = sum(data.map(d => d.north + d.south + d.east + d.west));
        const violationRate = totalVehicles === 0 ? 0 : (totalViolations / totalVehicles) * 100;

        const busiestDirection = Object.keys(avgByDirection).reduce((a, b) => avgByDirection[a] > avgByDirection[b] ? a : b);
        const calmestDirection = Object.keys(avgByDirection).reduce((a, b) => avgByDirection[a] < avgByDirection[b] ? a : b);

        const topTrafficMinute = data.reduce((best, row) => {
            const bestFlow = best.north + best.south + best.east + best.west;
            const currentFlow = row.north + row.south + row.east + row.west;
            return currentFlow > bestFlow ? row : best;
        }, data[0]);

        if (avgVolume > 88) {
            insights.push(`Cycle pressure is elevated; consider extending green time on ${capitalize(busiestDirection)} by 10-15 seconds during peak intervals.`);
        } else if (avgVolume > 58) {
            insights.push(`Traffic demand is balanced but variable; retain adaptive timing and run phase recalibration every 15 minutes.`);
        } else {
            insights.push(`Network is operating below critical load; preserve the current plan and prioritize pedestrian crossing consistency.`);
        }

        insights.push(`Highest directional demand is ${capitalize(busiestDirection)} (${avgByDirection[busiestDirection].toFixed(1)} vehicles/min), while ${capitalize(calmestDirection)} remains the lightest corridor.`);

        if (avgSpeed < 26) {
            insights.push(`Average corridor speed is ${avgSpeed.toFixed(1)} km/h; deploy progressive signal offsets to reduce stop-start waves.`);
        } else if (avgSpeed > 38) {
            insights.push(`Average speed at ${avgSpeed.toFixed(1)} km/h indicates healthy progression with low queue spillback risk.`);
        } else {
            insights.push(`Current speed profile (${avgSpeed.toFixed(1)} km/h) is stable; monitor for sudden shockwave propagation during heavier phases.`);
        }

        if (violationRate > 1.4) {
            insights.push(`Violation rate is ${violationRate.toFixed(2)} per 100 vehicles; increase enforcement prompts around high-density approach lanes.`);
        } else {
            insights.push(`Violation rate is controlled at ${violationRate.toFixed(2)} per 100 vehicles; maintain camera audit cadence and signage visibility checks.`);
        }

        insights.push(`Observed peak throughput reached ${topTrafficMinute.north + topTrafficMinute.south + topTrafficMinute.east + topTrafficMinute.west} vehicles/min at ${topTrafficMinute.time}.`);

        countEl.textContent = `${insights.length} insights`;

        listEl.innerHTML = insights.map((item, index) => {
            const insightNumber = String(index + 1).padStart(2, '0');
            return `
                <li class="insight-item">
                    <span class="insight-number">#${insightNumber}</span>
                    <p class="insight-content">${item}</p>
                </li>
            `;
        }).join('');
    }

    function updateTimestamp() {
        const stamp = new Date();
        const label = stamp.toLocaleTimeString();
        document.getElementById('lastUpdated').textContent = `Updated: ${label}`;
    }

    function randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    function boundedInt(value, min, max) {
        return Math.max(min, Math.min(max, Math.round(value)));
    }

    function boundedFloat(value, min, max) {
        return Math.max(min, Math.min(max, Number(value.toFixed(1))));
    }

    function average(values) {
        if (!values.length) return 0;
        return sum(values) / values.length;
    }

    function sum(values) {
        return values.reduce((acc, value) => acc + value, 0);
    }

    function toTimeLabel(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    function capitalize(value) {
        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', TrafficInsights.init);
