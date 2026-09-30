#!/bin/bash

# CareBridge UAE Backend Deployment Script
# This script deploys the infrastructure and loads synthetic data

set -e

PROJECT_NAME="carebridge-uae"
REGION="us-west-2"
STACK_NAME="${PROJECT_NAME}-stack"

echo "========================================="
echo "CareBridge UAE Backend Deployment"
echo "========================================="
echo ""

# Step 1: Deploy CloudFormation Stack
echo "Step 1: Deploying CloudFormation stack..."
aws cloudformation deploy \
    --template-file infrastructure/cloudformation-template.yaml \
    --stack-name $STACK_NAME \
    --parameter-overrides ProjectName=$PROJECT_NAME \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $REGION

echo "✓ Infrastructure deployed"
echo ""

# Step 2: Get table names from stack outputs
echo "Step 2: Retrieving resource information..."
PATIENTS_TABLE=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`PatientsTableName`].OutputValue' \
    --output text \
    --region $REGION)

PROVIDERS_TABLE=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`ProvidersTableName`].OutputValue' \
    --output text \
    --region $REGION)

echo "  Patients Table: $PATIENTS_TABLE"
echo "  Providers Table: $PROVIDERS_TABLE"
echo ""

# Step 3: Load synthetic patient data
echo "Step 3: Loading synthetic patient data..."
python3 scripts/load_patients.py \
    --table $PATIENTS_TABLE \
    --region $REGION

echo "✓ Patient data loaded"
echo ""

# Step 4: Load mock provider data
echo "Step 4: Loading mock provider data..."
python3 scripts/load_providers.py \
    --table $PROVIDERS_TABLE \
    --region $REGION

echo "✓ Provider data loaded"
echo ""

# Step 5: Package and deploy Lambda functions
echo "Step 5: Deploying Lambda functions..."

for func in patient-context medication-interaction provider-search booking visit-summary; do
    echo "  Deploying $func..."
    cd lambda/$func
    zip -q function.zip handler.py
    aws lambda update-function-code \
        --function-name "${PROJECT_NAME}-${func}" \
        --zip-file fileb://function.zip \
        --region $REGION > /dev/null
    rm function.zip
    cd ../..
    echo "  ✓ $func deployed"
done

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Create Bedrock Knowledge Base for triage guidance"
echo "2. Create Bedrock Guardrails with denied topics"
echo "3. Update SSM parameters with KB and Guardrail IDs"
echo "4. Deploy CareBridgeHealthAgent to AgentCore Runtime"
echo ""
echo "Test with:"
echo "  aws lambda invoke --function-name ${PROJECT_NAME}-patient-context \\"
echo "    --payload '{\"patient_id\":\"P001\",\"context_type\":\"relevant\"}' \\"
echo "    response.json"
echo ""
