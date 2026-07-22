import json
import hashlib
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel
from database import get_db_connection

router = APIRouter()

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class UserRegister(BaseModel):
    username: str
    password: str
    preferences: Optional[str] = ""

class UserLogin(BaseModel):
    username: str
    password: str

class ProfileUpdate(BaseModel):
    user_id: int
    preferences: str

class SaveReport(BaseModel):
    user_id: int
    patient_name: str
    symptoms: str
    weight: float
    height: float
    temperature: float
    blood_pressure: str
    report_data: dict

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

# ---------------------------------------------------------------------------
# Auth Endpoints
# ---------------------------------------------------------------------------

@router.post("/api/auth/register")
def register_user(user: UserRegister):
    username = user.username.strip()
    if not username or not user.password:
        raise HTTPException(status_code=400, detail="Username and password are required")
        
    password_hash = hash_password(user.password)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (username, password_hash, preferences) VALUES (?, ?, ?)",
            (username, password_hash, user.preferences)
        )
        conn.commit()
        user_id = cursor.lastrowid
        return {
            "status": "success",
            "user": {
                "id": user_id,
                "username": username,
                "preferences": user.preferences
            }
        }
    except Exception as e:
        conn.rollback()
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=400, detail="Username is already taken")
        raise HTTPException(status_code=500, detail=f"Database failure: {str(e)}")
    finally:
        conn.close()

@router.post("/api/auth/login")
def login_user(user: UserLogin):
    username = user.username.strip()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, username, password_hash, preferences FROM users WHERE username = ?",
        (username,)
    )
    db_user = cursor.fetchone()
    conn.close()
    
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    pwd_hash = hash_password(user.password)
    if db_user["password_hash"] != pwd_hash:
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    return {
        "status": "success",
        "user": {
            "id": db_user["id"],
            "username": db_user["username"],
            "preferences": db_user["preferences"]
        }
    }

# ---------------------------------------------------------------------------
# Report History Endpoints
# ---------------------------------------------------------------------------

@router.post("/api/reports")
def save_report(report: SaveReport):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        report_json_str = json.dumps(report.report_data)
        cursor.execute(
            """INSERT INTO intake_reports 
            (user_id, patient_name, symptoms, weight, height, temperature, blood_pressure, report_json) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                report.user_id,
                report.patient_name,
                report.symptoms,
                report.weight,
                report.height,
                report.temperature,
                report.blood_pressure,
                report_json_str
            )
        )
        conn.commit()
        report_id = cursor.lastrowid
        return {"status": "success", "id": report_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save intake report: {str(e)}")
    finally:
        conn.close()

@router.get("/api/reports")
def get_reports(user_id: int = Query(..., description="The user ID to fetch reports for")):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT id, patient_name, symptoms, created_at 
        FROM intake_reports WHERE user_id = ? ORDER BY created_at DESC""",
        (user_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    
    reports = []
    for row in rows:
        reports.append({
            "id": row["id"],
            "patient_name": row["patient_name"],
            "symptoms": row["symptoms"],
            "created_at": row["created_at"]
        })
    return reports

@router.get("/api/reports/{report_id}")
def get_single_report(report_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT report_json FROM intake_reports WHERE id = ?",
        (report_id,)
    )
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Intake report not found")
        
    return json.loads(row["report_json"])

@router.delete("/api/reports/{report_id}")
def delete_report(report_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM intake_reports WHERE id = ?", (report_id,))
        conn.commit()
        return {"status": "success", "message": "Intake report deleted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
