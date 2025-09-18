import uuid
from typing import Dict, Any, List, Optional
from app.models.response_models import QueryResponse
from app.models.finance_models import FinancialModelData, MonthlyProjection, RevenueDriver
from app.services.llm_service import LLMService
from app.utils.formula_engine import FormulaEngine

class FinanceService:
    def __init__(self):
        self.llm_service = LLMService()
        self.formula_engine = FormulaEngine()
        self.models: Dict[str, FinancialModelData] = {}

    async def process_query(self, user_query: str) -> QueryResponse:
        """
        Processes a natural language query to generate a financial model.
        
        Args:
            user_query (str): The natural language query from the user.
            
        Returns:
            QueryResponse: The generated financial model, including ID and projections.
        """
        llm_response = await self.llm_service.get_financial_model_from_query(user_query)

        # Extract and normalize data from the LLM response
        raw_time_horizon = llm_response.get("time_horizon_months")
        # Robust parsing: accept numeric strings, else fallback to 11
        if isinstance(raw_time_horizon, (int, float)):
            time_horizon = int(raw_time_horizon)
        elif isinstance(raw_time_horizon, str):
            import re
            m = re.search(r"(\d+)", raw_time_horizon)
            time_horizon = int(m.group(1)) if m else 11
        else:
            time_horizon = 11

        revenue_drivers_data = llm_response.get("revenue_drivers", [])
        raw_assumptions = llm_response.get("assumptions", {})

        # Normalize assumption keys coming from the LLM to what the engine expects
        assumptions: Dict[str, Any] = {
            # Sales team
            "initial_sales_people": raw_assumptions.get("initial_sales_people", raw_assumptions.get("sales_people_initial", 1)),
            "sales_people_growth_rate": raw_assumptions.get("sales_people_growth_rate", raw_assumptions.get("sales_people_growth_monthly", 0)),

            # Revenue per customer
            "large_customer_revenue_monthly": raw_assumptions.get("large_customer_revenue_monthly", raw_assumptions.get("revenue_per_large_customer", 16667)),
            "small_customer_revenue_monthly": raw_assumptions.get("small_customer_revenue_monthly", raw_assumptions.get("avg_revenue_per_small_customer", 5000)),

            # Marketing
            "marketing_spend_monthly": raw_assumptions.get("marketing_spend_monthly", raw_assumptions.get("monthly_marketing_spend", 200000)),

            # Funnel
            "sales_inquiries_per_month": raw_assumptions.get("sales_inquiries_per_month", raw_assumptions.get("sales_inquiries_per_conversion_month", 160)),
            "conversion_rate": raw_assumptions.get("conversion_rate", raw_assumptions.get("demo_rate", 0.45)),
        }

        # Convert raw data to Pydantic models
        revenue_drivers = [RevenueDriver(**rd) for rd in revenue_drivers_data]

        # Calculate projections
        projections = self.formula_engine.calculate_monthly_projections(
            time_horizon=time_horizon,
            assumptions=assumptions,
            revenue_drivers=revenue_drivers
        )

        # Create a new financial model object
        model_id = str(uuid.uuid4())
        financial_model = FinancialModelData(
            model_id=model_id,
            time_horizon_months=time_horizon,
            assumptions=assumptions,
            revenue_drivers=revenue_drivers,
            monthly_projections=projections
        )
        self.models[model_id] = financial_model

        return QueryResponse(
            model_id=model_id,
            revenue_drivers=revenue_drivers,
            monthly_projections=projections,
            assumptions=assumptions
        )

    def get_model_by_id(self, model_id: str) -> Optional[FinancialModelData]:
        """
        Retrieves a financial model by its unique ID.
        
        Args:
            model_id (str): The unique ID of the financial model.
            
        Returns:
            FinancialModelData: The financial model object.
        """
        return self.models.get(model_id)

    def get_available_revenue_drivers(self) -> Dict[str, Any]:
        """
        Returns a list of available revenue drivers and their types.
        """
        # This can be expanded to a more dynamic list in the future
        return {
            "number_of_sales_people": {"type": "input", "unit": "#"},
            "marketing_spend": {"type": "input", "unit": "$"}
        }
