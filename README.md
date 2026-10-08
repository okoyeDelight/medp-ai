# MedPAI

**Exploring safer connections between traditional remedies and modern healthcare.**

MedPAI is an early-stage Nigerian health-technology project investigating how digital tools can help people and healthcare professionals document, review, and communicate information about traditional herbal remedies alongside conventional medicines.

Our long-term thesis is that better information and better workflows could help reduce the disconnect between these two parts of healthcare. We are working toward that vision step by step, beginning with evidence organization, transparent uncertainty, and responsible review.

> **Project stage:** Early development. MedPAI is not clinically validated and is not ready to guide real-world diagnosis, prescribing, dosing, or treatment decisions.

## The problem we are investigating

People may use herbal remedies and conventional medicines within the same care journey, while information about what was taken, why it was taken, what evidence supports it, and what risks may exist can be fragmented or difficult to assess. Healthcare professionals may not always have a structured way to discuss traditional remedy use with patients.

This creates an important question: **can responsible digital workflows make relevant information easier to document, trace, and review—without presenting uncertain information as medical fact?**

MedPAI is being developed to explore that question in the Nigerian healthcare context. The scale of the problem, the needs of specific users, and the best route to adoption must be established through research and field validation.

## The vision: from useful workflows to connected health information

We see a potential path in stages:

1. **Organize information.** Create structured ways to record remedy and medicine information, identify sources, and distinguish verified facts from unverified reports.
2. **Support professional review.** Explore workflows through which pharmacists and other qualified professionals can review a person's reported use of remedies and medicines, with clear limits and appropriate escalation.
3. **Connect care settings.** If the first workflows prove useful and safe, investigate ways for pharmacies, healthcare providers, researchers, and other appropriate partners to exchange relevant information responsibly.
4. **Build for broader relevance.** Over time, assess whether evidence, partnerships, and validated workflows developed in Nigeria can be adapted to other settings where traditional and conventional healthcare intersect.

These stages describe a **long-term direction, not completed capabilities or guaranteed outcomes**. Each depends on evidence, user need, clinical oversight, privacy safeguards, technical reliability, and a sustainable adoption model.

## What MedPAI is building today

The codebase contains a React, TypeScript, and Vite application with interface areas and development work related to patient triage, pharmacy and hospital dashboards, herbal or plant scanning, safety-oriented workflows, consultations, and patient-care experiences.

The existence of a screen, component, or prototype does not mean the feature is complete, connected to verified data, secure for patient use, or clinically validated. We are auditing and strengthening the application before considering any real-world use.

## Who we need to learn from

MedPAI's next stage requires collaboration and direct feedback from people closest to the problem, including:

- Pharmacists and other qualified healthcare professionals
- Traditional medicine practitioners willing to participate in responsible, evidence-aware documentation
- Researchers in pharmacognosy, ethnobotany, public health, pharmacology, and health informatics
- Potential users and community health stakeholders
- Health-tech mentors, implementation partners, and organisations experienced in Nigerian healthcare

We are particularly interested in learning which information gaps matter most, what existing workflows fail to address, what evidence is needed for safe review, and who would adopt or fund a validated solution. These are questions to test, not assumptions about established demand or partnerships.

## What we need to prove next

Our near-term priorities are to:

- Validate the problem and intended workflows through structured conversations and research
- Establish a trustworthy, traceable approach to evidence and data provenance
- Obtain appropriate pharmacist, clinical, and research review for health-related functionality
- Verify authentication, database permissions, privacy controls, and deployed services
- Test the software and document which features actually work
- Define an initial user group, measurable outcome, and realistic route to adoption
- Understand applicable Nigerian data-protection, healthcare, and regulatory requirements

Progress should be measured by evidence and working outcomes—not by the number of features in the interface.

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

Available scripts include `npm run dev`, `npm run build`, `npm run lint`, `npm test`, and `npm run preview`. Some workflows may require external services and environment variables to be configured. Check the latest CI result before assuming that a script or build passes.

## Safety, privacy, and clinical validation

MedPAI is a development project, not a clinically validated medical device or clinical decision-support service. Do not use it to diagnose, prescribe, calculate treatment, decide whether a remedy is safe, or make urgent-care decisions. Do not enter real patient data or sensitive personal information into an unvalidated development environment.

No claim is made here that MedPAI's herbal information, interaction outputs, AI-generated content, or scanning workflows have been clinically validated or approved by a regulator. Automated outputs must not be treated as established medical evidence.

Before any real-world health use, workflows require appropriate clinical and pharmacy review, evidence verification, privacy and data-protection review, security testing, and validation in the intended setting.

## Security

- Keep local environment files and credentials out of version control.
- Use least-privilege access and separate development from production credentials.
- Review dependencies and authentication/authorization rules before deployment.
- Report security concerns privately to the maintainer.

If a credential has ever been committed, deleting the file is not enough: revoke or rotate the credential with its service provider and review repository history.

See the [Supabase security audit](docs/SUPABASE_SECURITY_AUDIT.md) for known review items and the current verification limitations.

## Licence and contributions

The repository's licence and contribution terms should be reviewed before others rely on, redistribute, or build on its code. Until an explicit licence is added, do not assume the code is licensed for reuse. Issues and suggestions should describe the problem and reproduction steps without including sensitive health information.

## Project governance

- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Open-source and security readiness checklist](docs/OPEN_SOURCE_READINESS.md)
- [Supabase security audit](docs/SUPABASE_SECURITY_AUDIT.md)

## Maintainer

MedPAI is being developed by the founder of Desbricks Crew, a Nigerian pharmacy student exploring responsible health technology.

## Disclaimer

MedPAI is provided for software development and evaluation only. It is not medical advice and is not intended for clinical use. No claim of clinical effectiveness, safety, regulatory approval, or clinical validation is made.
