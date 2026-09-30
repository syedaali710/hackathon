# CareBridge UAE Backend

## Architecture Overview
This backend implements the CareBridge UAE healthcare navigation agent using AWS services.

## Components
- **Amazon Bedrock AgentCore Runtime**: Orchestration agent (CareBridgeHealthAgent)
- **Amazon Bedrock Guardrails**: Safety boundaries for healthcare navigation
- **AWS Lambda**: Tool execution functions
- **DynamoDB**: Synthetic patient profiles and mock provider data
- **Knowledge Base**: Triage, referral, and medication-reference guidance
- **SSM Parameter Store**: Configuration management
- **CloudWatch**: Operational logging (redacted)

## Project Structure
```
backend/
├── infrastructure/          # AWS CDK/CloudFormation templates
├── lambda/                  # Lambda function handlers
│   ├── patient-context/
│   ├── medication-interaction/
│   ├── provider-search/
│   ├── booking/
│   └── visit-summary/
├── agent/                   # Agent configuration
│   ├── system-prompt.txt
│   └── guardrails-config.json
├── data/                    # Synthetic data seeds
│   ├── patients.json
│   └── providers.json
└── tests/                   # Test suites
```

## Safety Constraints
- No diagnosis, prescribing, or treatment recommendations
- Consent-controlled data sharing
- Minimum necessary information principle
- Bilingual Arabic/English output
