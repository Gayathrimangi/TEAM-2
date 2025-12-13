import os
import re
import json
import logging
import random
import requests
import uvicorn
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from uuid import uuid4
from dotenv import load_dotenv
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Global ML Objects ---
rf_model = None
explainer = None
project_data = None
edna_model_instance = None # Lazy load
feature_names = ["Salinity_PSU", "pH", "Depth_m", "Temperature_C"]
target_name = "Biodiversity_Index"

# --- Pydantic Models ---
class Message(BaseModel):
    role: str
    content: str
    
class EDNARequest(BaseModel):
    sequences: List[str]

class EDNAResult(BaseModel):
    sequence_snippet: str
    predicted_taxa: str
    confidence: float


class ChatRequest(BaseModel):
    messages: List[Message]
    sessionId: str

class ExplanationFeature(BaseModel):
    name: str
    value: float
    color: str

class ExplanationData(BaseModel):
    type: str # "shap"
    features: List[ExplanationFeature]

class ChatResponse(BaseModel):
    content: str
    confidence: Optional[float] = None
    provenance: Optional[str] = None
    explanation: Optional[ExplanationData] = None

# --- ML Training ---
def train_model():
    global rf_model, explainer, project_data
    try:
        logger.info("Loading project data...")
        # Load synthetic data
        try:
            df = pd.read_csv("backend/sagar_data.csv")
        except FileNotFoundError:
             # Fallback if file missing
             logger.warning("sagar_data.csv not found, creating in-memory.")
             data = {
                 "Salinity_PSU": np.random.normal(35, 1, 100),
                 "pH": np.random.normal(8.0, 0.2, 100),
                 "Depth_m": np.random.uniform(5, 200, 100),
                 "Temperature_C": np.random.normal(24, 2, 100),
                 "Biodiversity_Index": np.random.uniform(0.4, 0.95, 100)
             }
             df = pd.DataFrame(data)

        project_data = df
        X = df[feature_names]
        y = df[target_name]

        logger.info("Training Random Forest model...")
        rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
        rf_model.fit(X, y)

        logger.info("Initializing SHAP explainer...")
        try:
            import shap
            # Use TreeExplainer for Random Forest
            explainer = shap.TreeExplainer(rf_model)
            logger.info("SHAP explainer initialized.")
        except ImportError:
            logger.warning("SHAP/numba not installed or failed. Using feature_importances fallback.")
            explainer = None
        except Exception as e:
            logger.warning(f"SHAP initialization failed: {e}")
            explainer = None

    except Exception as e:
        logger.error(f"Error during model training: {e}")

# Train on startup
train_model()

# --- Helper Functions ---

def get_gemini_response(history: List[Message]) -> str:
    """Call Google Gemini API via REST"""
    api_key = os.getenv("VITE_GEMINI_API_KEY") 
    # Fallback/Check for key
    if not api_key:
        api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        return "System Warning: Gemini API Key not configured."

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={api_key}"
    
    # Convert messages to Gemini format
    contents = []
    for m in history:
        role = "model" if m.role == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": m.content}]})

    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 800
        }
    }

    try:
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        response.raise_for_status()
        data = response.json()
        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        return text if text else "I couldn't generate a response."
    except Exception as e:
        logger.error(f"Gemini API Error: {e}")
        return "I am currently unable to reach the Google Gemini knowledge base."

def extract_features_from_query(query: str) -> dict:
    """Extract numerical values for features from query string"""
    # Defaults (Mean values)
    features = {
        "Salinity_PSU": 35.0,
        "pH": 8.1,
        "Depth_m": 50.0,
        "Temperature_C": 24.0
    }
    
    # Simple regex extraction (very basic)
    # searches for "salinity 34", "depth 100", etc.
    if match := re.search(r"salinity\s*(\d+\.?\d*)", query, re.IGNORECASE):
        features["Salinity_PSU"] = float(match.group(1))
    if match := re.search(r"ph\s*(\d+\.?\d*)", query, re.IGNORECASE):
        features["pH"] = float(match.group(1))
    if match := re.search(r"depth\s*(\d+\.?\d*)", query, re.IGNORECASE):
        features["Depth_m"] = float(match.group(1))
    if match := re.search(r"temp\w*\s*(\d+\.?\d*)", query, re.IGNORECASE):
        features["Temperature_C"] = float(match.group(1))
        
    return features


PROJECT_KEYWORDS = ["station", "project", "data", "analysis", "sample", "sagar", "biodiversity", "species", "predict", "forecast", "salinity", "depth"]

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        last_message = request.messages[-1].content
        history = request.messages[:-1]
        
        # 1. Greeting Check (Fast Logic, No API needed)
        GREETINGS = ["hello", "hi", "hey", "greetings", "good morning", "good evening"]
        if any(g == last_message.lower().strip() for g in GREETINGS):
            return ChatResponse(
                content="Hello there! I am SeaSage, fully operational and ready to analyze your marine data. You can ask me to analyze specific stations or project metrics.",
                confidence=1.0,
                provenance="System",
                explanation=None
            )

        # 2. Router Logic
        is_project_query = any(k in last_message.lower() for k in PROJECT_KEYWORDS)
        
        if is_project_query and rf_model:
            logger.info(f"Routing to PROJECT path: {last_message}")
            
            # Prepare input features
            features_dict = extract_features_from_query(last_message)
            input_df = pd.DataFrame([features_dict]) # 1 row
            
            # Predict
            prediction = rf_model.predict(input_df)[0]
            
            # Explain
            explanation_data = None
            if explainer:
                try:
                    shap_values = explainer.shap_values(input_df)
                    # shap_values is typically [1, num_features] or a list for classification
                    # For regression, it's just array
                    if hasattr(shap_values, 'tolist'): # Check if numpy
                         sv = shap_values[0] # first row
                    else: 
                         sv = shap_values # fallback
                    
                    # Format for frontend
                    features_list = []
                    for name, value in zip(feature_names, sv):
                         color = "#0ea5e9" if value > 0 else "#ef4444" # Blue pos, Red neg
                         features_list.append({"name": name, "value": float(value), "color": color})
                    
                    # Sort by absolute impact
                    features_list.sort(key=lambda x: abs(x["value"]), reverse=True)
                    
                    explanation_data = ExplanationData(type="shap", features=features_list)
                except Exception as e:
                    logger.error(f"SHAP Error: {e}")
            
            response_text = (
                f"Based on the project data (SAGAR), the predicted Biodiversity Index is **{prediction:.2f}**.\n\n"
                f"**Input Parameters**:\n"
                f"- Salinity: {features_dict['Salinity_PSU']} PSU\n"
                f"- pH: {features_dict['pH']}\n"
                f"- Depth: {features_dict['Depth_m']}m\n\n"
                f"I have analyzed the feature contributions below."
            )
            
            return ChatResponse(
                content=response_text,
                confidence=0.95,
                provenance="SAGAR Random Forest v1.0",
                explanation=explanation_data
            )

        else:
            logger.info(f"Routing to GENERAL path: {last_message}")
            # Call Gemini
            gemini_text = get_gemini_response(request.messages)
            return ChatResponse(
                content=gemini_text,
                confidence=0.8,
                provenance="Google Gemini Pro",
                explanation=None
            )
            
    except Exception as e:
        logger.error(f"Critical Backend Error: {e}")
        # Return a graceful error instead of 500
        return ChatResponse(
            content="I encountered a system error while processing your request. However, I am still running. Please try asking about 'salinity' or 'stations' to access the offline project database.",
            confidence=0.0,
            provenance="System Recovery",
            explanation=None
        )

@app.post("/analyze-edna")
async def analyze_edna(request: EDNARequest):
    """
    Analyze eDNA sequences using the DNABERT model.
    """
    global edna_model_instance
    try:
        from models.edna_bert import get_model
        
        # Initialize model on first request to save startup time
        if edna_model_instance is None:
            edna_model_instance = get_model()
            
        if not edna_model_instance:
             raise HTTPException(status_code=500, detail="eDNA Model failed to initialize.")
             
        results = edna_model_instance.predict(request.sequences)
        return results
        
    except Exception as e:
        logger.error(f"eDNA Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
