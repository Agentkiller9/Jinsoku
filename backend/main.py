import os
import subprocess
import logging
import pathlib  
import shutil 
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional
from urllib.parse import unquote

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dfir-workbench")

# --- Define paths *inside the container* ---
TOOLS_DIR = "/tools"
DATA_DIR = "/data"
RESULTS_DIR = "/data/results"

# Define tool-specific directories
HAYABUSA_DIR = os.path.join(TOOLS_DIR, "hayabusa")
CHAINSAW_DIR = os.path.join(TOOLS_DIR, "chainsaw")
TAKAJO_DIR = os.path.join(TOOLS_DIR, "takajo")

# Define tool paths
HAYABUSA_PATH = os.path.join(HAYABUSA_DIR, "hayabusa")
CHAINSAW_PATH = os.path.join(CHAINSAW_DIR, "chainsaw")
TAKAJO_PATH = os.path.join(TAKAJO_DIR, "takajo")

# --- FastAPI App Initialization ---
app = FastAPI(title="DFIR Workbench API")

# --- CORS Middleware ---
origins = [
    "http://localhost",
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models (Type Hinting) ---
class ToolCheckResponse(BaseModel):
    name: str
    exists: bool
    path: str

class AnalysisRequest(BaseModel):
    log_file: str

# NEW model for Hayabusa search
class HayabusaSearchRequest(BaseModel):
    log_file: str
    keyword: str

class TakajoRequest(BaseModel):
    hayabusa_report_file: str # This will be the .jsonl file

class AnalysisResponse(BaseModel):
    message: str
    output_location: str 
    tool: str
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    command_run: str
    generated_files: Optional[List[str]] = None

class AnalysisErrorDetail(BaseModel):
    message: str
    stdout: Optional[str] = None
    stderr: Optional[str] = None

class AnalysisError(BaseModel):
    detail: AnalysisErrorDetail


# --- API Endpoints ---

@app.get("/", summary="API Health Check")
def read_root():
    """Simple health check endpoint."""
    return {"message": "DFIR Workbench API is running"}

@app.get("/tools", summary="Check for Tool Binaries", response_model=List[ToolCheckResponse])
def check_tools():
    """Checks if the required tool binaries exist in the /tools volume."""
    tools = [
        {"name": "Hayabusa", "path": HAYABUSA_PATH},
        {"name": "Chainsaw", "path": CHAINSAW_PATH},
        {"name": "Takajo", "path": TAKAJO_PATH},
    ]
    
    response = []
    for tool in tools:
        exists = os.path.exists(tool["path"])
        if not exists:
            logger.warning(f"Tool not found at: {tool['path']}")
        response.append(ToolCheckResponse(name=tool["name"], exists=exists, path=tool["path"]))
    return response

@app.get("/logs", summary="List Log Files", response_model=List[str])
def get_logs():
    """Scans the /data directory and returns a list of files."""
    if not os.path.exists(DATA_DIR):
        logger.error(f"Data directory not found: {DATA_DIR}")
        return []
    
    try:
        all_files = [f for f in os.listdir(DATA_DIR) if os.path.isfile(os.path.join(DATA_DIR, f))]
        valid_logs = [f for f in all_files if f != '.gitkeep']
        return valid_logs
    except Exception as e:
        logger.error(f"Error reading /data directory: {e}")
        return []

# --- NEW: Endpoint to list results ---
@app.get("/logs/results", summary="List Result Files", response_model=List[str])
def get_result_logs():
    """Scans the /data/results directory and returns a list of files."""
    if not os.path.exists(RESULTS_DIR):
        logger.error(f"Results directory not found: {RESULTS_DIR}")
        return []
    
    try:
        all_files = [f for f in os.listdir(RESULTS_DIR) if os.path.isfile(os.path.join(RESULTS_DIR, f))]
        valid_files = [f for f in all_files if f != '.gitkeep']
        return valid_files
    except Exception as e:
        logger.error(f"Error reading /data/results directory: {e}")
        return []

# --- Endpoint for CSV/TXT files (as text) ---
@app.get("/results_file/{analysis_directory}/{file_name:path}", summary="Get a Takajo result file as text")
async def get_result_file(analysis_directory: str, file_name: str):
    """
    Securely serves a file from a Takajo analysis directory as text/plain.
    """
    try:
        analysis_directory = unquote(analysis_directory)
        file_name = unquote(file_name)

        base_path = pathlib.Path(RESULTS_DIR).resolve()
        analysis_path = base_path.joinpath(analysis_directory).resolve()
        file_path = analysis_path.joinpath(file_name).resolve()

        if base_path not in analysis_path.parents or base_path not in file_path.parents:
            logger.error(f"Directory traversal attempt blocked: {analysis_directory}/{file_name}")
            raise HTTPException(status_code=403, detail="Forbidden")
        
        if not file_path.is_file():
            logger.error(f"File not found: {file_path}")
            raise HTTPException(status_code=404, detail="File not found")

        return FileResponse(path=file_path, media_type='text/plain', filename=file_name)

    except Exception as e:
        logger.error(f"Error serving file: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

# --- NEW: Endpoint for JSONL files (as JSON) ---
@app.get("/results_file_json/{file_name:path}", summary="Get a JSONL result file as JSON")
async def get_result_file_json(file_name: str):
    """
    Securely reads a JSONL file from the results directory, parses it,
    and returns it as a single JSON array.
    """
    try:
        file_name = unquote(file_name)

        base_path = pathlib.Path(RESULTS_DIR).resolve()
        file_path = base_path.joinpath(file_name).resolve()

        if base_path not in file_path.parents:
            logger.error(f"Directory traversal attempt blocked: {file_name}")
            raise HTTPException(status_code=403, detail="Forbidden")

        if not file_path.is_file() or not file_name.endsWith('.jsonl'):
            logger.error(f"File not found or not JSONL: {file_path}")
            raise HTTPException(status_code=404, detail="JSONL file not found")
        
        # Read the JSONL file line by line and parse
        json_data = []
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    json_data.append(json.loads(line))
        
        return JSONResponse(content=json_data)

    except Exception as e:
        logger.error(f"Error serving JSONL file: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

# --- Analysis Endpoints ---

@app.post("/analyze/hayabusa", 
          summary="Run Hayabusa Analysis", 
          response_model=AnalysisResponse,
          responses={500: {"model": AnalysisError}})
async def analyze_hayabusa(request: AnalysisRequest):
    """
    Runs Hayabusa's 'json-timeline' command on a specified log file.
    """
    log_file = request.log_file
    log_path = os.path.join(DATA_DIR, log_file)
    output_jsonl = os.path.join(RESULTS_DIR, f"{log_file}-hayabusa-report.jsonl")
    
    if not os.path.exists(HAYABUSA_PATH):
        raise HTTPException(status_code=500, detail={"message": f"Hayabusa binary not found at {HAYABUSA_PATH}"})
    if ".." in log_file or not os.path.isfile(log_path):
        raise HTTPException(status_code=404, detail={"message": f"Log file not found at {log_path}."})

    cmd = [ HAYABUSA_PATH, "json-timeline", "-f", log_path, "-o", output_jsonl, "-L", "--no-wizard" ]
    command_run = " ".join(cmd)
    
    if os.path.exists(output_jsonl):
        logger.info(f"Removing existing report file: {output_jsonl}")
        os.remove(output_jsonl)

    try:
        logger.info(f"Running command: {command_run}")
        result = subprocess.run(cmd, capture_output=True, text=True, check=True, cwd=HAYABUSA_DIR)
        logger.info(f"Hayabusa STDOUT: {result.stdout}")
        
        return AnalysisResponse(
            message=f"Hayabusa analysis complete for {log_file}",
            output_location=output_jsonl,
            tool="Hayabusa",
            stdout=result.stdout,
            stderr=result.stderr,
            command_run=command_run
        )
    except subprocess.CalledProcessError as e:
        logger.error(f"Hayabusa analysis failed: {e.stderr}")
        raise HTTPException(
            status_code=500, 
            detail={"message": "Hayabusa analysis failed.", "stderr": e.stderr, "stdout": e.stdout}
        )

# --- NEW: Hayabusa Search Endpoint ---
@app.post("/analyze/hayabusa/search", 
          summary="Run Hayabusa Search", 
          response_model=AnalysisResponse,
          responses={500: {"model": AnalysisError}})
async def analyze_hayabusa_search(request: HayabusaSearchRequest):
    """
    Runs Hayabusa's 'search' command on a specified log file with a keyword.
    """
    log_file = request.log_file
    keyword = request.keyword
    log_path = os.path.join(DATA_DIR, log_file)
    output_csv = os.path.join(RESULTS_DIR, f"{log_file}-search-{keyword}.csv")
    
    if not os.path.exists(HAYABUSA_PATH):
        raise HTTPException(status_code=500, detail={"message": f"Hayabusa binary not found at {HAYABUSA_PATH}"})
    if ".." in log_file or not os.path.isfile(log_path):
        raise HTTPException(status_code=404, detail={"message": f"Log file not found at {log_path}."})

    # Command from Hayabusa README: `search -f <file> -k <keyword> -o <output.csv>`
    cmd = [ HAYABUSA_PATH, "search", "-f", log_path, "-k", keyword, "-o", output_csv ]
    command_run = " ".join(cmd)
    
    if os.path.exists(output_csv):
        logger.info(f"Removing existing search file: {output_csv}")
        os.remove(output_csv)

    try:
        logger.info(f"Running command: {command_run}")
        result = subprocess.run(cmd, capture_output=True, text=True, check=True, cwd=HAYABUSA_DIR)
        
        # Search stdout is usually the table, which is good.
        logger.info(f"Hayabusa Search STDOUT: {result.stdout}")
        
        return AnalysisResponse(
            message=f"Hayabusa search for '{keyword}' complete on {log_file}",
            output_location=output_csv,
            tool="Hayabusa Search",
            stdout=result.stdout,
            stderr=result.stderr,
            command_run=command_run
        )
    except subprocess.CalledProcessError as e:
        logger.error(f"Hayabusa search failed: {e.stderr}")
        raise HTTPException(
            status_code=500, 
            detail={"message": "Hayabusa search failed.", "stderr": e.stderr, "stdout": e.stdout}
        )

@app.post("/analyze/chainsaw", 
          summary="Run Chainsaw Analysis (Stub)", 
          response_model=AnalysisResponse,
          responses={500: {"model": AnalysisError}})
async def analyze_chainsaw(request: AnalysisRequest):
    """
    A STUB endpoint for running Chainsaw.
    """
    log_file = request.log_file
    log_path = os.path.join(DATA_DIR, log_file)
    output_json = os.path.join(RESULTS_DIR, f"{log_file}-chainsaw-report.json")

    if not os.path.exists(CHAINSAW_PATH):
        raise HTTPException(status_code=500, detail={"message": f"Chainsaw binary not found at {CHAINSAW_PATH}"})
    if ".." in log_file or not os.path.isfile(log_path):
        raise HTTPException(status_code=404, detail={"message": f"Log file not found at {log_path}."})

    cmd = [ CHAINSAW_PATH, "hunt", "-f", log_path, "--json", "-o", output_json, "--no-banner" ]
    command_run = " ".join(cmd)
    
    logger.info(f"Chainsaw STUB: Would run on {log_path} and output to {output_json}")
    
    return AnalysisResponse(
        message=f"Chainsaw analysis STUB executed for {log_file}",
        output_location=output_json,
        tool="Chainsaw",
        stdout="This is a stub. Chainsaw was not actually executed.",
        command_run=command_run
    )


@app.post("/analyze/takajo",
          summary="Run Takajo 'automagic' Analysis",
          response_model=AnalysisResponse,
          responses={500: {"model": AnalysisError}})
async def analyze_takajo(request: TakajoRequest):
    """
    Runs Takajo's 'automagic' command on a Hayabusa JSONL report.
    """
    hayabusa_report_file = request.hayabusa_report_file
    report_path = os.path.abspath(hayabusa_report_file)
    output_directory = report_path.replace("-hayabusa-report.jsonl", "-takajo-analysis")

    if not os.path.exists(TAKAJO_PATH):
        raise HTTPException(status_code=500, detail={"message": f"Takajo binary not found at {TAKAJO_PATH}"})
    if ".." in report_path or not os.path.isfile(report_path):
        raise HTTPException(status_code=404, detail={"message": f"Hayabusa report file (.jsonl) not found."})

    if os.path.exists(output_directory):
        logger.info(f"Removing existing analysis directory: {output_directory}")
        try:
            shutil.rmtree(output_directory)
        except Exception as e:
            logger.error(f"Failed to remove directory: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to remove old analysis directory: {e}")

    cmd = [ TAKAJO_PATH, "automagic", "-t", report_path, "-o", output_directory ]
    command_run = " ".join(cmd)

    try:
        logger.info(f"Running command: {command_run}")
        result = subprocess.run(cmd, capture_output=True, text=True, check=True, cwd=TAKAJO_DIR)
        logger.info(f"Takajo STDOUT: {result.stdout}")

        generated_files = []
        try:
            output_path = pathlib.Path(output_directory)
            if output_path.is_dir():
                for file_path in output_path.rglob('*'):
                    if file_path.is_file():
                        relative_path = file_path.relative_to(output_path)
                        generated_files.append(str(relative_path).replace("\\", "/"))
        except Exception as e:
            logger.error(f"Failed to scan Takajo output directory: {e}")
        
        return AnalysisResponse(
            message=f"Takajo 'automagic' analysis complete for {hayabusa_report_file}",
            output_location=output_directory, 
            tool="Takajo",
            stdout=result.stdout,
            stderr=result.stderr,
            command_run=command_run,
            generated_files=generated_files
        )
    except subprocess.CalledProcessError as e:
        logger.error(f"Takajo analysis failed: {e.stderr}")
        raise HTTPException(
            status_code=500, 
            detail={"message": "Takajo analysis failed.", "stderr": e.stderr, "stdout": e.stdout}
        )