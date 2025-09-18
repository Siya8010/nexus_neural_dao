class FinancialApp {
    constructor() {
        this.API_BASE = window.location.origin; // Use same origin as the frontend
        this.currentModel = null;
        
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
                const query = e.target.getAttribute('data-query');
                document.getElementById('queryInput').value = query;
                this.generateModel();
            });
        });
        
        // Tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.getAttribute('data-tab'));
            });
        });
        
        // Export Excel button
        document.getElementById('exportExcelBtn').addEventListener('click', () => {
            this.exportToExcel();
        });
        
        // New query button
        document.getElementById('newQueryBtn').addEventListener('click', () => {
            this.resetUI();
        });
        
        // Enter key to submit query
        document.getElementById('queryInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
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
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to generate model. Please try again.');
            }
            
            const data = await response.json();
            this.currentModel = data;
            this.displayResults(data);
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    displayResults(data) {
        // Show results section
        document.getElementById('resultsSection').classList.remove('hidden');
        
        // Scroll to results
        document.getElementById('resultsSection').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
        
        // Update model info - FIXED: Use correct field names from your API
        document.getElementById('modelId').textContent = data.model_id;
        document.getElementById('timeHorizon').textContent = `${data.monthly_projections.length} months`;
        
        // Calculate and display total revenue for the last month - FIXED: Use correct field names
        const lastMonth = data.monthly_projections[data.monthly_projections.length - 1];
        const totalRevenue = lastMonth ? lastMonth.total_revenue : 0;
        document.getElementById('totalRevenue').textContent = this.formatCurrency(totalRevenue);
        
        // Display projections table - FIXED: Use correct field names
        this.displayProjectionsTable(data.monthly_projections);
        
        // Display revenue drivers - FIXED: Use correct field names
        this.displayRevenueDrivers(data.revenue_drivers);
        
        // Display assumptions - FIXED: Use correct field names
        this.displayAssumptions(data.assumptions_used);
    }
    
    displayProjectionsTable(projections) {
        const tbody = document.querySelector('#projectionsTable tbody');
        tbody.innerHTML = '';
        
        projections.forEach(proj => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>Month ${proj.month}</strong></td>
                <td>${proj.sales_people} people</td>
                <td>${proj.large_customers_cumulative?.toLocaleString() || '0'}</td>
                <td>${proj.small_customers_cumulative?.toLocaleString() || '0'}</td>
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
        
        if (!drivers || drivers.length === 0) {
            container.innerHTML = '<p>No revenue drivers available</p>';
            return;
        }
        
        drivers.forEach(driver => {
            const card = document.createElement('div');
            card.className = 'driver-card';
            card.innerHTML = `
                <h4>${this.formatText(driver.name)}</h4>
                <p><strong>Type:</strong> ${driver.type || 'N/A'}</p>
                <p><strong>Value:</strong> ${driver.value || 'N/A'} ${driver.unit || ''}</p>
                ${driver.formula ? `<p><strong>Formula:</strong> <code>${driver.formula}</code></p>` : ''}
                ${driver.business_unit ? `<p><strong>Business Unit:</strong> ${driver.business_unit}</p>` : ''}
            `;
            container.appendChild(card);
        });
    }
    
    displayAssumptions(assumptions) {
        const container = document.getElementById('assumptionsContainer');
        container.innerHTML = '';
        
        if (!assumptions || Object.keys(assumptions).length === 0) {
            container.innerHTML = '<p>No assumptions available</p>';
            return;
        }
        
        for (const [key, value] of Object.entries(assumptions)) {
            const card = document.createElement('div');
            card.className = 'assumption-card';
            
            const formattedKey = this.formatText(key);
            const formattedValue = typeof value === 'number' ? this.formatNumber(value) : value;
            
            card.innerHTML = `
                <h4>${formattedKey}</h4>
                <p>${formattedValue}</p>
            `;
            container.appendChild(card);
        }
    }
    
    async exportToExcel() {
        if (!this.currentModel) return;
        
        try {
            this.showLoading(true);
            const response = await fetch(`${this.API_BASE}/api/v1/export/excel/${this.currentModel.model_id}`);
            
            if (!response.ok) {
                throw new Error('Failed to export Excel file');
            }
            
            // Create blob from response and trigger download
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
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }
    
    resetUI() {
        document.getElementById('queryInput').value = '';
        document.getElementById('resultsSection').classList.add('hidden');
        this.currentModel = null;
        
        // Scroll back to input
        document.querySelector('.query-section').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
    
    showLoading(show) {
        document.getElementById('loadingIndicator').classList.toggle('hidden', !show);
    }
    
    showError(message) {
        // Create or show error message
        let errorElement = document.getElementById('errorMessage');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'errorMessage';
            errorElement.className = 'error-message';
            errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i><span id="errorText"></span>`;
            document.querySelector('.main-content').appendChild(errorElement);
        }
        
        document.getElementById('errorText').textContent = message;
        errorElement.classList.remove('hidden');
    }
    
    showSuccess(message) {
        // Create success notification
        const successElement = document.createElement('div');
        successElement.className = 'error-message';
        successElement.style.background = '#f0fdf4';
        successElement.style.color = '#166534';
        successElement.style.borderLeftColor = '#166534';
        successElement.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        
        document.querySelector('.main-content').appendChild(successElement);
        
        // Remove after 3 seconds
        setTimeout(() => {
            successElement.remove();
        }, 3000);
    }
    
    hideError() {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    }
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
    
    formatNumber(num) {
        return new Intl.NumberFormat('en-US').format(num);
    }
    
    formatText(text) {
        return text
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FinancialApp();
    
    // Add some interactive animations
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-2px)';
            btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = 'none';
        });
    });
});