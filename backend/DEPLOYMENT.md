# CareBridge UAE - Deployment Guide

## Prerequisites

1. **AWS CLI** installed and configured
   - Version 2.x or higher
   - Credentials configured with appropriate permissions

2. **Python 3.11+** installed
   - With pip for package management

3. **Required AWS Permissions**
   - CloudFormation
   - DynamoDB
   - Lambda
   - IAM
   - SSM Parameter Store
   - Amazon Bedrock
   - S3 (for Lambda deployment packages)

## Deployment Steps

### 1. Install Dependencies

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Deploy Infrastructure

**On Windows (PowerShell):**
```powershell
cd infrastructure
.\deploy.ps1
```

**On Linux/Mac:**
```bash
cd infrastructure
chmod +x deploy.sh
./deploy.sh
```

This will:
- Deploy CloudFormation stack with DynamoDB tables
- Create SSM parameters
- Deploy Lambda functions
- Load synthetic patient and provider data

### 3. Setup Knowledge Base

```bash
cd scripts
python setup_knowledge_base.py
```

You'll need:
- IAM Role ARN for Knowledge Base
- S3 bucket name for guidance documents

Upload triage guidance documents to S3:
```bash
aws s3 cp guidance/ s3://YOUR-BUCKET/guidance/ --recursive
```

### 4. Setup Guardrails

```bash
python setup_guardrails.py
```

This creates Bedrock Guardrails with denied topics:
- Medical diagnosis
- Medication prescribing
- Medication dosing
- Treatment recommendations

### 5. Verify Deployment

Test individual Lambda functions:

```bash
# Test Patient Context
aws lambda invoke \
  --function-name carebridge-uae-patient-context \
  --payload '{"patient_id":"P001","context_type":"relevant"}' \
  response.json

# Test Provider Search
aws lambda invoke \
  --function-name carebridge-uae-provider-search \
  --payload '{"specialty":"Neurology","location":"Dubai"}' \
  response.json

# Test Booking (without confirmation - should fail)
aws lambda invoke \
  --function-name carebridge-uae-booking \
  --payload '{"provider_id":"PR001","patient_id":"P001","date":"2024-10-01","time":"09:00","user_confirmed":false}' \
  response.json
```

### 6. Deploy Agent to Bedrock AgentCore

Create the CareBridgeHealthAgent:

1. Navigate to Amazon Bedrock console
2. Create new Agent with AgentCore Runtime
3. Upload system prompt from `agent/system-prompt.txt`
4. Attach Guardrails (from Step 4)
5. Configure tools to call Lambda functions
6. Enable AgentCore Memory with restricted fields
7. Test agent with demo scenarios

## Configuration

### SSM Parameters

All configuration is stored in SSM Parameter Store:

- `/app/workshop/health-companion/patients-table` - DynamoDB patients table
- `/app/workshop/health-companion/providers-table` - DynamoDB providers table
- `/app/workshop/health-companion/knowledge-base-id` - Bedrock KB ID
- `/app/workshop/guardrails/guardrail-id` - Bedrock Guardrail ID
- `/app/workshop/lambda/execution-role-arn` - Lambda execution role

### Environment Variables

Lambda functions read from SSM at runtime. No hardcoded values.

## Testing

Run unit tests:

```bash
cd tests
pytest -v
```

Run specific test suite:

```bash
pytest test_patient_context.py -v
pytest test_booking.py -v
pytest test_visit_summary.py -v
```

## Monitoring

### CloudWatch Logs

Lambda logs are in CloudWatch Log Groups:
- `/aws/lambda/carebridge-uae-patient-context`
- `/aws/lambda/carebridge-uae-medication-interaction`
- `/aws/lambda/carebridge-uae-provider-search`
- `/aws/lambda/carebridge-uae-booking`
- `/aws/lambda/carebridge-uae-visit-summary`

### Important: PHI Protection

Logs are configured to NOT include:
- Patient names or identifiers
- Symptom details
- Medication names
- Allergy information
- Any protected health information

Only non-sensitive activity events are logged.

## Cleanup

To remove all resources:

```bash
# Delete CloudFormation stack
aws cloudformation delete-stack \
  --stack-name carebridge-uae-stack \
  --region us-west-2

# Delete SSM parameters
aws ssm delete-parameters \
  --names \
    /app/workshop/health-companion/patients-table \
    /app/workshop/health-companion/providers-table \
    /app/workshop/health-companion/knowledge-base-id \
    /app/workshop/guardrails/guardrail-id \
    /app/workshop/lambda/execution-role-arn
```

## Troubleshooting

### Lambda Function Errors

Check CloudWatch Logs for the specific function.

### DynamoDB Access Issues

Verify Lambda execution role has DynamoDB permissions:
```bash
aws iam get-role-policy \
  --role-name carebridge-uae-lambda-execution-role \
  --policy-name DynamoDBAccess
```

### SSM Parameter Not Found

Verify parameters exist:
```bash
aws ssm get-parameters \
  --names \
    /app/workshop/health-companion/patients-table \
    /app/workshop/health-companion/providers-table
```

### Bedrock Access Issues

Ensure region is us-west-2 and Bedrock is enabled in your account.

## Support

For issues:
1. Check CloudWatch Logs
2. Verify AWS credentials and permissions
3. Ensure all SSM parameters are set
4. Review deployment logs

## Safety Notes

⚠️ **This is a prototype using synthetic data**

- Do not use with real patient information
- Do not deploy to production environments
- Mock provider data only
- Simulated bookings only
- Not a medical device

## Next Steps

After successful deployment:
1. Build web UI (bilingual, RTL-capable)
2. Implement care snapshot consent flow
3. Add activity timeline visualization
4. Create demo video
5. Update README with architecture diagram
