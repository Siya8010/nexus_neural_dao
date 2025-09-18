class FinancialApp {
    constructor() {
        this.API_BASE = window.location.origin; // same origin
        this.currentModel = null;
        this.charts = { revenueLine: null, revenueBreakdown: null, revenueMillion: null };
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Generate model button
        document.getElementById('generateBtn').addEventListener('click', () => {
            this.generateModel();
        });

        // Template buttons
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.currentTarget.closest('.template-card');
                const query = card?.getAttribute('data-query') || e.currentTarget.getAttribute('data-query');
                if (query) {
                    document.getElementById('queryInput').value = query;
                    this.generateModel();
                }
            });
        });

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.currentTarget.getAttribute('data-tab'));
            });
        });

        // Export Excel
        document.getElementById('exportExcelBtn').addEventListener('click', () => {
            this.exportToExcel();
        });

        // New analysis
        document.getElementById('newQueryBtn').addEventListener('click', () => {
            this.resetUI();
        });

        // Ctrl/Cmd + Enter to submit
        document.getElementById('queryInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.generateModel();
            }
        });
    }

    async generateModel() {
        const query = document.getElementById('queryInput').value.trim();
        if (!query) {
            this.showError('Please describe your financial scenario');
            return;
        }

        this.showLoading(true);
        this.hideError();

        try {
            const response = await fetch(`${this.API_BASE}/api/v1/search?query=${encodeURIComponent(query)}`);
            if (!response.ok) {
                let detail = 'Failed to generate model. Please try again.';
                try { const err = await response.json(); detail = err.detail || detail; } catch {}
                throw new Error(detail);
            }

            const data = await response.json();
            this.currentModel = data;
            this.displayResults(data);
        } catch (error) {
            this.showError(error.message || String(error));
        } finally {
            this.showLoading(false);
        }
    }

    displayResults(data) {
        // Show results section
        document.getElementById('resultsSection').classList.remove('hidden');
        document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Header stats
        document.getElementById('modelId').textContent = data.model_id;
        const months = Array.isArray(data.monthly_projections) ? data.monthly_projections.length : 0;
        document.getElementById('timeHorizon').textContent = `${months} months`;
        const lastMonth = months ? data.monthly_projections[months - 1] : null;
        const totalRevenue = lastMonth ? (lastMonth.total_revenue || 0) : 0;
        document.getElementById('totalRevenue').textContent = this.formatCurrency(totalRevenue);

        // Tables/cards
        this.displayProjectionsTable(data.monthly_projections || []);
        this.displayRevenueDrivers(data.revenue_drivers || []);
        this.displayAssumptions(data.assumptions || {});

        // Charts (auto navigate to Charts tab)
        this.renderCharts(data.monthly_projections || []);
        this.switchTab('charts');
    }

    displayProjectionsTable(projections) {
        const tbody = document.querySelector('#projectionsTable tbody');
        tbody.innerHTML = '';
        projections.forEach(proj => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>Month ${proj.month}</strong></td>
                <td>${proj.sales_people} people</td>
                <td>${(proj.large_customers_cumulative ?? 0).toLocaleString()}</td>
                <td>${(proj.small_customers_cumulative ?? 0).toLocaleString()}</td>
                <td>${this.formatCurrency(proj.large_customer_revenue || 0)}</td>
                <td>${this.formatCurrency(proj.small_customer_revenue || 0)}</td>
                <td><strong class="revenue-highlight">${this.formatCurrency(proj.total_revenue || 0)}</strong></td>
            `;
            tbody.appendChild(row);
        });
    }

    displayRevenueDrivers(drivers) {
        const container = document.getElementById('driversContainer');
        container.innerHTML = '';
        if (!drivers.length) {
            container.innerHTML = '<p>No revenue drivers available</p>';
            return;
        }
        drivers.forEach(driver => {
            const card = document.createElement('div');
            card.className = 'driver-card';
            card.innerHTML = `
                <h4>${this.formatText(driver.name)}</h4>
                <p><strong>Type:</strong> ${driver.type || 'N/A'}</p>
                <p><strong>Value:</strong> ${driver.value ?? 'N/A'} ${driver.unit || ''}</p>
                ${driver.formula ? `<p><strong>Formula:</strong> <code>${driver.formula}</code></p>` : ''}
                ${driver.business_unit ? `<p><strong>Business Unit:</strong> ${driver.business_unit}</p>` : ''}
            `;
            container.appendChild(card);
        });
    }

    displayAssumptions(assumptions) {
        const container = document.getElementById('assumptionsContainer');
        container.innerHTML = '';
        const keys = Object.keys(assumptions || {});
        if (!keys.length) {
            container.innerHTML = '<p>No assumptions available</p>';
            return;
        }
        keys.forEach(key => {
            const value = assumptions[key];
            const card = document.createElement('div');
            card.className = 'assumption-card';
            const formattedKey = this.formatText(key);
            const formattedValue = typeof value === 'number' ? this.formatNumber(value) : value;
            card.innerHTML = `
                <h4>${formattedKey}</h4>
                <p>${formattedValue}</p>
            `;
            container.appendChild(card);
        });
    }

    async exportToExcel() {
        if (!this.currentModel) return;
        try {
            this.showLoading(true);
            const response = await fetch(`${this.API_BASE}/api/v1/export/excel/${this.currentModel.model_id}`);
            if (!response.ok) throw new Error('Failed to export Excel file');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `financial_model_${this.currentModel.model_id}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            this.showSuccess('Excel file downloaded successfully!');
        } catch (error) {
            this.showError(error.message || String(error));
        } finally {
            this.showLoading(false);
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
        targetBtn && targetBtn.classList.add('active');

        // Update tab panes
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        const pane = document.getElementById(`${tabName}Tab`);
        pane && pane.classList.add('active');

        // If Charts tab, ensure charts are rendered/resized
        if (tabName === 'charts' && this.currentModel && Array.isArray(this.currentModel.monthly_projections)) {
            if (this.charts.revenueLine || this.charts.revenueBreakdown || this.charts.revenueMillion) {
                try { this.charts.revenueLine && this.charts.revenueLine.resize(); } catch {}
                try { this.charts.revenueBreakdown && this.charts.revenueBreakdown.resize(); } catch {}
                try { this.charts.revenueMillion && this.charts.revenueMillion.resize(); } catch {}
            } else {
                this.renderCharts(this.currentModel.monthly_projections);
            }
        }
    }

    renderCharts(projections) {
        if (!Array.isArray(projections) || projections.length === 0) return;

        const labels = projections.map(p => `M${p.month}`);
        const largeRev = projections.map(p => p.large_customer_revenue || 0);
        const smallRev = projections.map(p => p.small_customer_revenue || 0);
        const totalRev = projections.map(p => p.total_revenue || 0);
        const totalRevMn = totalRev.map(v => Math.round((v / 1_000_000) * 100) / 100); // $ Mn per month (2dp)

        const style = getComputedStyle(document.documentElement);
        const primary = style.getPropertyValue('--primary').trim() || '#0f62fe';
        const accent = style.getPropertyValue('--accent').trim() || '#08bdba';
        const gray300 = style.getPropertyValue('--gray-300').trim() || '#c6c6c6';

        // Line chart: Total Revenue (per month)
        const lineEl = document.getElementById('revenueLineChart');
        if (lineEl && window.Chart) {
            if (this.charts.revenueLine) this.charts.revenueLine.destroy();
            this.charts.revenueLine = new Chart(lineEl.getContext('2d'), {
                type: 'line',
                data: { labels, datasets: [{ label: 'Total Revenue ($/month)', data: totalRev, borderColor: primary, backgroundColor: primary + '22', borderWidth: 2, tension: 0.25, fill: true }] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true }, tooltip: { callbacks: { label: ctx => this.formatCurrency(ctx.parsed.y) } } },
                    scales: { x: { grid: { color: gray300 } }, y: { grid: { color: gray300 }, ticks: { callback: v => this.formatCurrency(v) } } }
                }
            });
        }

        // Stacked bar chart: Large vs Small/Medium
        const barEl = document.getElementById('revenueBreakdownChart');
        if (barEl && window.Chart) {
            if (this.charts.revenueBreakdown) this.charts.revenueBreakdown.destroy();
            this.charts.revenueBreakdown = new Chart(barEl.getContext('2d'), {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        { label: 'Large Customers ($/month)', data: largeRev, backgroundColor: primary, borderColor: primary, borderWidth: 1 },
                        { label: 'Small/Medium Customers ($/month)', data: smallRev, backgroundColor: accent, borderColor: accent, borderWidth: 1 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${this.formatCurrency(ctx.parsed.y)}` } } },
                    scales: { x: { stacked: true, grid: { color: gray300 } }, y: { stacked: true, grid: { color: gray300 }, ticks: { callback: v => this.formatCurrency(v) } } }
                }
            });
        }

        // Line chart: Total Revenues in $ Mn per month (mirrors Excel row)
        const mnEl = document.getElementById('revenueMillionChart');
        if (mnEl && window.Chart) {
            if (this.charts.revenueMillion) this.charts.revenueMillion.destroy();
            this.charts.revenueMillion = new Chart(mnEl.getContext('2d'), {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Total Revenues ($ Mn per month)',
                        data: totalRevMn,
                        borderColor: accent,
                        backgroundColor: accent + '22',
                        borderWidth: 2,
                        tension: 0.25,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true },
                        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(2)} Mn` } }
                    },
                    scales: {
                        x: { grid: { color: gray300 } },
                        y: { grid: { color: gray300 }, ticks: { callback: v => `${Number(v).toFixed(2)} Mn` } }
                    }
                }
            });
        }
    }

    resetUI() {
        document.getElementById('queryInput').value = '';
        document.getElementById('resultsSection').classList.add('hidden');
        this.currentModel = null;
        this.hideError();
        const qs = document.querySelector('.query-section');
        qs && qs.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    showLoading(show) {
        document.getElementById('loadingIndicator').classList.toggle('hidden', !show);
    }

    showError(message) {
        let errorElement = document.getElementById('errorMessage');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'errorMessage';
            errorElement.className = 'error-message';
            errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i><span id="errorText"></span>`;
            const mount = document.querySelector('.main-content') || document.body;
            mount.appendChild(errorElement);
        }
        document.getElementById('errorText').textContent = message;
        errorElement.classList.remove('hidden');
    }

    showSuccess(message) {
        const successElement = document.createElement('div');
        successElement.className = 'error-message';
        successElement.style.background = '#f0fdf4';
        successElement.style.color = '#166534';
        successElement.style.borderLeftColor = '#166534';
        successElement.innerHTML = `<i class=\"fas fa-check-circle\"></i> ${message}`;
        const mount = document.querySelector('.main-content') || document.body;
        mount.appendChild(successElement);
        setTimeout(() => successElement.remove(), 3000);
    }

    hideError() {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) errorElement.classList.add('hidden');
    }

    formatCurrency(amount) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount); }
    formatNumber(num) { return new Intl.NumberFormat('en-US').format(num); }
    formatText(text) { return String(text || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); }
}

document.addEventListener('DOMContentLoaded', () => {
    new FinancialApp();

    // Button hover micro-interactions
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => { btn.style.transform = 'translateY(-2px)'; btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'; });
        btn.addEventListener('mouseleave', () => { btn.style.transform = 'translateY(0)'; btn.style.boxShadow = 'none'; });
    });
});
