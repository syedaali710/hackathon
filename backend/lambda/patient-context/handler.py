"""
Patient Context Tool - Retrieves relevant synthetic patient information
"""
import json
import boto3
import os
from typing import Dict, Any

dynamodb = boto3.resource('dynamodb')
ssm = boto3.client('ssm')

def get_table_name():
    """Retrieve DynamoDB table name from SSM Parameter Store"""
    try:
        response = ssm.get_parameter(
            Name='/app/workshop/health-companion/patients-table'
        )
        return response['Parameter']['Value']
    except Exception as e:
        print(f"Error retrieving table name from SSM: {str(e)}")
        raise

def lambda_handler(event, context):
    """
    Retrieves minimum necessary patient context
    
    Parameters:
    - patient_id: Patient identifier
    - context_type: Type of context needed (medications, allergies, history, all)
    
    Returns:
    - Relevant patient information based on minimum necessary principle
    """
    try:
        # Parse input
        patient_id = event.get('patient_id')
        context_type = event.get('context_type', 'relevant')
        
        if not patient_id:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'patient_id is required'
                })
            }
        
        # Get table
        table_name = get_table_name()
        table = dynamodb.Table(table_name)
        
        # Retrieve patient record
        response = table.get_item(Key={'patient_id': patient_id})
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'body': json.dumps({
                    'error': 'Patient not found'
                })
            }
        
        patient = response['Item']
        
        # Return minimum necessary information based on context type
        if context_type == 'medications':
            result = {
                'patient_id': patient_id,
                'current_medications': patient.get('current_medications', [])
            }
        elif context_type == 'allergies':
            result = {
                'patient_id': patient_id,
                'allergies': patient.get('allergies', [])
            }
        elif context_type == 'history':
            result = {
                'patient_id': patient_id,
                'medical_history': patient.get('medical_history', [])
            }
        elif context_type == 'relevant':
            # Default: return relevant context for symptom navigation
            result = {
                'patient_id': patient_id,
                'age': patient.get('age'),
                'language_preference': patient.get('language_preference'),
                'current_medications': patient.get('current_medications', []),
                'allergies': patient.get('allergies', []),
                'relevant_history': [
                    h for h in patient.get('medical_history', [])
                    if h.get('status') == 'ongoing'
                ]
            }
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Invalid context_type'
                })
            }
        
        # Log event without PHI
        print(f"Retrieved context for patient (type: {context_type})")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'patient_context': result,
                'data_minimization': 'Only minimum necessary information returned',
                'consent_required': True
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
