import uuid
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime

class FinancialModelData(BaseModel):
    """Container for a financial model and its associated data."""
    model_id: str
    time_horizon_months: int = 11
    assumptions: Dict[str, Any] = {}
    revenue_drivers: List['RevenueDriver'] = []
    monthly_projections: List['MonthlyProjection'] = []

class RevenueDriver(BaseModel):
    name: str
    type: str # "input", "calculated"
    value: Optional[float] = None
    unit: str
    formula: Optional[str] = None
    business_unit: Optional[str] = "assumption"

class BusinessUnit(BaseModel):
    name: str
    go_to_market_strategy: str
    assumptions: Dict[str, Any]
    revenue_formulas: List[str]
    monthly_metrics: Dict[str, float] = {}

class MonthlyProjection(BaseModel):
    month: int
    sales_people: int = 0
    large_customers_acquired: int = 0
    large_customers_cumulative: int = 0
    large_customer_revenue: float = 0
    small_customers_acquired: int = 0
    small_customers_cumulative: int = 0
    small_customer_revenue: float = 0
    marketing_spend: float = 0
    total_revenue: float = 0

class FinancialModel(BaseModel):
    model_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.now)
    query: str
    business_units: Dict[str, BusinessUnit] = {}
    revenue_drivers: List[RevenueDriver] = []
    monthly_projections: List[MonthlyProjection] = []
    assumptions: Dict[str, Any] = {}

    def calculate_projections(self, months: int = 11):
        """Calculate monthly projections based on business logic"""
        from app.utils.formula_engine import FormulaEngine
        engine = FormulaEngine()
        self.monthly_projections = engine.calculate_monthly_projections(
            months, self.assumptions, self.revenue_drivers
        )
