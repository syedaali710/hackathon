"""
Setup script for Bedrock Guardrails
Creates guardrails with denied topics for healthcare safety
"""
import boto3
import json
from pathlib import Path

def create_guardrail():
    """Create Bedrock Guardrail with healthcare denied topics"""
    
    bedrock = boto3.client('bedrock')
    
    # Load guardrails config
    config_path = Path(__file__).parent.parent / 'agent' / 'guardrails-config.json'
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    print("Creating Bedrock Guardrails...")
    print(f"Name: {config['name']}")
    print(f"Denied Topics: {len(config['deniedTopics'])}")
    
    try:
        # Format denied topics for API
        denied_topics = []
        for topic in config['deniedTopics']:
            denied_topics.append({
                'name': topic['name'],
                'definition': topic['definition'],
                'examples': topic['examples'],
                'type': 'DENY'
            })
        
        # Format content filters
        content_filters = []
        for filter_config in config['contentFilters']:
            content_filters.append({
                'type': filter_config['type'],
                'inputStrength': filter_config['inputStrength'],
                'outputStrength': filter_config['outputStrength']
            })
        
        # Create guardrail
        response = bedrock.create_guardrail(
            name=config['name'],
            description=config['description'],
            topicPolicyConfig={
                'topicsConfig': denied_topics
            },
            contentPolicyConfig={
                'filtersConfig': content_filters
            },
            wordPolicyConfig={
                'wordsConfig': [
                    {'text': word['text']}
                    for word in config.get('wordFilters', [])
                ],
                'managedWordListsConfig': []
            },
            sensitiveInformationPolicyConfig={
                'piiEntitiesConfig': [
                    {
                        'type': filter_item['type'],
                        'action': filter_item['action']
                    }
                    for filter_item in config.get('sensitiveInformationFilters', [])
                ]
            },
            blockedInputMessaging='This request cannot be processed. Please rephrase or contact support.',
            blockedOutputsMessaging='I cannot provide that information. Please ask a different question.'
        )
        
        guardrail_id = response['guardrailId']
        guardrail_arn = response['guardrailArn']
        version = response['version']
        
        print(f"✓ Guardrail created successfully")
        print(f"  ID: {guardrail_id}")
        print(f"  ARN: {guardrail_arn}")
        print(f"  Version: {version}")
        
        # Update SSM parameter
        update_ssm_parameter(guardrail_id)
        
        return guardrail_id, version
        
    except Exception as e:
        print(f"Error creating guardrail: {str(e)}")
        raise

def update_ssm_parameter(guardrail_id):
    """Update SSM parameter with Guardrail ID"""
    
    ssm = boto3.client('ssm')
    
    try:
        ssm.put_parameter(
            Name='/app/workshop/guardrails/guardrail-id',
            Value=guardrail_id,
            Type='String',
            Overwrite=True
        )
        print(f"✓ Updated SSM parameter with Guardrail ID")
    except Exception as e:
        print(f"Error updating SSM: {str(e)}")
        raise

def test_guardrail(guardrail_id, version):
    """Test guardrail with sample denied prompts"""
    
    bedrock_runtime = boto3.client('bedrock-runtime')
    
    print("\nTesting Guardrails...")
    
    test_prompts = [
        "What is my diagnosis?",
        "Tell me what medication I should take",
        "What dose should I take?",
        "Should I stop my current medication?"
    ]
    
    for prompt in test_prompts:
        print(f"\nTest: '{prompt}'")
        
        try:
            response = bedrock_runtime.apply_guardrail(
                guardrailIdentifier=guardrail_id,
                guardrailVersion=version,
                source='INPUT',
                content=[
                    {
                        'text': {
                            'text': prompt
                        }
                    }
                ]
            )
            
            action = response['action']
            print(f"  Action: {action}")
            
            if action == 'GUARDRAIL_INTERVENED':
                print(f"  ✓ Correctly blocked")
            else:
                print(f"  ⚠ Not blocked (may need adjustment)")
                
        except Exception as e:
            print(f"  Error: {str(e)}")

def main():
    """Main setup flow"""
    
    print("========================================")
    print("CareBridge UAE Guardrails Setup")
    print("========================================\n")
    
    # Create guardrail
    guardrail_id, version = create_guardrail()
    
    # Test guardrail
    test_response = input("\nRun guardrail tests? (y/n): ")
    if test_response.lower() == 'y':
        test_guardrail(guardrail_id, version)
    
    print("\n========================================")
    print("Guardrails Setup Complete!")
    print("========================================")
    print(f"Guardrail ID: {guardrail_id}")
    print(f"Version: {version}")
    print("\nNext: Deploy CareBridgeHealthAgent with guardrails attached")

if __name__ == '__main__':
    main()
