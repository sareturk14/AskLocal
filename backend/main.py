from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse as StarletteFileResponse
from pydantic import BaseModel
import shutil
import sys
import sqlite3
import json
import math
import openai
from typing import List, Dict, Any
import os
import threading
import time
import psutil
from foundry_local_sdk import Configuration, FoundryLocalManager
try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

def get_project_root():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def get_db_path():
    return os.path.join(get_project_root(), "knowledge_base.db")

DB_PATH = get_db_path()

def get_docs_dir():
    path = os.path.join(get_project_root(), "documents")
    if not os.path.exists(path):
        os.makedirs(path, exist_ok=True)
    return path

app = FastAPI(title="Local RAG API", description="FastAPI Backend for local RAG chatbot using Microsoft Foundry Local")

# Enable CORS for React frontend (default Vite port is 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development we can allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for Foundry resources
manager = None
embedding_client = None
local_client = None
chat_alias = "phi-3.5-mini"
embedding_alias = "qwen3-embedding-0.6b"

# Global download state
download_state = {
    "status": "idle",       # "idle", "downloading", "success", "error", "cancelled"
    "model_alias": None,
    "progress": 0.0,
    "downloaded_mb": 0.0,
    "total_mb": 0.0,
    "speed": "",
    "error": None
}
download_cancel_event = None
download_lock = threading.Lock()

indexing_states = {}
indexing_states_lock = threading.Lock()

# Startup state for first-time runs
startup_state = {
    "status": "initializing",  # "initializing", "ready", "error"
    "current_step": "Starting backend initialization...",
    "model_alias": None,
    "progress": 0.0,
    "downloaded_mb": 0.0,
    "total_mb": 0.0,
    "speed": "",
    "error": None
}
startup_lock = threading.Lock()



# Similarity calculation function
def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if HAS_NUMPY:
        arr1 = np.array(v1, dtype=np.float32)
        arr2 = np.array(v2, dtype=np.float32)
        dot_product = np.dot(arr1, arr2)
        norm_v1 = np.linalg.norm(arr1)
        norm_v2 = np.linalg.norm(arr2)
        if not norm_v1 or not norm_v2:
            return 0.0
        return float(dot_product / (norm_v1 * norm_v2))
    else:
        dot_product = sum(x * y for x, y in zip(v1, v2))
        norm_v1 = math.sqrt(sum(x * x for x in v1))
        norm_v2 = math.sqrt(sum(x * x for x in v2))
        if not norm_v1 or not norm_v2:
            return 0.0
        return dot_product / (norm_v1 * norm_v2)

def get_db_settings() -> Dict[str, Any]:
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM settings")
        rows = cursor.fetchall()
        conn.close()
        
        settings = {
            "top_k": 3,
            "similarity_threshold": 0.15,
            "strict_mode": True
        }
        for k, v in rows:
            if k == "top_k":
                settings["top_k"] = int(v)
            elif k == "similarity_threshold":
                settings["similarity_threshold"] = float(v)
            elif k == "strict_mode":
                settings["strict_mode"] = v == "1"
        return settings
    except Exception:
        return {
            "top_k": 3,
            "similarity_threshold": 0.15,
            "strict_mode": True
        }

def initialize_system_in_background():
    global manager, embedding_client, local_client, startup_state, chat_alias, embedding_alias
    
    try:
        # Step 1: Initialize SDK
        with startup_lock:
            startup_state["status"] = "initializing"
            startup_state["current_step"] = "Initializing Microsoft Foundry Local SDK..."
            startup_state["progress"] = 10.0
            
        config = Configuration(app_name="local_rag_app")
        try:
            FoundryLocalManager.initialize(config)
        except Exception as e:
            print(f"DEBUG ERROR during initialize: {e}")
            import traceback
            traceback.print_exc()
        manager = FoundryLocalManager.instance
        print(f"DEBUG manager instance: {manager}")
        
        # Step 2: Load or download embedding model
        with startup_lock:
            startup_state["current_step"] = f"Checking embedding model: {embedding_alias}..."
            startup_state["progress"] = 20.0
            
        embed_model = manager.catalog.get_model(embedding_alias)
        if not embed_model.is_cached:
            file_size_mb = 0
            if hasattr(embed_model, 'info') and embed_model.info:
                file_size_mb = getattr(embed_model.info, 'file_size_mb', 0) or 0
                
            last_time = [time.time()]
            last_net_bytes = [psutil.net_io_counters().bytes_recv]
            start_net_bytes = last_net_bytes[0]
            
            with startup_lock:
                startup_state["model_alias"] = embedding_alias
                startup_state["current_step"] = f"Downloading default embedding model: {embedding_alias}..."
                startup_state["downloaded_mb"] = 0.0
                startup_state["total_mb"] = file_size_mb
                startup_state["speed"] = "0 KB/s"
                
            def embed_progress(val):
                with startup_lock:
                    percentage = min(round(val, 2), 100.0)
                    startup_state["progress"] = round(20.0 + (percentage * 0.3), 1)
                    
                    # Calculate download speed and MB downloaded
                    current_time = time.time()
                    delta_time = current_time - last_time[0]
                    current_net_total = psutil.net_io_counters().bytes_recv
                    actual_downloaded_bytes = current_net_total - start_net_bytes
                    actual_downloaded_mb = actual_downloaded_bytes / (1024 * 1024)
                    
                    if file_size_mb > 0:
                        total_mb = file_size_mb
                        downloaded_mb = (percentage / 100.0) * file_size_mb
                    else:
                        if percentage > 0:
                            total_mb = (actual_downloaded_mb / percentage) * 100.0
                        else:
                            total_mb = 0
                        downloaded_mb = actual_downloaded_mb
                        
                    startup_state["downloaded_mb"] = round(downloaded_mb, 2)
                    startup_state["total_mb"] = round(total_mb, 2)
                    
                    if delta_time >= 0.5:
                        delta_bytes = current_net_total - last_net_bytes[0]
                        speed_mb_s = (delta_bytes / delta_time) / (1024 * 1024) if delta_time > 0 else 0
                        if speed_mb_s >= 1.0:
                            startup_state["speed"] = f"{round(speed_mb_s, 1)} MB/s"
                        else:
                            startup_state["speed"] = f"{round(speed_mb_s * 1024, 0):.0f} KB/s"
                        last_time[0] = current_time
                        last_net_bytes[0] = current_net_total
            
            embed_model.download(progress_callback=embed_progress)
            
        with startup_lock:
            startup_state["current_step"] = f"Loading embedding model: {embedding_alias}..."
            startup_state["progress"] = 50.0
            
        embed_model.load()
        embedding_client = embed_model.get_embedding_client()
        
        # Step 3: Load or download chat model
        with startup_lock:
            startup_state["current_step"] = f"Checking chat model: {chat_alias}..."
            startup_state["progress"] = 60.0
            
        chat_model = manager.catalog.get_model(chat_alias)
        if not chat_model.is_cached:
            file_size_mb = 0
            if hasattr(chat_model, 'info') and chat_model.info:
                file_size_mb = getattr(chat_model.info, 'file_size_mb', 0) or 0
                
            last_time = [time.time()]
            last_net_bytes = [psutil.net_io_counters().bytes_recv]
            start_net_bytes = last_net_bytes[0]
            
            with startup_lock:
                startup_state["model_alias"] = chat_alias
                startup_state["current_step"] = f"Downloading default chat model: {chat_alias}..."
                startup_state["downloaded_mb"] = 0.0
                startup_state["total_mb"] = file_size_mb
                startup_state["speed"] = "0 KB/s"
                
            def chat_progress(val):
                with startup_lock:
                    percentage = min(round(val, 2), 100.0)
                    startup_state["progress"] = round(60.0 + (percentage * 0.3), 1)
                    
                    # Calculate download speed and MB downloaded
                    current_time = time.time()
                    delta_time = current_time - last_time[0]
                    current_net_total = psutil.net_io_counters().bytes_recv
                    actual_downloaded_bytes = current_net_total - start_net_bytes
                    actual_downloaded_mb = actual_downloaded_bytes / (1024 * 1024)
                    
                    if file_size_mb > 0:
                        total_mb = file_size_mb
                        downloaded_mb = (percentage / 100.0) * file_size_mb
                    else:
                        if percentage > 0:
                            total_mb = (actual_downloaded_mb / percentage) * 100.0
                        else:
                            total_mb = 0
                        downloaded_mb = actual_downloaded_mb
                        
                    startup_state["downloaded_mb"] = round(downloaded_mb, 2)
                    startup_state["total_mb"] = round(total_mb, 2)
                    
                    if delta_time >= 0.5:
                        delta_bytes = current_net_total - last_net_bytes[0]
                        speed_mb_s = (delta_bytes / delta_time) / (1024 * 1024) if delta_time > 0 else 0
                        if speed_mb_s >= 1.0:
                            startup_state["speed"] = f"{round(speed_mb_s, 1)} MB/s"
                        else:
                            startup_state["speed"] = f"{round(speed_mb_s * 1024, 0):.0f} KB/s"
                        last_time[0] = current_time
                        last_net_bytes[0] = current_net_total
            
            chat_model.download(progress_callback=chat_progress)
            
        with startup_lock:
            startup_state["current_step"] = f"Loading chat model: {chat_alias}..."
            startup_state["progress"] = 90.0
            
        chat_model.load()
        
        # Start web service
        with startup_lock:
            startup_state["current_step"] = "Starting local web service..."
            startup_state["progress"] = 95.0
            
        try:
            manager.start_web_service()
        except Exception:
            # Already running
            pass
            
        local_url = manager.urls[0]
        local_client = openai.OpenAI(
            base_url=f"{local_url}/v1",
            api_key="local-key"
        )
        
        with startup_lock:
            startup_state["status"] = "ready"
            startup_state["current_step"] = "System is ready!"
            startup_state["progress"] = 100.0
            
        print("Foundry Local initialized successfully!")
    except Exception as e:
        import traceback
        traceback.print_exc()
        with startup_lock:
            startup_state["status"] = "error"
            startup_state["current_step"] = f"Initialization failed: {str(e)}"
            startup_state["error"] = str(e)

# Start models and local web service on startup
@app.on_event("startup")
def startup_event():
    try:
        # Initialize SQLite tables synchronously (takes <2ms, completely safe)
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                title TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_pinned INTEGER DEFAULT 0
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                role TEXT,
                content TEXT,
                context TEXT,
                score REAL,
                file_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS document_metadata (
                file_name TEXT PRIMARY KEY,
                is_pinned INTEGER DEFAULT 0
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT,
                embedding TEXT,
                file_name TEXT,
                embedding_model TEXT
            )
        """)
        
        # Create settings table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)
        cursor.execute("SELECT COUNT(*) FROM settings")
        if cursor.fetchone()[0] == 0:
            cursor.execute("INSERT INTO settings (key, value) VALUES (?, ?)", ("top_k", "3"))
            cursor.execute("INSERT INTO settings (key, value) VALUES (?, ?)", ("similarity_threshold", "0.15"))
            cursor.execute("INSERT INTO settings (key, value) VALUES (?, ?)", ("strict_mode", "1"))
        
        # Migrations for existing DB instances
        try:
            cursor.execute("ALTER TABLE sessions ADD COLUMN is_pinned INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass # Already exists
            
        try:
            cursor.execute("ALTER TABLE documents ADD COLUMN embedding_model TEXT")
        except sqlite3.OperationalError:
            pass # Already exists
            
        # Update existing records to default embedding model if empty
        cursor.execute("UPDATE documents SET embedding_model = 'qwen3-embedding-8b' WHERE embedding_model IS NULL OR embedding_model = ''")
            
        conn.commit()
        conn.close()

        # Start model downloads and loading in background thread
        thread = threading.Thread(target=initialize_system_in_background)
        thread.daemon = True
        thread.start()



    except Exception as e:
        print(f"Error during startup initialization: {e}")

# Shutdown hook to stop service
@app.on_event("shutdown")
def shutdown_event():
    global manager
    if manager:
        print("Stopping local web service...")
        try:
            manager.stop_web_service()
        except Exception:
            pass

# Request models
class ChatRequest(BaseModel):
    question: str
    target_file: str = None
    excluded_files: List[str] = []

class FileResponse(BaseModel):
    file_name: str
    chunks_count: int
    is_pinned: bool
    embedding_model: str
    is_compatible: bool
    max_id: int = 0

class ModelSelectRequest(BaseModel):
    chat_model: str = None
    embedding_model: str = None

class ModelDeleteRequest(BaseModel):
    model_alias: str

class ReindexRequest(BaseModel):
    filename: str

class SettingsUpdateRequest(BaseModel):
    top_k: int = None
    similarity_threshold: float = None
    strict_mode: bool = None

@app.get("/api/status")
def get_status():
    return {
        "status": "ready",
        "chat_model": chat_alias,
        "embedding_model": embedding_alias,
        "api_endpoint": manager.urls[0] if manager and manager.urls else None
    }

@app.get("/api/startup-status")
def get_startup_status():
    global startup_state
    with startup_lock:
        return startup_state


@app.get("/api/models")
def get_models():
    global manager
    if not manager:
        raise HTTPException(status_code=503, detail="Foundry Local not initialized.")
    try:
        models = manager.catalog.list_models()
        model_list = []
        for m in models:
            capabilities = getattr(m, 'capabilities', '')
            input_modalities = getattr(m, 'input_modalities', '')
            
            # Extract file size in MB
            file_size_mb = 0
            if hasattr(m, 'info') and m.info:
                file_size_mb = getattr(m.info, 'file_size_mb', 0) or 0
            
            if 'embedding' in capabilities:
                model_type = "embedding"
            elif 'reasoning' in capabilities or 'tool-calling' in capabilities or 'text' in input_modalities:
                model_type = "chat"
            else:
                model_type = "other"
                
            model_list.append({
                "alias": getattr(m, 'alias', ''),
                "id": getattr(m, 'id', ''),
                "capabilities": capabilities,
                "input_modalities": input_modalities,
                "is_cached": bool(getattr(m, 'is_cached', False)),
                "is_loaded": bool(getattr(m, 'is_loaded', False)),
                "file_size_mb": file_size_mb,
                "type": model_type
            })
        return {"models": model_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def run_model_download_in_background(model_alias, chat_or_embed):
    global download_state, download_cancel_event, embedding_client, local_client, chat_alias, embedding_alias, manager
    
    # Initialize download variables
    cancel_event = threading.Event()
    with download_lock:
        download_cancel_event = cancel_event
        download_state = {
            "status": "downloading",
            "model_alias": model_alias,
            "progress": 0.0,
            "downloaded_mb": 0.0,
            "total_mb": 0.0,
            "speed": "0 KB/s",
            "error": None
        }
    
    try:
        model = manager.catalog.get_model(model_alias)
        
        # Get the real file size from the SDK catalog, default to 0 (unknown)
        file_size_mb = 0
        if hasattr(model, 'info') and model.info:
            file_size_mb = getattr(model.info, 'file_size_mb', 0) or 0
            
        last_time = [time.time()]
        last_net_bytes = [psutil.net_io_counters().bytes_recv]
        start_net_bytes = last_net_bytes[0]
        
        def progress_callback(progress_value):
            global download_state
            current_time = time.time()
            delta_time = current_time - last_time[0]
            
            with download_lock:
                if download_state["status"] == "downloading":
                    # SDK always returns 0.0-100.0 percentage
                    percentage = min(round(progress_value, 2), 100.0)
                    
                    # Calculate downloaded bytes from actual network traffic for accuracy
                    current_net_total = psutil.net_io_counters().bytes_recv
                    actual_downloaded_bytes = current_net_total - start_net_bytes
                    actual_downloaded_mb = actual_downloaded_bytes / (1024 * 1024)
                    
                    # Determine total_mb: use SDK value if available, else estimate from progress
                    if file_size_mb > 0:
                        total_mb = file_size_mb
                        # Use percentage-based downloaded_mb for consistency with the progress bar
                        downloaded_mb = (percentage / 100.0) * file_size_mb
                    else:
                        # No SDK file size - estimate from actual network data and progress
                        if percentage > 0:
                            total_mb = (actual_downloaded_mb / percentage) * 100.0
                        else:
                            total_mb = 0
                        downloaded_mb = actual_downloaded_mb
                        
                    download_state["progress"] = percentage
                    download_state["downloaded_mb"] = round(downloaded_mb, 2)
                    download_state["total_mb"] = round(total_mb, 2)
                    
                    if delta_time >= 0.5:
                        current_net_bytes = psutil.net_io_counters().bytes_recv
                        delta_bytes = current_net_bytes - last_net_bytes[0]
                        
                        speed_mb_s = (delta_bytes / delta_time) / (1024 * 1024) if delta_time > 0 else 0
                        if speed_mb_s >= 1.0:
                            download_state["speed"] = f"{round(speed_mb_s, 1)} MB/s"
                        else:
                            download_state["speed"] = f"{round(speed_mb_s * 1024, 0):.0f} KB/s"
                        
                        last_time[0] = current_time
                        last_net_bytes[0] = current_net_bytes
                    
        # Start download
        model.download(progress_callback=progress_callback, cancel_event=cancel_event)
        
        # If cancelled, check event
        if cancel_event.is_set():
            raise Exception("Operation cancelled")
            
        # Load the model after downloading
        model.load()
        
        # Post-load initialization
        if chat_or_embed == "chat":
            # Unload old model
            try:
                old_chat_model = manager.catalog.get_model(chat_alias)
                old_chat_model.unload()
            except Exception:
                pass
            chat_alias = model_alias
            
            # Recreate OpenAI local client
            local_url = manager.urls[0]
            local_client = openai.OpenAI(
                base_url=f"{local_url}/v1",
                api_key="local-key"
            )
        else:
            # Unload old model
            try:
                old_embed_model = manager.catalog.get_model(embedding_alias)
                old_embed_model.unload()
            except Exception:
                pass
            embedding_alias = model_alias
            embedding_client = model.get_embedding_client()
            
        with download_lock:
            download_state["status"] = "success"
            download_state["progress"] = 100.0
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        
        err_msg = str(e)
        status = "error"
        if "cancelled" in err_msg.lower() or cancel_event.is_set():
            status = "cancelled"
            err_msg = "Download cancelled by user."
            
        with download_lock:
            download_state["status"] = status
            download_state["error"] = err_msg
            
        # Clean up partial download files from cache
        try:
            print(f"Cleaning up partial download files for {model_alias}...")
            model = manager.catalog.get_model(model_alias)
            
            # Retry deletion on Windows due to asynchronous file locks
            deleted = False
            for i in range(5):
                try:
                    time.sleep(0.5)
                    model.remove_from_cache()
                    deleted = True
                    print(f"Successfully cleaned up cache for {model_alias} via SDK.")
                    break
                except Exception as del_err:
                    print(f"SDK deletion attempt {i+1} failed: {del_err}")
            
            if not deleted and hasattr(model, 'get_path'):
                model_path = model.get_path()
                if model_path:
                    # Let's delete the version directory or the parent model name directory
                    parent_path = os.path.dirname(model_path)
                    if os.path.exists(parent_path):
                        for i in range(5):
                            try:
                                time.sleep(0.5)
                                shutil.rmtree(parent_path)
                                print(f"Manually cleaned up model folder: {parent_path}")
                                break
                            except Exception as manual_del_err:
                                print(f"Manual deletion attempt {i+1} failed: {manual_del_err}")
        except Exception as cleanup_err:
            print(f"Failed to clean up partial cache: {cleanup_err}")
            
    finally:
        with download_lock:
            download_cancel_event = None

@app.get("/api/models/download-status")
def get_download_status():
    global download_state
    with download_lock:
        return download_state

@app.post("/api/models/download-cancel")
def cancel_download():
    global download_cancel_event, download_state
    with download_lock:
        if download_state["status"] == "downloading" and download_cancel_event:
            print("Cancelling download...")
            download_cancel_event.set()
            return {"status": "success", "message": "Cancellation request sent."}
        else:
            return {"status": "error", "message": "No active download to cancel."}

@app.post("/api/models/delete")
def delete_model(request: ModelDeleteRequest):
    global manager, chat_alias, embedding_alias
    if not manager:
        raise HTTPException(status_code=503, detail="Foundry Local not initialized.")
    try:
        alias = request.model_alias
        # Protect default models
        defaults = ["phi-3.5-mini", "qwen3-embedding-8b", "qwen3-embedding-0.6b"]
        if alias in defaults:
            raise HTTPException(status_code=400, detail="Cannot delete default system models.")
            
        # Protect active models
        if alias == chat_alias or alias == embedding_alias:
            raise HTTPException(status_code=400, detail="Cannot delete a model that is currently active and loaded.")
            
        model = manager.catalog.get_model(alias)
        if not model.is_cached:
            raise HTTPException(status_code=400, detail="Model is not cached locally.")
            
        # Unload if loaded
        try:
            model.unload()
        except Exception:
            pass
            
        model.remove_from_cache()
        return {"status": "success", "message": f"Model {alias} removed from local cache."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/models/select")
def select_models(request: ModelSelectRequest):
    global manager, embedding_client, local_client, chat_alias, embedding_alias, download_state
    if not manager:
        raise HTTPException(status_code=503, detail="Foundry Local not initialized.")
        
    try:
        # Check if a download is already in progress
        with download_lock:
            if download_state["status"] == "downloading":
                raise HTTPException(status_code=400, detail=f"Another download is already in progress: {download_state['model_alias']}")
                
        # Load embedding model if requested and different
        if request.embedding_model and request.embedding_model != embedding_alias:
            print(f"Switching embedding model to: {request.embedding_model}")
            new_embed_model = manager.catalog.get_model(request.embedding_model)
            if not new_embed_model.is_cached:
                print(f"Embedding model not cached. Starting background download: {request.embedding_model}")
                thread = threading.Thread(
                    target=run_model_download_in_background,
                    args=(request.embedding_model, "embedding")
                )
                thread.daemon = True
                thread.start()
                return {
                    "status": "downloading",
                    "chat_model": chat_alias,
                    "embedding_model": embedding_alias
                }
            else:
                new_embed_model.load()
                new_embedding_client = new_embed_model.get_embedding_client()
                
                # Unload old model
                try:
                    old_embed_model = manager.catalog.get_model(embedding_alias)
                    old_embed_model.unload()
                except Exception as e:
                    print(f"Error unloading old embedding model: {e}")
                    
                embedding_alias = request.embedding_model
                embedding_client = new_embedding_client
                
        # Load chat model if requested and different
        if request.chat_model and request.chat_model != chat_alias:
            print(f"Switching chat model to: {request.chat_model}")
            new_chat_model = manager.catalog.get_model(request.chat_model)
            if not new_chat_model.is_cached:
                print(f"Chat model not cached. Starting background download: {request.chat_model}")
                thread = threading.Thread(
                    target=run_model_download_in_background,
                    args=(request.chat_model, "chat")
                )
                thread.daemon = True
                thread.start()
                return {
                    "status": "downloading",
                    "chat_model": chat_alias,
                    "embedding_model": embedding_alias
                }
            else:
                new_chat_model.load()
                
                # Unload old model
                try:
                    old_chat_model = manager.catalog.get_model(chat_alias)
                    old_chat_model.unload()
                except Exception as e:
                    print(f"Error unloading old chat model: {e}")
                    
                chat_alias = request.chat_model
                
                # Recreate local_client openAI instance to make sure base URL or model configuration is fresh
                local_url = manager.urls[0]
                local_client = openai.OpenAI(
                    base_url=f"{local_url}/v1",
                    api_key="local-key"
                )
                
        return {
            "status": "success",
            "chat_model": chat_alias,
            "embedding_model": embedding_alias
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents", response_model=List[FileResponse])
def get_documents():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get pinned metadata
        cursor.execute("SELECT file_name, is_pinned FROM document_metadata")
        pinned_map = {r[0]: bool(r[1]) for r in cursor.fetchall()}
        
        # Get all chunk counts grouped by file and model, also getting MAX(id) to know upload order
        cursor.execute("""
            SELECT file_name, embedding_model, COUNT(id), MAX(id)
            FROM documents
            WHERE file_name IS NOT NULL
            GROUP BY file_name, embedding_model
        """)
        rows = cursor.fetchall()
        conn.close()
        
        # Group by file_name
        files_dict = {}
        for file_name, model, count, max_chunk_id in rows:
            if file_name not in files_dict:
                files_dict[file_name] = {
                    "file_name": file_name,
                    "models": [],
                    "active_chunks": 0,
                    "is_compatible": False,
                    "max_id": max_chunk_id or 0
                }
            else:
                if max_chunk_id and max_chunk_id > files_dict[file_name]["max_id"]:
                    files_dict[file_name]["max_id"] = max_chunk_id

            if model:
                files_dict[file_name]["models"].append(model)
                if model == embedding_alias:
                    files_dict[file_name]["active_chunks"] = count
                    files_dict[file_name]["is_compatible"] = True

        # Convert to FileResponse list
        file_list = []
        for file_name, info in files_dict.items():
            # If compatible with active model, show active chunk count, else show total or count of first model
            chunks_count = info["active_chunks"] if info["is_compatible"] else (rows[0][2] if rows else 0)
            models_str = ", ".join(info["models"]) if info["models"] else "None"
            
            file_list.append({
                "file_name": file_name,
                "chunks_count": chunks_count,
                "is_pinned": pinned_map.get(file_name, False),
                "embedding_model": models_str,
                "is_compatible": info["is_compatible"],
                "max_id": info["max_id"]
            })
            
        # Sort: pinned first, then filename
        file_list.sort(key=lambda x: (not x["is_pinned"], x["file_name"].lower()))
        return file_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/chat")
def chat_endpoint(request: ChatRequest):
    global embedding_client, local_client
    if not embedding_client or not local_client:
        raise HTTPException(status_code=503, detail="Models are not initialized yet.")
    
    question = request.question.strip()
    target_file = request.target_file
    excluded_files = request.excluded_files or []
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    # Get settings
    settings = get_db_settings()
    top_k = settings.get("top_k", 3)
    threshold = settings.get("similarity_threshold", 0.15)
    strict_mode = settings.get("strict_mode", True)

    try:
        # 1. Generate query vector
        query_response = embedding_client.generate_embedding(question)
        query_vector = query_response.data[0].embedding

        # 2. Retrieve document vectors from SQLite
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        if target_file:
            cursor.execute("SELECT text, embedding, file_name FROM documents WHERE file_name = ? AND embedding_model = ?", (target_file, embedding_alias))
        elif excluded_files:
            placeholders = ','.join('?' * len(excluded_files))
            cursor.execute(f"SELECT text, embedding, file_name FROM documents WHERE file_name NOT IN ({placeholders}) AND embedding_model = ?", excluded_files + [embedding_alias])
        else:
            cursor.execute("SELECT text, embedding, file_name FROM documents WHERE embedding_model = ?", (embedding_alias,))
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            if target_file:
                return {
                    "answer": f"No content found for the selected document '{target_file}'. Please make sure it is indexed.",
                    "context": "No chunks found in database.",
                    "score": 0.0,
                    "file_name": target_file
                }
            else:
                return {
                    "answer": "No documents found in the database to search. Please upload and index documents first.",
                    "context": "Database is empty.",
                    "score": 0.0,
                    "file_name": "None"
                }

        # 3. Calculate similarities
        results = []
        for row in rows:
            doc_text = row[0]
            doc_vector = json.loads(row[1])
            doc_file_name = row[2] if row[2] else "Unknown File"
            score = cosine_similarity(query_vector, doc_vector)
            results.append((doc_text, score, doc_file_name))

        # Sort and select the top matches
        results.sort(key=lambda x: x[1], reverse=True)
        
        # Filter matches above threshold
        valid_matches = [r for r in results if r[1] >= threshold]
        
        if not valid_matches:
            if strict_mode:
                return {
                    "answer": "This information is not available in the local knowledge base.",
                    "context": "Irrelevant context filtered out.",
                    "score": 0.0,
                    "file_name": results[0][2]
                }
            else:
                top_text = results[0][0]
                top_score = results[0][1]
                top_file_name = results[0][2]
                context_text = "No relevant document sources match the user query. Warn the user that the response is based on general knowledge."
        else:
            top_matches = valid_matches[:top_k]
            top_text = top_matches[0][0]
            top_score = top_matches[0][1]
            top_file_name = top_matches[0][2]
            
            combined_texts = []
            for idx, (text, score, file_name) in enumerate(top_matches):
                combined_texts.append(f"[Source {idx+1}: {file_name} (Similarity: {round(score*100, 1)}%)]\n{text}")
            context_text = "\n\n".join(combined_texts)

        # 4. Construct prompt and generate answer
        strict_instructions = (
            "- Answer the user's question by strictly adhering to the 'SOURCE TEXTS' provided below.\n"
            "- If the answer is not in the provided source texts, state: 'This information is not available in the local knowledge base.'\n"
        ) if strict_mode else (
            "- Try to answer using the 'SOURCE TEXTS' provided below.\n"
            "- If the information is not in the source texts, use your general knowledge to answer, but start your response by mentioning that it is not in the local documents.\n"
        )

        system_prompt = (
            "You are a local, offline support AI assistant specialized in document-based information retrieval.\n\n"
            "Behaviour Rules:\n"
            "- Always prioritize safety. If the procedure or topic involves risk, explicitly call out warnings.\n"
            "- Do not hallucinate or guess procedures, measurements, timelines, or specifications.\n"
            + strict_instructions +
            "- Be concise, direct, and structure your responses with bullet points or numbered lists where applicable.\n\n"
            f"SOURCE TEXTS:\n{context_text}"
        )

        response = local_client.chat.completions.create(
            model=chat_alias,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question}
            ],
            temperature=0.3
        )

        answer = response.choices[0].message.content
        return {
            "answer": answer,
            "context": top_text,
            "score": round(top_score * 100, 2),
            "file_name": top_file_name
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing chat completion: {str(e)}")

@app.post("/api/chat/stream")
def chat_stream_endpoint(request: ChatRequest):
    global embedding_client, local_client
    if not embedding_client or not local_client:
        raise HTTPException(status_code=503, detail="Models are not initialized yet.")
    
    question = request.question.strip()
    target_file = request.target_file
    excluded_files = request.excluded_files or []
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    # Get settings
    settings = get_db_settings()
    top_k = settings.get("top_k", 3)
    threshold = settings.get("similarity_threshold", 0.15)
    strict_mode = settings.get("strict_mode", True)

    def event_generator():
        try:
            # 1. Generate query vector
            query_response = embedding_client.generate_embedding(question)
            query_vector = query_response.data[0].embedding

            # 2. Retrieve document vectors from SQLite
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            if target_file:
                cursor.execute("SELECT text, embedding, file_name FROM documents WHERE file_name = ? AND embedding_model = ?", (target_file, embedding_alias))
            elif excluded_files:
                placeholders = ','.join('?' * len(excluded_files))
                cursor.execute(f"SELECT text, embedding, file_name FROM documents WHERE file_name NOT IN ({placeholders}) AND embedding_model = ?", excluded_files + [embedding_alias])
            else:
                cursor.execute("SELECT text, embedding, file_name FROM documents WHERE embedding_model = ?", (embedding_alias,))
            rows = cursor.fetchall()
            conn.close()

            if not rows:
                err_ans = f"No content found for the selected document '{target_file}'." if target_file else "No documents found in the database."
                yield f"data: {json.dumps({'token': err_ans})}\n\n"
                yield f"data: {json.dumps({'context': 'No chunks found.', 'score': 0.0, 'file_name': target_file or 'None'})}\n\n"
                return

            # 3. Calculate similarities
            results = []
            for row in rows:
                doc_text = row[0]
                doc_vector = json.loads(row[1])
                doc_file_name = row[2] if row[2] else "Unknown File"
                score = cosine_similarity(query_vector, doc_vector)
                results.append((doc_text, score, doc_file_name))

            results.sort(key=lambda x: x[1], reverse=True)
            valid_matches = [r for r in results if r[1] >= threshold]

            if not valid_matches:
                if strict_mode:
                    yield f"data: {json.dumps({'token': 'This information is not available in the local knowledge base.'})}\n\n"
                    yield f"data: {json.dumps({'context': 'Irrelevant context filtered out.', 'score': 0.0, 'file_name': results[0][2]})}\n\n"
                    return
                else:
                    top_text = results[0][0]
                    top_score = results[0][1]
                    top_file_name = results[0][2]
                    context_text = "No relevant document sources match the user query. Warn the user that the response is based on general knowledge."
            else:
                top_matches = valid_matches[:top_k]
                top_text = top_matches[0][0]
                top_score = top_matches[0][1]
                top_file_name = top_matches[0][2]

                combined_texts = []
                for idx, (text, score, file_name) in enumerate(top_matches):
                    combined_texts.append(f"[Source {idx+1}: {file_name} (Similarity: {round(score*100, 1)}%)]\n{text}")
                context_text = "\n\n".join(combined_texts)

            # 4. Prompt Builder
            strict_instructions = (
                "- Answer the user's question by strictly adhering to the 'SOURCE TEXTS' provided below.\n"
                "- If the answer is not in the provided source texts, state: 'This information is not available in the local knowledge base.'\n"
            ) if strict_mode else (
                "- Try to answer using the 'SOURCE TEXTS' provided below.\n"
                "- If the information is not in the source texts, use your general knowledge to answer, but start your response by mentioning that it is not in the local documents.\n"
            )

            system_prompt = (
                "You are a local, offline support AI assistant specialized in document-based information retrieval.\n\n"
                "Behaviour Rules:\n"
                "- Always prioritize safety. If the procedure or topic involves risk, explicitly call out warnings.\n"
                "- Do not hallucinate or guess procedures, measurements, timelines, or specifications.\n"
                + strict_instructions +
                "- Be concise, direct, and structure your responses with bullet points or numbered lists where applicable.\n\n"
                f"SOURCE TEXTS:\n{context_text}"
            )

            # 5. Call completions with stream=True
            response_stream = local_client.chat.completions.create(
                model=chat_alias,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question}
                ],
                temperature=0.3,
                stream=True
            )

            for chunk in response_stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    token = chunk.choices[0].delta.content
                    yield f"data: {json.dumps({'token': token})}\n\n"

            # Yield RAG details metadata at the very end
            yield f"data: {json.dumps({'context': top_text if valid_matches else 'No relevant matches.', 'score': round(top_score * 100, 2), 'file_name': top_file_name})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    from fastapi.responses import StreamingResponse
    return StreamingResponse(event_generator(), media_type="text/event-stream")

class MessageStoreRequest(BaseModel):
    role: str
    content: str
    context: str = None
    score: float = None
    file_name: str = None

class SessionCreateRequest(BaseModel):
    id: str
    title: str

@app.get("/api/sessions")
def get_sessions():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, created_at, is_pinned FROM sessions ORDER BY is_pinned DESC, created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        return [{"id": r[0], "title": r[1], "created_at": r[2], "is_pinned": bool(r[3])} for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sessions")
def create_session(request: SessionCreateRequest):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT OR IGNORE INTO sessions (id, title) VALUES (?, ?)", (request.id, request.title))
        conn.commit()
        conn.close()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sessions/{session_id}/messages")
def get_session_messages(session_id: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT role, content, context, score, file_name FROM chat_history WHERE session_id = ? ORDER BY id ASC", (session_id,))
        rows = cursor.fetchall()
        conn.close()
        return [{
            "role": r[0],
            "content": r[1],
            "context": r[2],
            "score": r[3],
            "file_name": r[4]
        } for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sessions/{session_id}/messages")
def save_session_message(session_id: str, request: MessageStoreRequest):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO chat_history (session_id, role, content, context, score, file_name) VALUES (?, ?, ?, ?, ?, ?)",
            (session_id, request.role, request.content, request.context, request.score, request.file_name)
        )
        # Update session title if it was default and this is the first user message
        cursor.execute("SELECT COUNT(*) FROM chat_history WHERE session_id = ?", (session_id,))
        count = cursor.fetchone()[0]
        if count == 1 and request.role == "user":
            title = request.content[:35] + "..." if len(request.content) > 35 else request.content
            cursor.execute("UPDATE sessions SET title = ? WHERE id = ?", (title, session_id))
        
        conn.commit()
        conn.close()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        cursor.execute("DELETE FROM chat_history WHERE session_id = ?", (session_id,))
        conn.commit()
        conn.close()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PinToggleRequest(BaseModel):
    is_pinned: bool

@app.put("/api/sessions/{session_id}/pin")
def pin_session(session_id: str, request: PinToggleRequest):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("UPDATE sessions SET is_pinned = ? WHERE id = ?", (int(request.is_pinned), session_id))
        conn.commit()
        conn.close()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/documents/{filename:path}/pin")
def pin_document(filename: str, request: PinToggleRequest):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO document_metadata (file_name, is_pinned) VALUES (?, ?)", (filename, int(request.is_pinned)))
        conn.commit()
        conn.close()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def run_document_indexing_in_background(file_path, filename, embedding_alias):
    global indexing_states, embedding_client
    try:
        try:
            from backend.ingest import extract_text, get_chunks
        except ImportError:
            from ingest import extract_text, get_chunks
        
        # Initialize state to processing
        with indexing_states_lock:
            indexing_states[filename] = {
                "status": "processing",
                "progress": 0.0,
                "processed_chunks": 0,
                "total_chunks": 0,
                "error": None
            }
            
        raw_text = extract_text(file_path)
        if not raw_text:
            raise Exception("Metin çıkartılamadı veya bu dosya formatı desteklenmiyor.")
            
        chunks = get_chunks(raw_text)
        if not chunks:
            raise Exception("Belge boş veya anlamlı parçalara bölünemedi.")
            
        total_chunks = len(chunks)
        with indexing_states_lock:
            indexing_states[filename]["total_chunks"] = total_chunks
            
        conn = sqlite3.connect(DB_PATH, timeout=30.0)
        cursor = conn.cursor()
        
        # Delete existing chunks for this file and active embedding model to prevent duplicates
        cursor.execute("DELETE FROM documents WHERE file_name = ? AND embedding_model = ?", (filename, embedding_alias))
        
        processed_chunks = 0
        for chunk in chunks:
            if not chunk.strip():
                processed_chunks += 1
                progress = round((processed_chunks / total_chunks) * 100, 1)
                with indexing_states_lock:
                    indexing_states[filename]["processed_chunks"] = processed_chunks
                    indexing_states[filename]["progress"] = progress
                continue
                
            response = embedding_client.generate_embedding(chunk)
            vector = response.data[0].embedding
            vector_str = json.dumps(vector)
            cursor.execute("INSERT INTO documents (text, embedding, file_name, embedding_model) VALUES (?, ?, ?, ?)", 
                           (chunk, vector_str, filename, embedding_alias))
            
            processed_chunks += 1
            progress = min(round((processed_chunks / total_chunks) * 100, 1), 100.0)
            with indexing_states_lock:
                indexing_states[filename]["processed_chunks"] = processed_chunks
                indexing_states[filename]["progress"] = progress
                
        conn.commit()
        conn.close()
        
        with indexing_states_lock:
            indexing_states[filename]["status"] = "success"
            indexing_states[filename]["progress"] = 100.0
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        with indexing_states_lock:
            indexing_states[filename] = {
                "status": "error",
                "progress": 0.0,
                "processed_chunks": 0,
                "total_chunks": 0,
                "error": str(e)
            }

@app.post("/api/upload")
def upload_document(file: UploadFile = File(...)):
    global embedding_client
    if not embedding_client:
        raise HTTPException(status_code=503, detail="Embedding model is not initialized yet.")
        
    try:
        # Save file to documents directory
        docs_dir = get_docs_dir()
            
        file_path = os.path.join(docs_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Start indexing in background thread
        thread = threading.Thread(
            target=run_document_indexing_in_background,
            args=(file_path, file.filename, embedding_alias)
        )
        thread.daemon = True
        thread.start()
        
        return {"status": "processing", "filename": file.filename}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/documents/reindex")
def reindex_document(request: ReindexRequest):
    global embedding_client
    if not embedding_client:
        raise HTTPException(status_code=503, detail="Embedding model is not initialized yet.")
        
    try:
        docs_dir = get_docs_dir()
        file_path = os.path.join(docs_dir, request.filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"File not found: {request.filename}")
            
        # Start indexing in background thread
        thread = threading.Thread(
            target=run_document_indexing_in_background,
            args=(file_path, request.filename, embedding_alias)
        )
        thread.daemon = True
        thread.start()
        
        return {"status": "processing", "filename": request.filename}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents/indexing-status")
def get_indexing_status():
    global indexing_states
    with indexing_states_lock:
        return dict(indexing_states)

@app.post("/api/documents/indexing-clear")
def clear_indexing_status(request: ReindexRequest):
    global indexing_states
    with indexing_states_lock:
        if request.filename in indexing_states:
            del indexing_states[request.filename]
        return {"status": "success"}


@app.delete("/api/documents/{filename}")
def delete_document(filename: str):
    try:
        # Delete chunks from SQLite database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM documents WHERE file_name = ?", (filename,))
        cursor.execute("DELETE FROM document_metadata WHERE file_name = ?", (filename,))
        conn.commit()
        conn.close()
        
        # Delete file from local documents directory
        docs_dir = get_docs_dir()
        file_path = os.path.join(docs_dir, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            
        return {"status": "success"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/settings")
def get_settings():
    return get_db_settings()

@app.post("/api/settings")
def update_settings(req: SettingsUpdateRequest):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        if req.top_k is not None:
            cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ("top_k", str(req.top_k)))
        if req.similarity_threshold is not None:
            cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ("similarity_threshold", str(req.similarity_threshold)))
        if req.strict_mode is not None:
            cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ("strict_mode", "1" if req.strict_mode else "0"))
        conn.commit()
        conn.close()
        return get_db_settings()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Helper to resolve static files directory path under PyInstaller freezing
def get_static_dir():
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, "static")
    # In development, look for a static directory next to main.py
    return os.path.join(os.path.dirname(__file__), "static")

# Serve React static assets
static_dir = get_static_dir()
if os.path.exists(static_dir):
    assets_dir = os.path.join(static_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # Fallback to index.html for all client-side React routes
    @app.get("/{fallback_path:path}")
    async def serve_frontend(fallback_path: str):
        # Ignore API calls or documentation
        if fallback_path.startswith("api/") or fallback_path.startswith("docs") or fallback_path.startswith("openapi.json"):
            raise HTTPException(status_code=404)
        
        # Check if requested path is a real file inside the static directory
        file_path = os.path.join(static_dir, fallback_path)
        if os.path.isfile(file_path):
            return StarletteFileResponse(file_path)
            
        # Fallback to React index
        index_file = os.path.join(static_dir, "index.html")
        if os.path.exists(index_file):
            return StarletteFileResponse(index_file)
        raise HTTPException(status_code=404, detail="Frontend build files not found.")

if __name__ == "__main__":
    import uvicorn
    import webview
    
    # Start FastAPI/uvicorn server in a background thread
    def start_server():
        uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")
        
    server_thread = threading.Thread(target=start_server)
    server_thread.daemon = True
    server_thread.start()
    
    # Wait for FastAPI server to initialize
    time.sleep(1.5)
    
    # Open PyWebView native standalone desktop window
    webview.create_window(
        title="Local RAG Assistant",
        url="http://127.0.0.1:8000",
        width=1280,
        height=800,
        resizable=True
    )
    webview.start()
