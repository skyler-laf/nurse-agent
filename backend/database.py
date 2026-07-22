import os
import sqlite3

# Resolve database path dynamically
if os.getenv("VERCEL"):
    DB_PATH = "/tmp/nurse_intake.db"
else:
    DB_PATH = os.path.join(os.path.dirname(__file__), "nurse_intake.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create Clinical Staff Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        preferences TEXT
    );
    """)
    
    # Create Intake Reports table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS intake_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        patient_name TEXT NOT NULL,
        symptoms TEXT NOT NULL,
        weight REAL NOT NULL,
        height REAL NOT NULL,
        temperature REAL NOT NULL,
        blood_pressure TEXT NOT NULL,
        report_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)
    
    conn.commit()
    conn.close()
    print(f"Database initialized successfully at: {DB_PATH}")
