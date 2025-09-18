import uvicorn
import tempfile
import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.services.finance_service import FinanceService
from app.services.excel_service import ExcelService
from app.models.response_models import QueryResponse, HealthResponse

app = FastAPI(
    title="Autonomous Strategic Finance API",
    description="AI-powered financial modeling and forecasting",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
finance_service = FinanceService()
excel_service = ExcelService()

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/")
async def serve_frontend():
    """Serve the frontend application"""
    return FileResponse("app/static/index.html")

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Returns a health status of the API.
    """
    return HealthResponse(status="healthy", message="Autonomous Finance API is running")

@app.get("/api/v1/search", response_model=QueryResponse)
async def search_financial_model(
    query: str = Query(..., description="Natural language query for financial modeling")
):
    """
    Process natural language query and return financial model structure.
    Example: "Create 12-month revenue forecast with 2 sales people, marketing spend $200k/month"
    """
    try:
        result = await finance_service.process_query(query)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing query: {str(e)}")

@app.get("/api/v1/export/excel/{model_id}")
async def export_excel(model_id: str, auto_open: bool = Query(False, description="If true (macOS), open the file after generating")):
    """Export financial model to Excel format"""
    try:
        # Get model data
        model_data = finance_service.get_model_by_id(model_id)
        if not model_data:
            raise HTTPException(status_code=404, detail="Model not found")

        # Generate Excel file
        excel_data = excel_service.generate_excel(model_data)

        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_file:
            tmp_file.write(excel_data)
            tmp_file_path = tmp_file.name

        # Optionally open the file locally (useful during demos on macOS)
        if auto_open:
            try:
                if os.uname().sysname == 'Darwin':
                    os.system(f"open '{tmp_file_path}'")
                elif os.uname().sysname == 'Linux':
                    os.system(f"xdg-open '{tmp_file_path}' >/dev/null 2>&1 &")
                # On Windows, you could use: os.startfile(tmp_file_path)
            except Exception:
                # Ignore auto-open failures and still return the file
                pass

        return FileResponse(
            path=tmp_file_path,
            filename=f"financial_model_{model_id}.xlsx",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating Excel: {str(e)}")

@app.get("/api/v1/revenue-drivers")
async def get_revenue_drivers():
    """Get available revenue drivers from knowledge base"""
    return finance_service.get_available_revenue_drivers()

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)