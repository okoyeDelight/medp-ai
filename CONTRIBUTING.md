# Contributing to MedPAI

Thank you for your interest in improving MedPAI. The project is under active development; its interfaces and internal APIs may change.

## Before contributing

- Read the [README](README.md) and [Security Policy](SECURITY.md).
- Check existing issues and pull requests before starting substantial work.
- For major changes, open an issue first to discuss scope and avoid duplicated effort.
- Do not submit real patient information, credentials, access tokens, or confidential clinical records.
- Do not present unvalidated herbal, drug-interaction, plant-identification, or AI-generated content as established clinical evidence.

## Development setup

1. Install a supported Node.js LTS release and npm.
2. Clone the repository and run `npm ci`.
3. Copy `.env.example` to `.env` and configure a development Supabase project you control.
4. Never use production credentials for local development.
5. Run `npm run dev`.

## Before opening a pull request

Run the checks that apply to your change:

```sh
npm run lint
npm test
npm run build
```

Explain any check that cannot be run. Include relevant tests and screenshots for user-interface changes, but ensure screenshots contain no personal or health information.

## Pull request expectations

- Keep changes focused and explain the problem they solve.
- Describe the approach, user impact, and any migration or configuration changes.
- Add or update tests for changed behavior where practical.
- Document new environment variables in `.env.example`; never put real values there.
- For database changes, include a reviewed migration and describe the access-control implications.
- For health-related behavior, document evidence sources, uncertainty, known limitations, and required expert review.
- Do not claim clinical validation, regulatory approval, or production readiness unless independently established.
- Avoid introducing analytics or telemetry that collects sensitive information without explicit review.

## Clinical and safety boundary

MedPAI is a software development project, not a substitute for a clinician or pharmacist. Contributions that influence triage, treatment, plant identification, dosage, or interaction warnings require qualified clinical/pharmacy review before any real-world use. Tests passing does not establish clinical safety.

## Licence

The repository currently does not declare an open-source licence. Do not assume you have permission to redistribute or reuse the code beyond rights provided by applicable law. The maintainer must resolve the repository licence and ensure it is consistent with the application's Terms of Service before accepting contributions for reuse.
