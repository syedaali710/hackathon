"""
Provider Search Tool - Searches mock provider directory
"""
import json
import boto3
from datetime import datetime
from typing import List, Dict, Any

dynamodb = boto3.resource('dynamodb')
ssm = boto3.client('ssm')

def get_table_name():
    """Retrieve DynamoDB providers table name from SSM"""
    try:
        response = ssm.get_parameter(
            Name='/app/workshop/health-companion/providers-table'
        )
        return response['Parameter']['Value']
    except Exception as e:
        print(f"Error retrieving table name from SSM: {str(e)}")
        raise

def lambda_handler(event, context):
    """
    Searches for appropriate mock providers
    
    Parameters:
    - specialty: Medical specialty required
    - location: Preferred location/emirate
    - availability_date: Preferred date (optional)
    - language: Preferred language (optional)
    
    Returns:
    - List of matching providers with availability
    """
    try:
        # Parse input
        specialty = event.get('specialty')
        location = event.get('location')
        availability_date = event.get('availability_date')
        language = event.get('language', 'English')
        
        if not specialty:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'specialty is required'
                })
            }
        
        # Get table
        table_name = get_table_name()
        table = dynamodb.Table(table_name)
        
        # Scan for providers (in production, use GSI for better performance)
        response = table.scan()
        providers = response.get('Items', [])
        
        # Filter by specialty
        matching_providers = [
            p for p in providers
            if p.get('specialty', '').lower() == specialty.lower()
        ]
        
        # Filter by location if specified
        if location:
            matching_providers = [
                p for p in matching_providers
                if location.lower() in p.get('location', {}).get('emirate', '').lower()
            ]
        
        # Filter by language if specified
        if language:
            matching_providers = [
                p for p in matching_providers
                if language.lower() in [lang.lower() for lang in p.get('languages', [])]
            ]
        
        # Filter by availability date if specified
        if availability_date:
            matching_providers = [
                p for p in matching_providers
                if any(slot.get('date') == availability_date for slot in p.get('availability', []))
            ]
        
        # Format results
        results = []
        for provider in matching_providers[:5]:  # Limit to top 5 results
            provider_info = {
                'provider_id': provider.get('provider_id'),
                'name': provider.get('name'),
                'specialty': provider.get('specialty'),
                'qualifications': provider.get('qualifications', []),
                'languages': provider.get('languages', []),
                'location': provider.get('location', {}),
                'consultation_fee': provider.get('consultation_fee'),
                'accepts_insurance': provider.get('accepts_insurance'),
                'availability': provider.get('availability', [])[:3]  # Next 3 available dates
            }
            results.append(provider_info)
        
        # Log event without sensitive data
        print(f"Provider search completed (specialty: {specialty}, results: {len(results)})")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'search_criteria': {
                    'specialty': specialty,
                    'location': location,
                    'language': language
                },
                'results_count': len(results),
                'providers': results,
                'disclaimer': 'These are mock providers for prototype demonstration only',
                'next_step': 'User must explicitly confirm appointment booking'
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
