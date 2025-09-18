// API Configuration
const API_BASE = window.location.origin;

// DOM Elements
const queryForm = document.getElementById('queryForm');
const loadingSection = document.getElementById('loadingSection');
const resultsSection = document.getElementById('resultsSection');
const exportBtn = document.getElementById('exportBtn');
const newModelBtn = document.getElementById('newModelBtn');

// State
let currentModelId = null;

// Event Listeners
queryForm.addEventListener('submit', handleQuerySubmit);
exportBtn.addEventListener('click', handleExport);
newModelBtn.addEventListener('click', handleNewModel);

// Form Submission
async function handleQuerySubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(queryForm);
    const query = formData.get('query');
    
    // Build query parameters
    const params = new URLSearchParams();
    params.append('query', query);
    
    // Add optional parameters if provided
    const months = formData.get('months');
    const initialSalesPeople = formData.get('initialSalesPeople');
    const marketingSpend = formData.get('marketingSpend');
    const largeCustomerRevenue = formData.get('largeCustomerRevenue');
    
    if (months) params.append('months', months);
    if (initialSalesPeople) params.append('initial_sales_people', initialSalesPeople);
    if (marketingSpend) params.append('marketing_spend_monthly', marketingSpend);
    if (largeCustomerRevenue) params.append('large_customer_revenue_monthly', largeCustomerRevenue);
    
    // Show loading state
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE}/api/v1/search?${params}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to generate model');
        }
        
        const data = await response.json();
        currentModelId = data.model_id;
        displayResults(data);
        
    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
    }
}

// Display Results
function displayResults(data) {
    hideLoading();
    
    // Update model summary
    document.getElementById('modelId').textContent = data.model_id.substring(0, 8) + '...';
    document.getElementById('timeHorizon').textContent = `${data.monthly_projections.length} months`;
    
    const firstMonth = data.monthly_projections[0];
    const lastMonth = data.monthly_projections[data.monthly_projections.length - 1];
    
    document.getElementById('month1Revenue').textContent = formatCurrency(firstMonth.total_revenue);
    document.getElementById('finalRevenue').textContent = formatCurrency(lastMonth.total_revenue);
    
    // Display revenue drivers
    displayRevenueDrivers(data.revenue_drivers);
    
    // Display projections table
    displayProjectionsTable(data.monthly_projections);
    
    // Display assumptions
    displayAssumptions(data.assumptions);
    
    // Show results section
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Display Revenue Drivers
function displayRevenueDrivers(drivers) {
    const container = document.getElementById('revenueDriversList');
    container.innerHTML = '';
    
    drivers.forEach(driver => {
        const driverElement = document.createElement('div');
        driverElement.className = 'driver-item';
        driverElement.innerHTML = `
            <h4>${driver.name.replace(/_/g, ' ').toUpperCase()}</h4>
            <div class="value">${formatValue(driver.value, driver.unit)}</div>
        `;
        container.appendChild(driverElement);
    });
}

// Display Projections Table
function displayProjectionsTable(projections) {
    const tbody = document.getElementById('projectionsTableBody');
    tbody.innerHTML = '';
    
    projections.forEach(projection => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${projection.month}</td>
            <td>${projection.sales_people}</td>
            <td>${projection.large_customers_acquired}</td>
            <td>${formatCurrency(projection.large_customer_revenue)}</td>
            <td>${projection.small_customers_acquired}</td>
            <td>${formatCurrency(projection.small_customer_revenue)}</td>
            <td>${formatCurrency(projection.marketing_spend)}</td>
            <td><strong>${formatCurrency(projection.total_revenue)}</strong></td>
        `;
        tbody.appendChild(row);
    });
}

// Display Assumptions
function displayAssumptions(assumptions) {
    const container = document.getElementById('assumptionsList');
    container.innerHTML = '';
    
    const keyAssumptions = [
        'initial_sales_people',
        'sales_people_growth_rate',
        'large_customer_revenue_monthly',
        'small_customer_revenue_monthly',
        'marketing_spend_monthly',
        'sales_inquiries_per_month',
        'conversion_rate'
    ];
    
    keyAssumptions.forEach(key => {
        if (assumptions[key] !== undefined) {
            const assumptionElement = document.createElement('div');
            assumptionElement.className = 'assumption-item';
            assumptionElement.innerHTML = `
                <div class="label">${formatLabel(key)}</div>
                <div class="value">${formatAssumptionValue(assumptions[key], key)}</div>
            `;
            container.appendChild(assumptionElement);
        }
    });
}

// Export to Excel
async function handleExport() {
    if (!currentModelId) {
        showError('No model to export');
        return;
    }
    
    try {
        // Create a temporary link to download the file
        const url = `${API_BASE}/api/v1/export/excel/${currentModelId}?auto_open=true`;
        
        // Open in new tab to trigger download and auto-open
        window.open(url, '_blank');
        
        // Show success message
        showSuccess('Excel file generated and opened!');
        
    } catch (error) {
        console.error('Export error:', error);
        showError('Failed to export Excel file');
    }
}

// New Model
function handleNewModel() {
    // Reset form
    queryForm.reset();
    
    // Hide results
    resultsSection.style.display = 'none';
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Focus on query input
    document.getElementById('query').focus();
}

// UI State Management
function showLoading() {
    loadingSection.style.display = 'block';
    resultsSection.style.display = 'none';
}

function hideLoading() {
    loadingSection.style.display = 'none';
}

function showError(message) {
    hideLoading();
    alert(`Error: ${message}`);
}

function showSuccess(message) {
    // Create a temporary success message
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        z-index: 1000;
        font-weight: 500;
    `;
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        document.body.removeChild(successDiv);
    }, 3000);
}

// Utility Functions
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function formatValue(value, unit) {
    if (unit === '$') {
        return formatCurrency(value);
    } else if (unit === '#') {
        return Math.round(value).toLocaleString();
    } else if (unit === '%') {
        return `${(value * 100).toFixed(1)}%`;
    }
    return value.toLocaleString();
}

function formatLabel(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatAssumptionValue(value, key) {
    if (key.includes('revenue') || key.includes('spend')) {
        return formatCurrency(value);
    } else if (key.includes('rate') || key.includes('conversion')) {
        return `${(value * 100).toFixed(1)}%`;
    } else if (key.includes('people') || key.includes('inquiries')) {
        return Math.round(value).toLocaleString();
    }
    return value.toLocaleString();
}

// Scroll Functions
function scrollToDemo() {
    document.getElementById('demo').scrollIntoView({ behavior: 'smooth' });
}

function scrollToFeatures() {
    document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Focus on query input
    document.getElementById('query').focus();
    
    // Add some example queries
    const examples = [
        "Create 12-month revenue forecast with 2 sales people",
        "Build 6-month model with $300k monthly marketing spend",
        "Forecast 18-month growth with 5 initial sales people"
    ];
    
    const queryInput = document.getElementById('query');
    queryInput.addEventListener('focus', () => {
        if (!queryInput.value) {
            queryInput.placeholder = examples[Math.floor(Math.random() * examples.length)];
        }
    });
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Add scroll effect to navbar
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 100) {
            navbar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.boxShadow = 'none';
        }
    });
});
