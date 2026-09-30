"""
Test suite for Patient Context Lambda function
"""
import json
import pytest
from unittest.mock import Mock, patch

# Import handler
import sys
sys.path.insert(0, '../lambda/patient-context')
from handler import lambda_handler

class TestPatientContextFunction:
    """Test Patient Context Tool"""
    
    @patch('handler.dynamodb')
    @patch('handler.ssm')
    def test_retrieve_relevant_context(self, mock_ssm, mock_dynamodb):
        """Test retrieving relevant patient context"""
        
        # Mock SSM
        mock_ssm.get_parameter.return_value = {
            'Parameter': {'Value': 'test-patients-table'}
        }
        
        # Mock DynamoDB
        mock_table = Mock()
        mock_table.get_item.return_value = {
            'Item': {
                'patient_id': 'P001',
                'name': 'Gary Ahmed',
                'age': 45,
                'language_preference': 'english',
                'current_medications': [
                    {'name': 'Lisinopril', 'dose': '10mg'}
                ],
                'allergies': [
                    {'allergen': 'Penicillin', 'reaction': 'Rash'}
                ],
                'medical_history': [
                    {'condition': 'Hypertension', 'status': 'ongoing'}
                ]
            }
        }
        mock_dynamodb.Table.return_value = mock_table
        
        # Test event
        event = {
            'patient_id': 'P001',
            'context_type': 'relevant'
        }
        
        # Execute
        response = lambda_handler(event, {})
        
        # Assert
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert 'patient_context' in body
        assert body['consent_required'] is True
        assert 'data_minimization' in body
    
    def test_missing_patient_id(self):
        """Test error handling for missing patient_id"""
        
        event = {}
        response = lambda_handler(event, {})
        
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert 'error' in body
    
    @patch('handler.dynamodb')
    @patch('handler.ssm')
    def test_medications_only_context(self, mock_ssm, mock_dynamodb):
        """Test retrieving only medications"""
        
        mock_ssm.get_parameter.return_value = {
            'Parameter': {'Value': 'test-table'}
        }
        
        mock_table = Mock()
        mock_table.get_item.return_value = {
            'Item': {
                'patient_id': 'P001',
                'current_medications': [
                    {'name': 'Lisinopril', 'dose': '10mg'}
                ]
            }
        }
        mock_dynamodb.Table.return_value = mock_table
        
        event = {
            'patient_id': 'P001',
            'context_type': 'medications'
        }
        
        response = lambda_handler(event, {})
        body = json.loads(response['body'])
        
        # Should only include medications
        assert 'current_medications' in body['patient_context']
        assert 'medical_history' not in body['patient_context']
    
    @patch('handler.dynamodb')
    @patch('handler.ssm')
    def test_patient_not_found(self, mock_ssm, mock_dynamodb):
        """Test handling of non-existent patient"""
        
        mock_ssm.get_parameter.return_value = {
            'Parameter': {'Value': 'test-table'}
        }
        
        mock_table = Mock()
        mock_table.get_item.return_value = {}  # No Item
        mock_dynamodb.Table.return_value = mock_table
        
        event = {
            'patient_id': 'NONEXISTENT',
            'context_type': 'relevant'
        }
        
        response = lambda_handler(event, {})
        
        assert response['statusCode'] == 404
        body = json.loads(response['body'])
        assert 'error' in body

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
