"""
Mock Appointment Booking Tool - Creates simulated appointments
"""
import json
import boto3
import uuid
from datetime import datetime
from typing import Dict, Any

dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    """
    Creates a mock appointment booking
    
    IMPORTANT: This should only be called after explicit user confirmation
    
    Parameters:
    - provider_id: Provider identifier
    - patient_id: Patient identifier
    - date: Appointment date
    - time: Appointment time
    - user_confirmed: Must be True
    
    Returns:
    - Mock appointment confirmation details
    """
    try:
        # Parse input
        provider_id = event.get('provider_id')
        patient_id = event.get('patient_id')
        appointment_date = event.get('date')
        appointment_time = event.get('time')
        user_confirmed = event.get('user_confirmed', False)
        
        # Validate required fields
        if not all([provider_id, patient_id, appointment_date, appointment_time]):
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'provider_id, patient_id, date, and time are required'
                })
            }
        
        # CRITICAL: Check for explicit user confirmation
        if not user_confirmed:
            return {
                'statusCode': 403,
                'body': json.dumps({
                    'error': 'Booking requires explicit user confirmation',
                    'action_required': 'User must confirm appointment booking',
                    'confirmation_needed': True
                })
            }
        
        # Generate mock booking reference
        booking_reference = f"CB-{str(uuid.uuid4())[:8].upper()}"
        booking_timestamp = datetime.utcnow().isoformat()
        
        # Create mock booking record
        booking = {
            'booking_reference': booking_reference,
            'patient_id': patient_id,
            'provider_id': provider_id,
            'appointment_date': appointment_date,
            'appointment_time': appointment_time,
            'status': 'confirmed',
            'booking_timestamp': booking_timestamp,
            'is_mock': True,
            'disclaimer': 'This is a simulated booking for prototype demonstration'
        }
        
        # In a real system, this would be stored in DynamoDB
        # For prototype, we just return the booking confirmation
        
        # Log event without PHI
        print(f"Mock booking created (reference: {booking_reference})")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'booking_confirmed': True,
                'booking_reference': booking_reference,
                'appointment_details': {
                    'date': appointment_date,
                    'time': appointment_time,
                    'provider_id': provider_id
                },
                'next_steps': [
                    'Review care snapshot and consent',
                    'Receive bilingual handoff documents',
                    'Attend appointment with handoff'
                ],
                'activity_event': 'MOCK_BOOKING_CONFIRMED',
                'disclaimer': 'This is a simulated booking. No real appointment has been scheduled.'
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
