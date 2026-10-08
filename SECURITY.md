# Security Policy

MedPAI is an early-stage health-technology project and is not approved for clinical use. Security reports are welcome; please handle them responsibly.

## Supported versions

Until a formal release process is established, security fixes are considered for the latest code on the `main` branch. There are no guarantees of support or response times.

## Reporting a vulnerability

**Please do not report exploitable vulnerabilities in a public GitHub issue.** Use GitHub's private vulnerability reporting feature for this repository if it is enabled. If it is not enabled, contact the maintainer using the contact details published in the repository's official profile or project site, and ask for a private channel.

Include:
- A concise description and potential impact.
- The affected path, component, endpoint, or configuration.
- Reproduction steps and a minimal proof of concept, if safe.
- Any suggested mitigation.

Do not include real patient information, credentials, access tokens, or other people's private data. Redact secrets from logs and screenshots.

## Response expectations

The project is maintained on a best-effort basis. The maintainer will assess the report, may request clarifying details, and will coordinate a fix or mitigation where feasible. Do not assume a particular response or remediation deadline.

## Health-data safety

Do not test against real patients, production clinical workflows, or data you are not authorized to access. Do not submit real patient data to this repository or its issue tracker.

If a credential has been committed, deleting the file is not enough. Revoke or rotate the credential with the issuing service and review Git history and deployment logs.
