# MedPAI

MedPAI is an early-stage health-technology project exploring how digital tools can help bridge traditional herbal medicine and orthodox healthcare in Nigeria.

## Current status

This project is under active development. The repository contains a React, TypeScript, and Vite application with interface areas for patient triage, pharmacy and hospital dashboards, herbal/plant scanning, safety-oriented workflows, consultations, and patient-care experiences. The presence of a screen or component does not mean that feature is complete, production-ready, or clinically validated.

## Why MedPAI

People may encounter fragmented health information across traditional remedies and formal healthcare. MedPAI explores whether carefully designed digital workflows can help organize information and make evidence and uncertainty easier to review.

**MedPAI is not a substitute for a qualified clinician, pharmacist, poison-control service, or emergency care.** It does not establish that a traditional remedy is effective or safe. Clinical validation and appropriate expert review are required before any feature is used to guide real-world care.

## Technology

- React and TypeScript
- Vite
- Supabase integration
- Tailwind CSS and component libraries

See `package.json` for dependencies and available scripts.

## Getting started

Requirements: a supported Node.js LTS release and npm.

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Create a local `.env` file based on `.env.example` and add values from your own development project. Never commit credentials, private keys, access tokens, or production secrets.
4. Start the development server with `npm run dev`.

Available scripts include `npm run dev`, `npm run build`, `npm run lint`, `npm test`, and `npm run preview`.

Some workflows may require external services and environment variables to be configured before they work.

## Safety, privacy, and clinical validation

MedPAI is a development project, not a clinically validated medical device or clinical decision-support service. Do not use it to diagnose, prescribe, calculate treatment, decide whether a remedy is safe, or make urgent-care decisions. Do not enter real patient data or sensitive personal information into an unvalidated development environment.

Before any real-world health use, workflows require appropriate clinical and pharmacy review, evidence verification, privacy and data-protection review, security testing, and validation in the intended setting. Automated outputs must not be treated as established medical evidence.

## Security

- Keep local environment files and credentials out of version control.
- Use least-privilege access and separate development from production credentials.
- Review dependencies and authentication/authorization rules before deployment.
- Report security concerns privately to the maintainer.

If a credential has ever been committed, deleting the file is not enough: revoke or rotate the credential with its service provider and review repository history.

## Roadmap

- Document and test existing workflows
- Improve source traceability and evidence organization
- Strengthen authentication, authorization, and security practices
- Review privacy and data-handling requirements
- Seek clinical and pharmacy expertise before real-world use
- Improve setup documentation for developers

These are goals, not claims of completed functionality.

## Licence and contributions

The repository's licence and contribution terms should be reviewed before others rely on, redistribute, or build on its code. Until an explicit licence is added, do not assume the code is licensed for reuse. Issues and suggestions should describe the problem and reproduction steps without including sensitive health information.

## Maintainer

MedPAI is developed by the founder of Desbricks Crew, a Nigerian pharmacy student exploring responsible health technology.

## Disclaimer

MedPAI is provided for software development and evaluation only. It is not medical advice and is not intended for clinical use. No claim of clinical effectiveness, safety, regulatory approval, or clinical validation is made.
