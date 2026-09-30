"""
Visit Summary Tool - Generates bilingual clinician handoff
"""
import json
import boto3
from datetime import datetime
from typing import Dict, Any, List

def lambda_handler(event, context):
    """
    Generates consent-controlled care snapshot and bilingual handoff
    
    Parameters:
    - patient_id: Patient identifier
    - symptoms: Reported symptoms
    - duration: Symptom duration
    - patient_context: Consented patient information
    - medication_issues: Flagged medication reference items
    - appointment_details: Booking information
    - language_preference: User's language preference
    
    Returns:
    - English clinician handoff
    - Arabic patient/caregiver handoff (RTL-safe)
    """
    try:
        # Parse input
        patient_id = event.get('patient_id')
        symptoms = event.get('symptoms', [])
        duration = event.get('duration', '')
        patient_context = event.get('patient_context', {})
        medication_issues = event.get('medication_issues', [])
        appointment_details = event.get('appointment_details', {})
        language_preference = event.get('language_preference', 'english')
        
        if not patient_id or not symptoms:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'patient_id and symptoms are required'
                })
            }
        
        # Generate English Clinician Handoff
        english_handoff = generate_english_handoff(
            symptoms, duration, patient_context, 
            medication_issues, appointment_details
        )
        
        # Generate Arabic Patient/Caregiver Handoff
        arabic_handoff = generate_arabic_handoff(
            symptoms, duration, appointment_details,
            language_preference
        )
        
        # Create care snapshot review
        care_snapshot = {
            'shared_information': {
                'symptoms_and_timeline': True,
                'current_medications': bool(patient_context.get('current_medications')),
                'allergies': bool(patient_context.get('allergies')),
                'relevant_history': bool(patient_context.get('relevant_history')),
                'medication_reference_questions': bool(medication_issues)
            },
            'not_shared_by_default': {
                'full_consultation_history': False,
                'full_family_history': False,
                'unrelated_notes': False
            },
            'purpose': 'This appointment only',
            'consent_required': True
        }
        
        # Log event without PHI
        print(f"Visit summary generated (language: {language_preference})")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'care_snapshot': care_snapshot,
                'english_clinician_handoff': english_handoff,
                'arabic_patient_handoff': arabic_handoff,
                'activity_event': 'VISIT_SUMMARY_GENERATED',
                'disclaimer': 'Navigation support only; not a diagnosis or treatment plan'
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Internal server error'
            })
        }

def generate_english_handoff(symptoms, duration, context, med_issues, appointment):
    """Generate structured English clinician handoff"""
    
    handoff = {
        'title': 'Clinician Handoff — Prototype',
        'sections': {
            'reported_symptoms': {
                'symptoms': symptoms,
                'duration': duration
            },
            'patient_context': {
                'current_medications': context.get('current_medications', []),
                'allergies': context.get('allergies', []),
                'relevant_history': context.get('relevant_history', [])
            },
            'medication_reference_items': med_issues,
            'appointment_details': appointment,
            'patient_questions': [
                'Please review medication-reference items flagged above',
                'Seeking guidance on symptom progression'
            ],
            'safety_note': 'This handoff was prepared by CareBridge UAE navigation support. It does not constitute a diagnosis or treatment plan. Clinical assessment required.'
        }
    }
    
    return handoff

def generate_arabic_handoff(symptoms, duration, appointment, language_pref):
    """Generate RTL-safe Arabic patient/caregiver handoff"""
    
    handoff = {
        'title': 'ملخص الزيارة للمريض ومقدم الرعاية',
        'rtl': True,
        'sections': {
            'الأعراض_المبلغ_عنها': {
                'الأعراض': symptoms if isinstance(symptoms, str) else 'أعراض متعددة',
                'المدة': duration
            },
            'موعد_الزيارة': {
                'التاريخ': appointment.get('date', 'غير محدد'),
                'الوقت': appointment.get('time', 'غير محدد'),
                'المزود': appointment.get('provider_id', 'غير محدد')
            },
            'المعلومات_المشاركة': [
                'الأعراض والمدة الزمنية',
                'الأدوية الحالية (إذا تمت الموافقة)',
                'الحساسية (إذا تمت الموافقة)',
                'التاريخ الطبي ذي الصلة'
            ],
            'ملاحظة_السلامة': 'كيرباريدج الإمارات يدعم التنقل في الرعاية الصحية فقط. لا يقدم تشخيصًا طبيًا أو وصفات طبية أو توصيات علاجية.',
            'في_حالة_تفاقم_الأعراض': 'إذا تفاقمت الأعراض أو شعرت بالحاجة الملحة، اطلب الرعاية الطارئة فورًا.'
        }
    }
    
    return handoff
