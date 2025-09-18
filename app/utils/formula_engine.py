import math
from typing import Dict, Any, List
from app.models.finance_models import MonthlyProjection, RevenueDriver


class FormulaEngine:
    """
    A class for performing core financial calculations based on SaaS business rules.
    """

    def calculate_monthly_projections(self, time_horizon: int, assumptions: Dict[str, Any], revenue_drivers: List[RevenueDriver]) -> List[MonthlyProjection]:
        """
        Calculates monthly projections for a SaaS company over a given time horizon.

        Args:
            time_horizon (int): The number of months to project.
            assumptions (Dict[str, Any]): A dictionary of key assumptions.
            revenue_drivers (List[RevenueDriver]): A list of revenue driver objects.

        Returns:
            List[MonthlyProjection]: A list of monthly projection objects.
        """
        projections: List[MonthlyProjection] = []

        # Extracting key assumptions with default values to prevent NoneType errors
        initial_sales_people = assumptions.get("initial_sales_people", 1)
        sales_people_growth_rate = assumptions.get("sales_people_growth_rate", 0)  # Changed to 0
        
        # Default revenue assumptions
        large_customer_revenue_monthly = assumptions.get("large_customer_revenue_monthly", 16667)
        small_customer_revenue_monthly = assumptions.get("small_customer_revenue_monthly", 5000)

        # Default cost assumptions
        marketing_spend_monthly = assumptions.get("marketing_spend_monthly", 200000)

        # Initialize month 0 values
        current_sales_people = initial_sales_people

        # Guard against None or invalid horizon
        if not isinstance(time_horizon, int) or time_horizon <= 0:
            time_horizon = 11

        # Tracking cumulative customers
        cumulative_large_customers = 0
        cumulative_small_customers = 0

        # Monthly loop for projections
        for month in range(1, time_horizon + 1):
            # Salespeople and customer calculations for 'large customers'
            new_large_customers = math.floor(current_sales_people * 1.5)
            cumulative_large_customers += new_large_customers
            large_customer_revenue = cumulative_large_customers * large_customer_revenue_monthly

            # Marketing and customer calculations for 'small/medium customers'
            marketing_cost = marketing_spend_monthly
            
            # Use marketing-driven customer acquisition
            sales_inquiries = assumptions.get("sales_inquiries_per_month", 160)
            conversion_rate = assumptions.get("conversion_rate", 0.45)
            new_smb_customers = math.floor(sales_inquiries * conversion_rate)
            cumulative_small_customers += new_smb_customers
            smb_customer_revenue = cumulative_small_customers * small_customer_revenue_monthly
            
            # Total Revenue Calculation
            total_revenue = large_customer_revenue + smb_customer_revenue

            # Create the monthly projection object
            projection = MonthlyProjection(
                month=month,
                sales_people=current_sales_people,
                large_customers_acquired=new_large_customers,
                large_customers_cumulative=cumulative_large_customers,
                large_customer_revenue=large_customer_revenue,
                small_customers_acquired=new_smb_customers,
                small_customers_cumulative=cumulative_small_customers,
                small_customer_revenue=smb_customer_revenue,
                marketing_spend=marketing_cost,
                total_revenue=total_revenue
            )
            projections.append(projection)

            # Update state for next month
            current_sales_people += sales_people_growth_rate

        return projections
