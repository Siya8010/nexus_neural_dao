from pydantic import BaseModel
from typing import List, Dict, Any

from app.models.finance_models import MonthlyProjection, RevenueDriver

class FinancialModelRequest(BaseModel):
    user_query: str

class QueryResponse(BaseModel):
    model_id: str
    revenue_drivers: List[RevenueDriver]
    monthly_projections: List[MonthlyProjection]
    assumptions: Dict[str, Any]

class HealthResponse(BaseModel):
    status: str
    message: str