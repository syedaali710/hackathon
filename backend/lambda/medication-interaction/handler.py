"""
Medication Interaction Tool - Checks medication reference information
"""
import json
import boto3
from typing import List, Dict, Any

# Knowledge Base client for medication reference
bedrock_agent = boto3.client('bedrock-agent-runtime')
ssm = boto3.client('ssm')

def get_knowledge_base_id():
    """Retrieve Knowledge Base ID from SSM Parameter Store"""
    try:
        response = ssm.get_parameter(
            Name='/app/workshop/health-companion/knowledge-base-id'
        )
        return response['Parameter']['Value']
    except Exception as e:
        print(f"Error retrieving KB ID from SSM: {str(e)}")
        raise

def lambda_handler(event, context):
    """
    Checks medication interactions and reference information
    
    Parameters:
    - medications: List of medication names
    
    Returns:
    - Potential interactions flagged for clinical review
    - Reference information from Knowledge Base
    """
    try:
        # Parse input
        medications = event.get('medications', [])
        
        if not medications or len(medications) == 0:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'medications list is required'
                })
            }
        
        # Query Knowledge Base for medication reference information
        kb_id = get_knowledge_base_id()
        
        # Build query for medication interactions
        medication_names = ', '.join([m.get('name', m) if isinstance(m, dict) else m for m in medications])
        query = f"Check for interactions between: {medication_names}"
        
        # Retrieve from Knowledge Base
        kb_response = bedrock_agent.retrieve(
            knowledgeBaseId=kb_id,
            retrievalQuery={
                'text': query
            },
            retrievalConfiguration={
                'vectorSearchConfiguration': {
                    'numberOfResults': 5
                }
            }
        )
        
        # Process results
        interactions = []
        for result in kb_response.get('retrievalResults', []):
            content = result.get('content', {}).get('text', '')
            score = result.get('score', 0)
            
            if score > 0.7:  # Relevance threshold
                interactions.append({
                    'reference_information': content,
                    'relevance_score': score
                })
        
        # Flag for clinical review
        has_potential_issues = len(interactions) > 0
        
        # Log event without medication details
        print(f"Medication reference check completed (items checked: {len(medications)})")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'checked_medications_count': len(medications),
                'has_potential_issues': has_potential_issues,
                'clinical_review_recommended': has_potential_issues,
                'reference_information': interactions[:3] if interactions else [],
                'disclaimer': 'This is reference information only. Discuss with clinician or pharmacist.',
                'safety_note': 'Do not change medications without professional guidance'
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
