"""
Test suite for Visit Summary Lambda function
"""
import json
import pytest
from unittest.mock import Mock, patch

# Import handler
import sys
sys.path.insert(0, '../lambda/visit-summary')
from handler import lambda_handler

class TestVisitSummaryFunction:
    """Test Visit Summary Tool - Bilingual handoff generation"""
    
    def test_english_handoff_generation(self):
        """Test English clinician handoff generation"""
        
        event = {
            'patient_id': 'P001',
            'symptoms': ['headache', 'blurry vision'],
            'duration': '3 days',
            'patient_context': {
                'current_medications': [
                    {'name': 'Lisinopril', 'dose': '10mg'}
                ],
                'allergies': [
                    {'allergen': 'Penicillin'}
                ]
            },
            'medication_issues': [],
            'appointment_details': {
                'date': '2024-10-01',
                'time': '09:00'
            },
            'language_preference': 'english'
        }
        
        response = lambda_handler(event, {})
        
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert 'english_clinician_handoff' in body
        
        handoff = body['english_clinician_handoff']
        assert handoff['title'] == 'Clinician Handoff — Prototype'
        assert 'sections' in handoff
        assert 'safety_note' in handoff['sections']
    
    def test_arabic_handoff_generation(self):
        """Test Arabic patient/caregiver handoff generation"""
        
        event = {
            'patient_id': 'P002',
            'symptoms': 'chest pain',
            'duration': '2 hours',
            'patient_context': {},
            'medication_issues': [],
            'appointment_details': {
                'date': '2024-10-01',
                'time': '14:00'
            },
            'language_preference': 'arabic'
        }
        
        response = lambda_handler(event, {})
        body = json.loads(response['body'])
        
        assert 'arabic_patient_handoff' in body
        arabic_handoff = body['arabic_patient_handoff']
        assert arabic_handoff['title'] == 'ملخص الزيارة للمريض ومقدم الرعاية'
        assert arabic_handoff['rtl'] is True
    
    def test_care_snapshot_structure(self):
        """Test care snapshot consent structure"""
        
        event = {
            'patient_id': 'P001',
            'symptoms': ['fever', 'cough'],
            'duration': '5 days',
            'patient_context': {
                'current_medications': [{'name': 'Test'}],
                'allergies': []
            },
            'medication_issues': [{'issue': 'potential interaction'}],
            'appointment_details': {},
            'language_preference': 'english'
        }
        
        response = lambda_handler(event, {})
        body = json.loads(response['body'])
        
        assert 'care_snapshot' in body
        snapshot = body['care_snapshot']
        
        # Check shared information flags
        assert 'shared_information' in snapshot
        assert snapshot['shared_information']['symptoms_and_timeline'] is True
        assert snapshot['shared_information']['current_medications'] is True
        
        # Check not shared by default
        assert 'not_shared_by_default' in snapshot
        assert snapshot['not_shared_by_default']['full_consultation_history'] is False
        
        # Check purpose limitation
        assert snapshot['purpose'] == 'This appointment only'
        assert snapshot['consent_required'] is True
    
    def test_missing_required_fields(self):
        """Test error handling for missing required fields"""
        
        event = {
            'patient_id': 'P001'
            # Missing symptoms
        }
        
        response = lambda_handler(event, {})
        
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert 'error' in body
    
    def test_safety_disclaimer_included(self):
        """Test that safety disclaimer is included"""
        
        event = {
            'patient_id': 'P001',
            'symptoms': 'test',
            'duration': '1 day',
            'patient_context': {},
            'medication_issues': [],
            'appointment_details': {},
            'language_preference': 'english'
        }
        
        response = lambda_handler(event, {})
        body = json.loads(response['body'])
        
        # Check English handoff disclaimer
        english_handoff = body['english_clinician_handoff']
        safety_note = english_handoff['sections']['safety_note']
        assert 'not constitute a diagnosis' in safety_note
        assert 'Clinical assessment required' in safety_note
        
        # Check overall disclaimer
        assert 'disclaimer' in body
        assert 'not a diagnosis or treatment plan' in body['disclaimer']
    
    def test_activity_event_logged(self):
        """Test that activity event is included"""
        
        event = {
            'patient_id': 'P001',
            'symptoms': 'test',
            'duration': '1 day',
            'patient_context': {},
            'medication_issues': [],
            'appointment_details': {},
            'language_preference': 'english'
        }
        
        response = lambda_handler(event, {})
        body = json.loads(response['body'])
        
        assert body['activity_event'] == 'VISIT_SUMMARY_GENERATED'

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
