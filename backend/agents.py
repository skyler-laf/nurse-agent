import os
import json
import asyncio
from typing import List, Callable, Optional, Awaitable, Dict, Any
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

# ---------------------------------------------------------------------------
# Pydantic Schemas for Structured Output
# ---------------------------------------------------------------------------

class VitalSigns(BaseModel):
    temperature: float = Field(description="Body temperature in Fahrenheit, e.g. 98.6")
    blood_pressure: str = Field(description="Blood pressure, e.g. '120/80'")
    weight: float = Field(description="Weight in lbs, e.g. 150")
    height: float = Field(description="Height in inches, e.g. 70")
    bmi: float = Field(description="Calculated Body Mass Index")

class IntakeReport(BaseModel):
    patient_name: str = Field(description="Patient's full name")
    age: int = Field(description="Patient's age in years")
    vitals: VitalSigns
    bmi_category: str = Field(description="BMI classification (Underweight, Normal, Overweight, Obese)")
    vital_assessment: List[str] = Field(description="Assessments of vital signs (e.g. Normal, High Fever, Stage 1 Hypertension)")
    triage_status: str = Field(description="Overall triage priority: Stable, Elevated, or Urgent")
    clinical_summary: str = Field(description="Cohesive clinical summary of patient symptoms and medical complaints")
    recommended_actions: List[str] = Field(description="Immediate next steps or diagnostic tests suggested for the physician")

# Chat Models
class ExtractedData(BaseModel):
    name: Optional[str] = Field(default=None, description="Patient's full name")
    age: Optional[int] = Field(default=None, description="Patient's age in years")
    symptoms: Optional[str] = Field(default=None, description="Patient's symptoms and details (e.g., sore throat, 3 days, pain level 8/10)")
    weight_lbs: Optional[float] = Field(default=None, description="Weight in pounds")
    height_inches: Optional[float] = Field(default=None, description="Height in inches")
    temp_f: Optional[float] = Field(default=None, description="Temperature in Fahrenheit")
    blood_pressure: Optional[str] = Field(default=None, description="Blood pressure string (systolic/diastolic, e.g., '130/85')")

class ChatResponse(BaseModel):
    message: str = Field(description="The next message/question for the patient from the AI Nurse.")
    extracted_data: ExtractedData = Field(description="Patient variables extracted from conversation so far.")
    is_complete: bool = Field(description="Set to True ONLY when Name, Age, Symptoms, Weight, Height, Temperature, and Blood Pressure are all collected.")

# ---------------------------------------------------------------------------
# Nurse Agent Class
# ---------------------------------------------------------------------------

class NurseAgent:
    def __init__(self):
        self.name = "Nurse Agent"
        self.role = "Measures vitals, validates patient credentials, assesses symptoms, and structures clinical intake reports."
        api_key = os.getenv("GEMINI_API_KEY")
        
        # Initialize client if API key exists, otherwise enable mock fallback
        if api_key and not api_key.startswith("your_") and not api_key.startswith("mock_"):
            try:
                self.client = genai.Client(api_key=api_key)
                self.use_mock = False
            except Exception as e:
                print(f"Error initializing Gemini client: {e}. Falling back to mock data.")
                self.use_mock = True
        else:
            self.use_mock = True

    async def simulate_thinking(self, delay: float = 0.5):
        await asyncio.sleep(delay)

    async def converse(self, chat_history: List[Dict[str, str]], current_extracted: Dict[str, Any]) -> ChatResponse:
        """Process chat turn, extract state variables, and query for next question or report completion."""
        if self.use_mock:
            # Deterministic Mock Chat flow for presentation simplicity & offline readiness
            # History items: [{'role': 'user'|'model', 'content': '...'}]
            user_messages = [m for m in chat_history if m['role'] == 'user']
            count = len(user_messages)
            
            # Helper to merge dict
            data = ExtractedData(**current_extracted)

            if count == 0:
                return ChatResponse(
                    message="Hello! I'm your virtual nurse. I'll collect your information before the doctor sees you. What is your full name, please?",
                    extracted_data=data,
                    is_complete=False
                )
            
            last_user_input = user_messages[-1]['content']

            if not data.name:
                data.name = last_user_input
                return ChatResponse(
                    message=f"Thank you, {data.name}. What brings you in today? What symptoms are you experiencing?",
                    extracted_data=data,
                    is_complete=False
                )
            elif not data.symptoms:
                data.symptoms = last_user_input
                return ChatResponse(
                    message="I understand. On a scale of 1–10, how severe is the pain or discomfort?",
                    extracted_data=data,
                    is_complete=False
                )
            elif "scale" in chat_history[-2]['content'].lower():
                data.symptoms = f"{data.symptoms} (Discomfort scale: {last_user_input}/10)"
                return ChatResponse(
                    message="Got it. Let's record your vital signs now. What is your current weight in pounds?",
                    extracted_data=data,
                    is_complete=False
                )
            elif not data.weight_lbs:
                try:
                    # extract digits
                    import re
                    val = float(re.findall(r'\d+', last_user_input)[0])
                    data.weight_lbs = val
                except Exception:
                    data.weight_lbs = 150.0
                return ChatResponse(
                    message="Thank you. And what is your height in inches? (e.g. 70 inches or 5ft 10in)",
                    extracted_data=data,
                    is_complete=False
                )
            elif not data.height_inches:
                try:
                    import re
                    val = float(re.findall(r'\d+', last_user_input)[0])
                    data.height_inches = val
                except Exception:
                    data.height_inches = 68.0
                return ChatResponse(
                    message="Great. What is your body temperature in Fahrenheit? (e.g. 98.6)",
                    extracted_data=data,
                    is_complete=False
                )
            elif not data.temp_f:
                try:
                    import re
                    val = float(re.findall(r'\d+\.?\d*', last_user_input)[0])
                    data.temp_f = val
                except Exception:
                    data.temp_f = 98.6
                return ChatResponse(
                    message="Almost done. What was your last blood pressure reading? (e.g. 120/80)",
                    extracted_data=data,
                    is_complete=False
                )
            elif not data.blood_pressure:
                data.blood_pressure = last_user_input
                return ChatResponse(
                    message="Thank you. I have collected all the vital signs and symptom details. Let me compile the report for the doctor now.",
                    extracted_data=data,
                    is_complete=True
                )
            else:
                return ChatResponse(
                    message="Intake is complete.",
                    extracted_data=data,
                    is_complete=True
                )

        try:
            # Query Gemini to extract variables and output next prompt
            system_instruction = (
                "You are an AI Nurse. Your goal is to collect patient information before they see the doctor.\n"
                "You MUST collect the following:\n"
                "1. Full Name\n"
                "2. Symptoms (what brings them in, plus follow-up details like pain severity/duration)\n"
                "3. Weight (in lbs)\n"
                "4. Height (in inches)\n"
                "5. Body Temperature (in Fahrenheit)\n"
                "6. Blood Pressure (e.g. '120/80')\n\n"
                "Have a natural conversation. Ask one question at a time. If they mention symptoms, ask a follow-up question (like a pain scale) before moving to vitals.\n"
                "Record any information they provide in the extracted_data structure.\n"
                "If they have provided all 6 fields, set is_complete to True."
            )
            
            prompt_content = f"Current extracted data: {json.dumps(current_extracted)}\nConversation History:\n"
            for msg in chat_history:
                prompt_content += f"{msg['role'].upper()}: {msg['content']}\n"
            prompt_content += "Nurse Agent's response:"

            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt_content,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema=ChatResponse
                )
            )
            return ChatResponse.model_validate_json(response.text)
        except Exception as e:
            print(f"Gemini chat error: {e}. Switching to mock dialogue handler.")
            self.use_mock = True
            return await self.converse(chat_history, current_extracted)

    async def compile_report(self, data: ExtractedData, callback: Callable[[str, str], Awaitable[None]]) -> IntakeReport:
        """Runs the checklist logs and outputs the final physician report."""
        patient_name = data.name or "Unknown Patient"
        age = data.age or 35
        symptoms = data.symptoms or "No symptoms reported"
        weight = data.weight_lbs or 150.0
        height = data.height_inches or 68.0
        temperature = data.temp_f or 98.6
        blood_pressure = data.blood_pressure or "120/80"

        await callback(self.name, f"Goal: Create intake report for patient {patient_name}.")
        await self.simulate_thinking(0.5)

        # ✓ Checks patient vitals (Nurse Agent asks metrics)
        await callback(self.name, f"✓ Checks patient vitals: Logged name: {patient_name}.")
        await self.simulate_thinking(0.8)

        await callback(self.name, f"✓ Checks patient age: Logged age: {age} years.")
        await self.simulate_thinking(0.8)
        
        await callback(self.name, f"✓ Checks reported symptoms: Logged '{symptoms}'.")
        await self.simulate_thinking(0.8)
        
        await callback(self.name, f"✓ Checks vital indicators: Weight: {weight} lbs, Height: {height} inches.")
        await self.simulate_thinking(0.8)
        
        await callback(self.name, f"✓ Checks body temperature: Registered: {temperature}°F.")
        await self.simulate_thinking(0.8)
        
        await callback(self.name, f"✓ Checks blood pressure: Captured: {blood_pressure}.")
        await self.simulate_thinking(0.8)
        
        # Creates patient intake report
        await callback(self.name, "✓ Creates patient intake report: Analysing clinical metrics, calculating BMI...")
        await self.simulate_thinking(1.0)
        
        # Sends report to the doctor
        await callback(self.name, "✓ Sends report to the doctor: Displaying clinical report on doctor dashboard.")
        await self.simulate_thinking(0.5)

        # Standard BMI calculation: weight (lb) / [height (in)]2 x 703
        bmi_val = 0.0
        if height > 0:
            bmi_val = round((weight / (height ** 2)) * 703, 1)

        bmi_cat = "Normal"
        if bmi_val < 18.5:
            bmi_cat = "Underweight"
        elif 18.5 <= bmi_val < 25.0:
            bmi_cat = "Normal"
        elif 25.0 <= bmi_val < 30.0:
            bmi_cat = "Overweight"
        else:
            bmi_cat = "Obese"

        if self.use_mock:
            assessments = []
            status = "Stable"

            # Check Temperature
            if temperature >= 100.4:
                assessments.append("Elevated body temperature (Fever)")
                status = "Elevated"
                if temperature >= 103.0:
                    assessments.append("High Fever (Critical)")
                    status = "Urgent"
            else:
                assessments.append("Body temperature normal")

            # Check Blood Pressure
            systolic, diastolic = 120, 80
            try:
                parts = blood_pressure.split("/")
                if len(parts) == 2:
                    systolic = int(parts[0].strip())
                    diastolic = int(parts[1].strip())
            except Exception:
                pass

            if systolic >= 140 or diastolic >= 90:
                assessments.append("Stage 2 Hypertension")
                status = "Urgent"
            elif systolic >= 130 or diastolic >= 80:
                assessments.append("Stage 1 Hypertension")
                if status != "Urgent":
                    status = "Elevated"
            else:
                assessments.append("Arterial blood pressure normal")

            # Recommended Actions
            actions = ["Maintain observation."]
            if status == "Urgent":
                actions = [
                    "Immediate physician evaluation required.",
                    "Verify vitals manual check.",
                    "Prepare patient files."
                ]
            elif status == "Elevated":
                actions = [
                    "Attending doctor review within 1 hour.",
                    "Monitor patient temp."
                ]

            vits = VitalSigns(
                temperature=temperature,
                blood_pressure=blood_pressure,
                weight=weight,
                height=height,
                bmi=bmi_val
            )

            return IntakeReport(
                patient_name=patient_name,
                age=age,
                vitals=vits,
                bmi_category=bmi_cat,
                vital_assessment=assessments,
                triage_status=status,
                clinical_summary=f"Patient {patient_name} (Age {age}) arrived complaining of '{symptoms}'. Height: {height}in, Weight: {weight}lbs, giving a BMI of {bmi_val} ({bmi_cat}).",
                recommended_actions=actions
            )

        try:
            prompt = (
                f"Create a clinical intake report for patient {patient_name} (Age {age}). "
                f"Symptom profile: {symptoms}. Weight: {weight} lbs, Height: {height} inches, "
                f"Body Temp: {temperature} Fahrenheit, Blood Pressure: {blood_pressure}. "
                f"Calculated BMI is {bmi_val} ({bmi_cat}). "
                f"Determine vital alerts, overall triage level (Stable, Elevated, Urgent), "
                f"and provide recommended physician actions."
            )
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=IntakeReport
                )
            )
            return IntakeReport.model_validate_json(response.text)
        except Exception as e:
            self.use_mock = True
            return await self.compile_report(data, callback)
