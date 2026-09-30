"""
Test suite for Booking Lambda function
"""
import json
import pytest
from unittest.mock import Mock, patch

# Import handler
import sys
sys.path.insert(0, '../lambda/booking')
from handler import lambda_handler

class TestBookingFunction:
    """Test Mock Appointment Booking Tool"""
    
    def test_booking_without_confirmation(self):
        """Test that booking requires explicit confirmation"""
        
        event = {
            'provider_id': 'PR001',
            'patient_id': 'P001',
            'date': '2024-10-01',
            'time': '09:00',
            'user_confirmed': False
        }
        
        response = lambda_handler(event, {})
        
        # Should reject without confirmation
        assert response['statusCode'] == 403
        body = json.loads(response['body'])
        assert 'confirmation_needed' in body
        assert body['confirmation_needed'] is True
    
    def test_successful_booking_with_confirmation(self):
        """Test successful booking with user confirmation"""
        
        event = {
            'provider_id': 'PR001',
            'patient_id': 'P001',
            'date': '2024-10-01',
            'time': '09:00',
            'user_confirmed': True
        }
        
        response = lambda_handler(event, {})
        
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['booking_confirmed'] is True
        assert 'booking_reference' in body
        assert body['booking_reference'].startswith('CB-')
        assert 'MOCK_BOOKING_CONFIRMED' in body['activity_event']
    
    def test_missing_required_fields(self):
        """Test error handling for missing fields"""
        
        event = {
            'provider_id': 'PR001',
            # Missing patient_id, date, time
            'user_confirmed': True
        }
        
        response = lambda_handler(event, {})
        
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert 'error' in body
    
    def test_booking_reference_format(self):
        """Test booking reference format"""
        
        event = {
            'provider_id': 'PR001',
            'patient_id': 'P001',
            'date': '2024-10-01',
            'time': '14:30',
            'user_confirmed': True
        }
        
        response = lambda_handler(event, {})
        body = json.loads(response['body'])
        
        booking_ref = body['booking_reference']
        assert booking_ref.startswith('CB-')
        assert len(booking_ref) == 11  # CB- + 8 chars
    
    def test_appointment_details_in_response(self):
        """Test that response includes appointment details"""
        
        event = {
            'provider_id': 'PR002',
            'patient_id': 'P001',
            'date': '2024-10-02',
            'time': '15:30',
            'user_confirmed': True
        }
        
        response = lambda_handler(event, {})
        body = json.loads(response['body'])
        
        assert 'appointment_details' in body
        assert body['appointment_details']['date'] == '2024-10-02'
        assert body['appointment_details']['time'] == '15:30'
        assert body['appointment_details']['provider_id'] == 'PR002'
    
    def test_next_steps_included(self):
        """Test that next steps are provided"""
        
        event = {
            'provider_id': 'PR001',
            'patient_id': 'P001',
            'date': '2024-10-01',
            'time': '09:00',
            'user_confirmed': True
        }
        
        response = lambda_handler(event, {})
        body = json.loads(response['body'])
        
        assert 'next_steps' in body
        assert len(body['next_steps']) > 0

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
