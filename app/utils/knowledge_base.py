import json
import os
from typing import Dict, Any

class KnowledgeBase:
    """Manages SaaS company business rules and logic"""
    
    def __init__(self):
        self.saas_rules = self._load_saas_rules()
    
    def _load_saas_rules(self) -> Dict[str, Any]:
        """Load SaaS company rules from JSON file"""
        try:
            file_path = os.path.join(os.path.dirname(__file__), "data", "knowledge_base.json")
            with open(file_path, 'r') as file:
                return json.load(file)
        except FileNotFoundError:
            return self._get_default_saas_rules()
    
    def get_saas_rules(self) -> Dict[str, Any]:
        """Get SaaS company business rules"""
        return self.saas_rules
    
    def _get_default_saas_rules(self) -> Dict[str, Any]:
        """Default SaaS business rules if JSON file not found"""
        return {
            "company_type": "SaaS",
            "business_units": {
                "large_customers": {
                    "go_to_market": "direct sales",
                    "assumptions": {
                        "customers_per_salesperson_per_month": 1.5,
                        "revenue_per_customer_per_month": 16667,
                        "sales_people_initial": 1,
                        "sales_people_growth_monthly": 1
                    },
                    "formulas": {
                        "monthly_revenue": "cumulative_customers * revenue_per_customer",
                        "customers_acquired": "sales_people * customers_per_salesperson",
                        "cumulative_customers": "sum(customers_acquired_previous_months)"
                    }
                },
                "small_medium_customers": {
                    "go_to_market": "digital marketing",
                    "assumptions": {
                        "monthly_marketing_spend": 200000,
                        "cac": 1500,
                        "sales_inquiries_per_conversion_month": 160,
                        "demo_conversion_rate": 0.45,
                        "avg_revenue_per_customer": 5000
                    },
                    "formulas": {
                        "customers_acquired": "sales_inquiries * conversion_rate",
                        "monthly_revenue": "cumulative_customers * revenue_per_customer",
                        "cumulative_customers": "sum(customers_acquired_previous_months)"
                    }
                }
            },
            "revenue_drivers": [
                "number_of_sales_people",
                "customers_per_salesperson",
                "revenue_per_customer",
                "marketing_spend",
                "customer_acquisition_cost",
                "conversion_rates"
            ]
        }