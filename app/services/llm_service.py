import json
import os
from typing import Dict, Any
import google.generativeai as genai
from app.config.settings import get_settings

settings = get_settings()
# Configure the API key from a more secure location (e.g., environment variables)
genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))

class LLMService:

    def _parse_query(self, user_query: str):
        import re
        text = user_query.lower()
        def to_number(val, unit=None):
            try:
                n = float(val.replace(',', ''))
            except Exception:
                return None
            if unit in ('k', 'thousand'):
                n *= 1_000
            elif unit in ('m', 'million'):
                n *= 1_000_000
            return int(n)

        res = {}

        # months: e.g., "12-month", "12 months"
        m = re.search(r'(\d+)\s*[- ]*\s*month', text)
        if m:
            res['months'] = int(m.group(1))

        # sales people: e.g., "2 sales people", "2 salespeople", "2 sales"
        m = re.search(r'(\d+)\s*(sales\s*people|salespeople|sales)', text)
        if m:
            res['sales_people'] = int(m.group(1))

        # marketing spend: "$200k marketing", "200k marketing budget", "$1.2m marketing"
        m = re.search(r'\$?([\d.,]+)\s*(k|m|million|thousand)?\s*(marketing|ad|advertis|budget|spend)', text)
        if m:
            res['marketing'] = to_number(m.group(1), m.group(2).lower() if m.group(2) else None)

        # conversion rate: "45% conversion" or "... at 0.45 conversion"
        m = re.search(r'([\d.]+)\s*%\s*(conversion|conv)', text)
        if m:
            res['conversion'] = float(m.group(1)) / 100.0
        else:
            m = re.search(r'(0\.[\d]+)\s*(conversion|conv)', text)
            if m:
                res['conversion'] = float(m.group(1))

        return res
    def __init__(self):
        # A hardcoded prompt for the LLM to follow
        self.system_instruction = (
            "You are a world-class financial analyst and your task is to "
            "transform a natural language query into a structured JSON response. "
            "This structured data will be used by a financial modeling application to "
            "calculate projections for a SaaS company. The company has two primary business units: "
            "'large_customers' (direct sales model) and 'small_medium_customers' "
            "(digital marketing model). "
            "Your output must be **only** a valid JSON object, with no extra text or explanations. "
            "For all monetary values, remove the '$' sign and any commas. For percentage values, "
            "just use the number without the '%' sign."
        )

    def _get_generation_config(self) -> Dict[str, Any]:
        """
        Returns a generation configuration for the LLM.
        
        This config uses a JSON schema to ensure the LLM returns a structured,
        predictable response that the application can easily parse.
        """
        return {
            "response_mime_type": "application/json",
            "response_schema": {
                "type": "OBJECT",
                "properties": {
                    "time_horizon_months": {"type": "NUMBER"},
                    "revenue_drivers": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "name": {"type": "STRING"},
                                "type": {"type": "STRING"},
                                "value": {"type": "NUMBER"},
                                "unit": {"type": "STRING"}
                            }
                        }
                    },
                    "assumptions": {
                        "type": "OBJECT",
                        "properties": {
                            "initial_sales_people": {"type": "NUMBER"},
                            "sales_people_growth_monthly": {"type": "NUMBER"},
                            "customers_per_salesperson_per_month": {"type": "NUMBER"},
                            "revenue_per_large_customer": {"type": "NUMBER"},
                            "monthly_marketing_spend": {"type": "NUMBER"},
                            "sales_inquiries_per_month": {"type": "NUMBER"},
                            "demo_rate": {"type": "NUMBER"},
                            "avg_revenue_per_small_customer": {"type": "NUMBER"}
                        }
                    },
                    "business_focus": {
                        "type": "ARRAY",
                        "items": {"type": "STRING"}
                    },
                    "special_instructions": {
                        "type": "ARRAY",
                        "items": {"type": "STRING"}
                    }
                }
            }
        }

    async def get_financial_model_from_query(self, user_query: str) -> Dict[str, Any]:
        """
        Sends the user's query to the LLM and returns the parsed financial model.
        
        Args:
            user_query (str): The natural language query from the user.
        
        Returns:
            Dict[str, Any]: A dictionary containing the structured financial data.
        """
        try:
            api_key = os.environ.get("GOOGLE_API_KEY")
            if not api_key:
                # Fallback when API key is not provided
                return self._fallback_response(user_query)

            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash-preview-05-20",
                system_instruction=self.system_instruction
            )
            
            response = await model.generate_content_async(
                user_query,
                generation_config=self._get_generation_config()
            )

            # Extract the text content from the response
            response_text = response.candidates[0].content.parts[0].text
            
            # Parse the JSON string into a Python dictionary
            return json.loads(response_text)
            
        except Exception:
            # Graceful fallback on any LLM error
            return self._fallback_response(user_query)

    def _fallback_response(self, user_query: str) -> Dict[str, Any]:
        """
        Deterministic offline response to keep the app working without LLM.
        """
        parsed = self._parse_query(user_query)
        months = parsed.get('months', 11)
        sales_people = parsed.get('sales_people', 2)
        marketing = parsed.get('marketing', 200000)
        conversion = parsed.get('conversion', 0.45)
        return {
            "time_horizon_months": months,
            "revenue_drivers": [
                {"name": "number_of_sales_people", "type": "input", "value": sales_people, "unit": "#"},
                {"name": "marketing_spend", "type": "input", "value": marketing, "unit": "$"}
            ],
            "assumptions": {
                "initial_sales_people": sales_people,
                "sales_people_growth_monthly": 1,
                "revenue_per_large_customer": 16667,
                "monthly_marketing_spend": marketing,
                "sales_inquiries_per_month": 160,
                "demo_rate": conversion,
                "avg_revenue_per_small_customer": 5000
            },
            "business_focus": ["large_customers", "small_medium_customers"],
            "special_instructions": []
        }
