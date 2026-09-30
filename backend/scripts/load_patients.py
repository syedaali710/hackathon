"""
Load synthetic patient data into DynamoDB
"""
import json
import boto3
import argparse
from pathlib import Path

def load_patients(table_name, region, data_file):
    """Load patient data from JSON file into DynamoDB"""
    
    # Initialize DynamoDB
    dynamodb = boto3.resource('dynamodb', region_name=region)
    table = dynamodb.Table(table_name)
    
    # Load data file
    data_path = Path(__file__).parent.parent / 'data' / data_file
    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    patients = data.get('patients', [])
    
    print(f"Loading {len(patients)} synthetic patients...")
    
    # Batch write
    with table.batch_writer() as batch:
        for patient in patients:
            batch.put_item(Item=patient)
            print(f"  ✓ Loaded patient: {patient['patient_id']} - {patient['name']}")
    
    print(f"\n✓ Successfully loaded {len(patients)} patients into {table_name}")
    
    # Verify
    response = table.scan(Select='COUNT')
    print(f"  Total items in table: {response['Count']}")

def main():
    parser = argparse.ArgumentParser(description='Load synthetic patient data')
    parser.add_argument('--table', required=True, help='DynamoDB table name')
    parser.add_argument('--region', default='us-west-2', help='AWS region')
    parser.add_argument('--file', default='patients.json', help='Data file name')
    
    args = parser.parse_args()
    
    load_patients(args.table, args.region, args.file)

if __name__ == '__main__':
    main()
