import os
import json
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Query, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from database import init_db
from auth_routes import router as auth_router
from agents import NurseAgent, ExtractedData

# Load environmental configurations
load_dotenv()

# Initialize SQLite database
init_db()

app = FastAPI(
    title="Nurse Agent Clinical Intake API",
    description="Conversational chatbot backend for patient vitals assessment and clinical reports compiling.",
    version="1.0.0"
)

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Auth and Saved Records endpoints
app.include_router(auth_router)

nurse = NurseAgent()

class PatientCase(BaseModel):
    name: str = Field(description="Patient's full name")
    age: int = Field(description="Patient's age")
    chief_complaint: str = Field(description="Chief complaint/reason for arrival")
    known_information: str = Field(description="Known medical info: medical history, allergies, etc.")
    weight_lbs: float = Field(description="Weight in lbs")
    height_inches: float = Field(description="Height in inches")
    temp_f: float = Field(description="Temperature in Fahrenheit")
    blood_pressure: str = Field(description="Blood pressure, e.g., '140/90'")

class ChatRequest(BaseModel):
    chat_history: List[Dict[str, str]]
    patient_case: PatientCase
    extracted_data: Dict[str, Any]

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "Nurse Agent Intake API",
        "api_key_configured": bool(os.getenv("GEMINI_API_KEY"))
    }

@app.get("/api/generate-patient-case")
async def generate_patient_case_endpoint(scenario: Optional[str] = Query(None, description="The specific medical scenario to generate")):
    """Generates a clinical patient profile via Gemini or mock data matching the selected scenario."""
    
    # 8 standard realistic scenarios
    scenarios_map = {
        "broken arm": PatientCase(
            name="Liam Martinez", 
            age=12,
            chief_complaint="Fell off trampoline this afternoon. Visible left arm swelling and deformity.",
            known_information="Allergic to latex\nNo other prior medical conditions",
            weight_lbs=95.0, 
            height_inches=58.0, 
            temp_f=98.6, 
            blood_pressure="110/70"
        ),
        "migraine": PatientCase(
            name="Elena Rostova", 
            age=34,
            chief_complaint="Pounding headache on the left side of head, severe nausea, and light sensitivity since yesterday.",
            known_information="No drug allergies\nFamily history of chronic migraines",
            weight_lbs=130.0, 
            height_inches=65.0, 
            temp_f=98.9, 
            blood_pressure="125/80"
        ),
        "fever": PatientCase(
            name="Daniel Cho", 
            age=4,
            chief_complaint="High temperature, severe lethargy, and shivering starting last night.",
            known_information="Allergic to peanuts\nUp to date on all childhood vaccinations",
            weight_lbs=35.0, 
            height_inches=40.0, 
            temp_f=103.2, 
            blood_pressure="95/60"
        ),
        "asthma attack": PatientCase(
            name="Sarah Jenkins", 
            age=29,
            chief_complaint="Acute shortness of breath and wheezing after running outside in cold weather.",
            known_information="History of asthma triggered by cold\nAllergic to penicillin",
            weight_lbs=142.0, 
            height_inches=65.0, 
            temp_f=99.1, 
            blood_pressure="130/85"
        ),
        "chest pain": PatientCase(
            name="John Smith", 
            age=54,
            chief_complaint="Chest pain that started this morning while walking upstairs.",
            known_information="History of high blood pressure\nNo known drug allergies",
            weight_lbs=190.0, 
            height_inches=70.0, 
            temp_f=98.9, 
            blood_pressure="140/90"
        ),
        "allergic reaction": PatientCase(
            name="Maya Patel", 
            age=22,
            chief_complaint="Itchy hives spreading across chest and arms, mild throat tightness after eating a bakery cookie.",
            known_information="Known allergy to tree nuts\nCarrying EpiPen",
            weight_lbs=120.0, 
            height_inches=62.0, 
            temp_f=99.0, 
            blood_pressure="115/75"
        ),
        "sprained ankle": PatientCase(
            name="Tyler Vance", 
            age=19,
            chief_complaint="Rolled right ankle landing after a layup playing basketball. Swollen and unable to bear weight.",
            known_information="No allergies\nPrior ankle sprain on the same leg 2 years ago",
            weight_lbs=175.0, 
            height_inches=72.0, 
            temp_f=98.4, 
            blood_pressure="118/76"
        ),
        "food poisoning": PatientCase(
            name="Chloe Dubois", 
            age=27,
            chief_complaint="Repeated vomiting, severe abdominal cramps, and watery diarrhea since last night after eating raw oysters.",
            known_information="No allergies\nHistory of sensitive stomach",
            weight_lbs=135.0, 
            height_inches=67.0, 
            temp_f=100.2, 
            blood_pressure="105/65"
        )
    }

    if nurse.use_mock or not scenario or scenario.lower() not in scenarios_map:
        if scenario and scenario.lower() in scenarios_map:
            return scenarios_map[scenario.lower()]
        import random
        # Return random scenario from standard options
        return random.choice(list(scenarios_map.values()))

    try:
        from google.genai import types
        prompt = (
            f"Generate a highly realistic clinical patient profile matching the medical scenario: '{scenario}'. "
            "Choose a realistic patient name, age, vital signs, chief complaint details, and known background info appropriate for this scenario. "
            "Weight must be in lbs, height in inches, temperature in Fahrenheit, and blood pressure in systolic/diastolic (e.g. '120/80'). "
            "Ensure the output conforms exactly to the schema."
        )
        response = nurse.client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=PatientCase
            )
        )
        return PatientCase.model_validate_json(response.text)
    except Exception as e:
        print(f"Gemini patient gen failed for scenario '{scenario}': {e}. Falling back to mock data.")
        return scenarios_map.get(scenario.lower(), scenarios_map["chest pain"])

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest = Body(...)):
    """Handles the conversation turn where the AI simulates the Patient responding to the Nurse."""
    history = request.chat_history
    patient_case = request.patient_case
    
    # 1. Ask Patient Agent to reply
    patient_reply = ""
    if nurse.use_mock:
        # Simplistic keyword parser to respond realistically for mock sessions
        last_input = history[-1]['content'].lower() if history else ""
        if "name" in last_input:
            patient_reply = f"My name is {patient_case.name}."
        elif "age" in last_input or "old" in last_input:
            patient_reply = f"I am {patient_case.age} years old."
        elif "symptom" in last_input or "complaint" in last_input or "happen" in last_input or "feel" in last_input or "bring" in last_input or "throat" in last_input or "pain" in last_input or "hurt" in last_input or "brings" in last_input:
            patient_reply = f"I have {patient_case.chief_complaint}"
        elif "blood pressure" in last_input or "bp" in last_input or "pressure" in last_input:
            patient_reply = f"My last blood pressure was {patient_case.blood_pressure}."
        elif "temperature" in last_input or "fever" in last_input or "temp" in last_input or "hot" in last_input:
            patient_reply = f"My body temperature is {patient_case.temp_f}°F."
        elif "weight" in last_input or "weigh" in last_input:
            patient_reply = f"I weigh about {patient_case.weight_lbs} lbs."
        elif "height" in last_input or "tall" in last_input:
            patient_reply = f"I'm {patient_case.height_inches} inches tall."
        elif "allergy" in last_input or "allergies" in last_input or "history" in last_input or "past" in last_input or "background" in last_input:
            patient_reply = f"Here is my background: {patient_case.known_information}."
        else:
            patient_reply = f"I am {patient_case.age} years old and feel weak. To answer you, {patient_case.chief_complaint} Also my temperature is {patient_case.temp_f}°F and my BP is {patient_case.blood_pressure}."
    else:
        try:
            from google.genai import types
            system_patient = (
                f"You are the patient, {patient_case.name} (Age {patient_case.age}). "
                f"Your medical scenario is:\n"
                f"Chief Complaint: {patient_case.chief_complaint}\n"
                f"Known Info: {patient_case.known_information}\n"
                f"Vitals: Temp {patient_case.temp_f}°F, BP {patient_case.blood_pressure}, Weight {patient_case.weight_lbs}lbs, Height {patient_case.height_inches}in.\n\n"
                "Respond realistically as a patient would. Answer only the questions asked. "
                "Keep answers relatively brief. Do not reveal vitals unless specifically asked."
            )
            
            prompt_patient = "Conversation History:\n"
            for msg in history:
                speaker = "NURSE (User)" if msg['role'] == 'user' else "PATIENT (You)"
                prompt_patient += f"{speaker}: {msg['content']}\n"
            prompt_patient += "Patient's response:"

            response = nurse.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt_patient,
                config=types.GenerateContentConfig(
                    system_instruction=system_patient
                )
            )
            patient_reply = response.text.strip()
        except Exception as e:
            patient_reply = f"API Error: {str(e)}"

    # 2. Ask Extraction Agent to parse the conversation history and update state
    # We append the patient's reply to history to run the extraction over the latest state
    history_with_reply = history + [{"role": "model", "content": patient_reply}]
    
    extracted = ExtractedData(**request.extracted_data)
    is_complete = False
    
    if nurse.use_mock:
        # Simple extraction rules
        # Merge existing values or check if mentioned in history
        history_str = " ".join([m['content'].lower() for m in history_with_reply])
        
        if patient_case.name.lower() in history_str:
            extracted.name = patient_case.name
        if str(patient_case.age) in history_str or "age" in history_str or "old" in history_str:
            extracted.age = patient_case.age
        if "chest pain" in history_str or "complaint" in history_str or "shortness" in history_str or "abdominal" in history_str or "symptom" in history_str or "vomiting" in history_str or "headache" in history_str or "fracture" in history_str or "sprain" in history_str or "hives" in history_str or "wheez" in history_str or "feeling" in history_str:
            extracted.symptoms = patient_case.chief_complaint
        if str(patient_case.weight_lbs) in history_str or "weigh" in history_str:
            extracted.weight_lbs = patient_case.weight_lbs
        if str(patient_case.height_inches) in history_str or "tall" in history_str:
            extracted.height_inches = patient_case.height_inches
        if str(patient_case.temp_f) in history_str or "temperature" in history_str:
            extracted.temp_f = patient_case.temp_f
        if patient_case.blood_pressure in history_str or "pressure" in history_str:
            extracted.blood_pressure = patient_case.blood_pressure
            
        is_complete = all([
            extracted.name, extracted.age, extracted.symptoms, extracted.weight_lbs, 
            extracted.height_inches, extracted.temp_f, extracted.blood_pressure
        ])
    else:
        try:
            from google.genai import types
            class ExtractionResponse(BaseModel):
                extracted_data: ExtractedData
                is_complete: bool
                
            system_extractor = (
                "You are an Extraction Agent. Read the conversation history between the Nurse and the Patient.\n"
                "Extract the following values ONLY if they have been mentioned in the dialogue:\n"
                "- name\n"
                "- age\n"
                "- symptoms\n"
                "- weight_lbs\n"
                "- height_inches\n"
                "- temp_f\n"
                "- blood_pressure\n\n"
                "If a value is not mentioned, leave it null. Do not guess.\n"
                "Set is_complete to True only when Name, Age, Symptoms, Weight, Height, Temp, and Blood Pressure are all extracted."
            )
            
            prompt_extract = f"Current extracted variables: {json.dumps(request.extracted_data)}\n\nConversation Dialogue:\n"
            for msg in history_with_reply:
                role = "Nurse" if msg['role'] == 'user' else "Patient"
                prompt_extract += f"{role}: {msg['content']}\n"
                
            response = nurse.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt_extract,
                config=types.GenerateContentConfig(
                    system_instruction=system_extractor,
                    response_mime_type="application/json",
                    response_schema=ExtractionResponse
                )
            )
            parse_res = ExtractionResponse.model_validate_json(response.text)
            extracted = parse_res.extracted_data
            is_complete = parse_res.is_complete
        except Exception as e:
            print(f"Extraction failed: {e}")
            
    return {
        "message": patient_reply,
        "extracted_data": extracted.model_dump(),
        "is_complete": is_complete
    }

@app.get("/api/compile-report")
async def compile_report_endpoint(
    name: str = Query(..., description="Patient Name"),
    age: int = Query(..., description="Patient Age"),
    symptoms: str = Query(..., description="Symptoms summary"),
    weight: float = Query(..., description="Weight in lbs"),
    height: float = Query(..., description="Height in inches"),
    temperature: float = Query(..., description="Temperature in Fahrenheit"),
    blood_pressure: str = Query(..., description="Blood Pressure, e.g. 120/80")
):
    """Streams the intake report creation checklist logs and returns the finished report payload."""
    queue = asyncio.Queue()

    async def progress_callback(agent_name: str, message: str):
        await queue.put({
            "type": "progress",
            "agent": agent_name,
            "message": message
        })

    async def compile_task():
        try:
            data = ExtractedData(
                name=name,
                age=age,
                symptoms=symptoms,
                weight_lbs=weight,
                height_inches=height,
                temp_f=temperature,
                blood_pressure=blood_pressure
            )
            report = await nurse.compile_report(data, progress_callback)
            await queue.put({
                "type": "result",
                "data": report.model_dump()
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            await queue.put({
                "type": "error",
                "message": f"Nurse Agent compiling failed: {str(e)}"
            })
        finally:
            await queue.put(None) # End of stream

    # Run in background
    asyncio.create_task(compile_task())

    # SSE Event Generator
    async def event_generator():
        while True:
            item = await queue.get()
            if item is None:
                break
            yield f"data: {json.dumps(item)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
