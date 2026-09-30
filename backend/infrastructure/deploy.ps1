# CareBridge UAE Backend Deployment Script (PowerShell)
# This script deploys the infrastructure and loads synthetic data

$ErrorActionPreference = "Stop"

$PROJECT_NAME = "carebridge-uae"
$REGION = "us-west-2"
$STACK_NAME = "$PROJECT_NAME-stack"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "CareBridge UAE Backend Deployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Deploy CloudFormation Stack
Write-Host "Step 1: Deploying CloudFormation stack..." -ForegroundColor Yellow
aws cloudformation deploy `
    --template-file infrastructure/cloudformation-template.yaml `
    --stack-name $STACK_NAME `
    --parameter-overrides ProjectName=$PROJECT_NAME `
    --capabilities CAPABILITY_NAMED_IAM `
    --region $REGION

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Infrastructure deployed" -ForegroundColor Green
} else {
    Write-Host "✗ Deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Get table names from stack outputs
Write-Host "Step 2: Retrieving resource information..." -ForegroundColor Yellow
$PATIENTS_TABLE = aws cloudformation describe-stacks `
    --stack-name $STACK_NAME `
    --query 'Stacks[0].Outputs[?OutputKey==`PatientsTableName`].OutputValue' `
    --output text `
    --region $REGION

$PROVIDERS_TABLE = aws cloudformation describe-stacks `
    --stack-name $STACK_NAME `
    --query 'Stacks[0].Outputs[?OutputKey==`ProvidersTableName`].OutputValue' `
    --output text `
    --region $REGION

Write-Host "  Patients Table: $PATIENTS_TABLE" -ForegroundColor Cyan
Write-Host "  Providers Table: $PROVIDERS_TABLE" -ForegroundColor Cyan
Write-Host ""

# Step 3: Load synthetic patient data
Write-Host "Step 3: Loading synthetic patient data..." -ForegroundColor Yellow
python scripts/load_patients.py `
    --table $PATIENTS_TABLE `
    --region $REGION

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Patient data loaded" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to load patient data" -ForegroundColor Red
}
Write-Host ""

# Step 4: Load mock provider data
Write-Host "Step 4: Loading mock provider data..." -ForegroundColor Yellow
python scripts/load_providers.py `
    --table $PROVIDERS_TABLE `
    --region $REGION

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Provider data loaded" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to load provider data" -ForegroundColor Red
}
Write-Host ""

# Step 5: Package and deploy Lambda functions
Write-Host "Step 5: Deploying Lambda functions..." -ForegroundColor Yellow

$functions = @(
    "patient-context",
    "medication-interaction",
    "provider-search",
    "booking",
    "visit-summary"
)

foreach ($func in $functions) {
    Write-Host "  Deploying $func..." -ForegroundColor Yellow
    
    Push-Location "lambda/$func"
    
    # Create zip file
    if (Test-Path "function.zip") {
        Remove-Item "function.zip"
    }
    Compress-Archive -Path "handler.py" -DestinationPath "function.zip"
    
    # Update Lambda function
    aws lambda update-function-code `
        --function-name "$PROJECT_NAME-$func" `
        --zip-file fileb://function.zip `
        --region $REGION | Out-Null
    
    # Clean up
    Remove-Item "function.zip"
    
    Pop-Location
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ $func deployed" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $func deployment failed" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Create Bedrock Knowledge Base for triage guidance"
Write-Host "2. Create Bedrock Guardrails with denied topics"
Write-Host "3. Update SSM parameters with KB and Guardrail IDs"
Write-Host "4. Deploy CareBridgeHealthAgent to AgentCore Runtime"
Write-Host ""
Write-Host "Test with:" -ForegroundColor Yellow
Write-Host "  aws lambda invoke --function-name $PROJECT_NAME-patient-context \"
Write-Host "    --payload '{`"patient_id`":`"P001`",`"context_type`":`"relevant`"}' \"
Write-Host "    response.json"
Write-Host ""
