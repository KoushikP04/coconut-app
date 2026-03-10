## Coconut Information Security Policy

### 1. Purpose and scope

This document describes how Coconut protects the confidentiality, integrity, and availability of customer data, including financial data received via the Plaid API. It applies to all Coconut team members, contractors, systems, and services that store or process production data.

### 2. Governance and ownership

- **Security owner**: The security program is owned by the engineering leadership team.
- **Contact**: Security-related questions and incident reports can be sent to `security@coconut.money`.
- This policy is reviewed at least annually and whenever there are material changes to our architecture or threat model.

### 3. Access control and identity management

- Access to production systems follows the principle of **least privilege**. Users are granted only the permissions required for their role.
- All access to:
  - Cloud infrastructure
  - Plaid dashboard
  - Source control (e.g., GitHub)
  - CI/CD systems
  is performed via named, individual accounts. Shared root or admin accounts are avoided and, where unavoidable, tightly controlled and monitored.
- Role-based access control (RBAC) is used where supported by the platform (e.g., cloud IAM roles, GitHub roles).
- Access to production data is limited to a small set of authorized personnel for support and operational purposes. Access is logged and auditable.
- Onboarding and offboarding checklists ensure that:
  - New team members are provisioned with the minimal required access.
  - Departing team members have access revoked promptly, including cloud, source control, and third-party tools.

### 4. Multi-factor authentication (MFA)

- **Internal/admin systems**
  - MFA is required for:
    - Plaid dashboard accounts
    - Cloud provider console accounts
    - Source control and CI/CD accounts (e.g., GitHub)
    - Any administrative tools that can access production data
  - MFA methods include TOTP, security keys, or platform authenticators.
- **End-user accounts**
  - Coconut supports multi-factor authentication for end users via our authentication provider.
  - In production, users are required to have multi-factor authentication enabled on their account before linking a real bank account via Plaid. The application enforces this by gating the Plaid Link flow when MFA is not enabled.

### 5. Encryption

#### 5.1 Data in transit

- All communication between clients and Coconut servers uses HTTPS with TLS 1.2 or higher.
- HSTS is enabled at the edge where supported.
- Internal service-to-service communication also uses TLS where applicable (e.g., managed database connections).

#### 5.2 Data at rest

- Production databases and storage backing Coconut are encrypted at rest using cloud-provider managed keys (e.g., KMS).
- Plaid secrets, access tokens, and other credentials are stored in environment variables or managed secret stores and are never committed to source control.
- Local developer environments should not contain long-lived production secrets. Access to production secrets is restricted and auditable.

### 6. Application security and development practices

- All code changes are managed through version control and undergo review via pull requests before deployment.
- Automated tests and linting are run in CI where applicable.
- Sensitive information (such as full Plaid responses, access tokens, or credentials) is not logged. Logs are structured and access-controlled.
- Dependencies are pinned and updated regularly using automated tooling (e.g., Dependabot or equivalent) and manual review.

### 7. Vulnerability management

- **Dependencies and code**
  - Automated dependency scanning tools are enabled for the main repositories.
  - High and critical vulnerabilities in direct dependencies are prioritized for remediation.
- **Infrastructure**
  - Production operating systems and managed services are kept up to date with security patches using provider-managed updates and periodic reviews.
- **Endpoints (laptops and workstations)**
  - Employee and contractor devices are required to use:
    - Full-disk encryption (e.g., FileVault on macOS)
    - OS-level authentication with strong passwords or biometrics
    - Automatic screen lock and idle timeout
  - Devices run up-to-date operating systems and security patches.

### 8. Logging and monitoring

- Application and infrastructure logs are collected centrally where possible.
- Access to logs is restricted to authorized team members.
- Authentication attempts, administrative actions, and other security-relevant events are logged and can be reviewed during investigations.

### 9. Incident response

- Security incidents are reported to `security@coconut.money` or via the engineering leadership team.
- On receiving a report, the team:
  1. Triage and classify the incident (e.g., suspected breach, credential leak, availability issue).
  2. Contain the incident (e.g., revoke credentials, block traffic, disable affected accounts).
  3. Eradicate the root cause (e.g., patch vulnerability, rotate keys, correct misconfiguration).
  4. Recover systems and verify normal operation.
  5. Perform a post-incident review and track follow-up remediation tasks.
- Where legally required or appropriate, affected users and partners (including Plaid) are notified without undue delay.

### 10. Data protection and privacy

- Coconut collects and processes personal and financial data only as needed to provide the service, as described in the Privacy Policy (`/privacy`).
- Access to financial data is limited to authorized personnel, and only for legitimate operational purposes (e.g., support, debugging).
- Data retention and deletion practices are described in `DATA_RETENTION_POLICY.md` and must be followed by all systems and processes.

### 11. Review and continuous improvement

- This policy and related procedures are reviewed at least annually.
- Significant changes to infrastructure, authentication, or data flows trigger an out-of-cycle review.
- Feedback from security reviews, penetration tests, vendor assessments (including Plaid), and incidents is incorporated into updated controls and documentation.
