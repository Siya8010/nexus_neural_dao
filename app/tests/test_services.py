import pytest
from app.services.finance_service import FinanceService
from app.utils.formula_engine import FormulaEngine

@pytest.mark.asyncio
async def test_finance_service_query_processing():
    """Test that the FinanceService correctly processes a natural language query."""
    service = FinanceService()
    query = "Create 6-month forecast with 3 sales people"
    result = await service.process_query(query)
    
    assert result.model_id is not None
    assert len(result.monthly_projections) == 6
    assert result.monthly_projections[0].sales_people >= 3

def test_formula_engine():
    """Test the core financial calculation logic in FormulaEngine."""
    engine = FormulaEngine()
    assumptions = {
        "initial_sales_people": 2,
        "sales_people_growth_rate": 1,
        "large_customer_revenue_monthly": 16667,
        "small_customer_revenue_monthly": 5000,
        "marketing_spend_monthly": 200000
    }
    
    # Using dummy revenue drivers for this test
    revenue_drivers = [
        {"unit_type": "large_customer", "per_unit_revenue": 16667},
        {"unit_type": "small_customer", "per_unit_revenue": 5000}
    ]

    projections = engine.calculate_monthly_projections(3, assumptions, revenue_drivers)
    
    assert len(projections) == 3
    assert projections[0].sales_people == 2
    assert projections[1].sales_people == 3
    assert projections[2].sales_people == 4
    
    # Check revenue calculations
    assert projections[0].total_revenue > 0
    assert projections[2].total_revenue > projections[0].total_revenue
