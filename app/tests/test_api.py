import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    """Test the health check endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_search_financial_model():
    """Test creating a financial model with a natural language query"""
    query = "Create 12-month revenue forecast with 2 sales people"
    response = client.get(f"/api/v1/search?query={query}")
    assert response.status_code == 200
    data = response.json()
    assert "model_id" in data
    assert "revenue_drivers" in data
    assert "monthly_projections" in data
    assert len(data["monthly_projections"]) == 11 # 11 months

def test_revenue_drivers():
    """Test getting the list of available revenue drivers"""
    response = client.get("/api/v1/revenue-drivers")
    assert response.status_code == 200
    drivers = response.json()
    assert "number_of_sales_people" in drivers
    assert "marketing_spend" in drivers

@pytest.mark.asyncio
async def test_excel_export():
    """Test the Excel export functionality"""
    # First create a model
    query = "Create revenue forecast"
    response = client.get(f"/api/v1/search?query={query}")
    model_id = response.json()["model_id"]

    # Then export to Excel
    export_response = client.get(f"/api/v1/export/excel/{model_id}")
    assert export_response.status_code == 200
    assert export_response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
