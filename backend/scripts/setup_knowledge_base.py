"""
Setup script for Bedrock Knowledge Base
Creates and configures the triage guidance knowledge base
"""
import boto3
import json
import time
from pathlib import Path

def create_knowledge_base(kb_name, role_arn, s3_bucket):
    """Create Bedrock Knowledge Base"""
    
    bedrock = boto3.client('bedrock-agent')
    
    print(f"Creating Knowledge Base: {kb_name}")
    
    try:
        response = bedrock.create_knowledge_base(
            name=kb_name,
            description='Triage, referral, and medication-reference guidance for CareBridge UAE',
            roleArn=role_arn,
            knowledgeBaseConfiguration={
                'type': 'VECTOR',
                'vectorKnowledgeBaseConfiguration': {
                    'embeddingModelArn': 'arn:aws:bedrock:us-west-2::foundation-model/amazon.titan-embed-text-v1'
                }
            },
            storageConfiguration={
                'type': 'OPENSEARCH_SERVERLESS',
                'opensearchServerlessConfiguration': {
                    'collectionArn': 'COLLECTION_ARN_PLACEHOLDER',
                    'vectorIndexName': 'carebridge-index',
                    'fieldMapping': {
                        'vectorField': 'vector',
                        'textField': 'text',
                        'metadataField': 'metadata'
                    }
                }
            }
        )
        
        kb_id = response['knowledgeBase']['knowledgeBaseId']
        print(f"✓ Knowledge Base created: {kb_id}")
        
        return kb_id
        
    except Exception as e:
        print(f"Error creating Knowledge Base: {str(e)}")
        raise

def create_data_source(kb_id, s3_bucket, role_arn):
    """Create data source for Knowledge Base"""
    
    bedrock = boto3.client('bedrock-agent')
    
    print(f"Creating data source for KB: {kb_id}")
    
    try:
        response = bedrock.create_data_source(
            knowledgeBaseId=kb_id,
            name='triage-guidance-docs',
            description='Triage and referral guidance documents',
            dataSourceConfiguration={
                'type': 'S3',
                's3Configuration': {
                    'bucketArn': f'arn:aws:s3:::{s3_bucket}',
                    'inclusionPrefixes': ['guidance/']
                }
            }
        )
        
        ds_id = response['dataSource']['dataSourceId']
        print(f"✓ Data source created: {ds_id}")
        
        return ds_id
        
    except Exception as e:
        print(f"Error creating data source: {str(e)}")
        raise

def ingest_documents(kb_id, ds_id):
    """Start ingestion job"""
    
    bedrock = boto3.client('bedrock-agent')
    
    print("Starting document ingestion...")
    
    try:
        response = bedrock.start_ingestion_job(
            knowledgeBaseId=kb_id,
            dataSourceId=ds_id
        )
        
        job_id = response['ingestionJob']['ingestionJobId']
        print(f"✓ Ingestion job started: {job_id}")
        
        # Wait for completion
        while True:
            status = bedrock.get_ingestion_job(
                knowledgeBaseId=kb_id,
                dataSourceId=ds_id,
                ingestionJobId=job_id
            )
            
            state = status['ingestionJob']['status']
            print(f"  Ingestion status: {state}")
            
            if state == 'COMPLETE':
                print("✓ Ingestion complete")
                break
            elif state == 'FAILED':
                print("✗ Ingestion failed")
                break
            
            time.sleep(10)
        
    except Exception as e:
        print(f"Error during ingestion: {str(e)}")
        raise

def update_ssm_parameter(kb_id):
    """Update SSM parameter with Knowledge Base ID"""
    
    ssm = boto3.client('ssm')
    
    try:
        ssm.put_parameter(
            Name='/app/workshop/health-companion/knowledge-base-id',
            Value=kb_id,
            Type='String',
            Overwrite=True
        )
        print(f"✓ Updated SSM parameter with KB ID: {kb_id}")
    except Exception as e:
        print(f"Error updating SSM: {str(e)}")
        raise

def main():
    """Main setup flow"""
    
    print("========================================")
    print("CareBridge UAE Knowledge Base Setup")
    print("========================================\n")
    
    # Configuration
    KB_NAME = "carebridge-uae-knowledge-base"
    ROLE_ARN = input("Enter IAM Role ARN for Knowledge Base: ")
    S3_BUCKET = input("Enter S3 bucket name for documents: ")
    
    # Create KB
    kb_id = create_knowledge_base(KB_NAME, ROLE_ARN, S3_BUCKET)
    
    # Create data source
    ds_id = create_data_source(kb_id, S3_BUCKET, ROLE_ARN)
    
    # Ingest documents
    ingest_documents(kb_id, ds_id)
    
    # Update SSM
    update_ssm_parameter(kb_id)
    
    print("\n========================================")
    print("Knowledge Base Setup Complete!")
    print("========================================")
    print(f"Knowledge Base ID: {kb_id}")
    print(f"Data Source ID: {ds_id}")
    print("\nNext: Upload triage guidance documents to S3")

if __name__ == '__main__':
    main()
