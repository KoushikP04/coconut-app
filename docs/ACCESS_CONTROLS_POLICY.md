# Coconut Access Controls Policy

## Purpose

This document describes the access controls Coconut uses to limit access to production assets and sensitive data, including consumer financial data received via the Plaid API.

## Policy

### 1. Defined and documented access control

- Access control is governed by our Information Security Policy and related procedures.
- Access is granted only when there is a legitimate business need and is removed when no longer required.

### 2. Role-based access control (RBAC)

- Production systems use role-based access control where supported by the platform (e.g., cloud IAM roles, GitHub organization roles, CI/CD permissions).
- Individuals are assigned roles; permissions are attached to roles, not to individual ad-hoc requests.
- Principle of least privilege: users receive only the minimum access necessary for their role.

### 3. Named accounts; no shared credentials

- All access to cloud infrastructure, the Plaid dashboard, source control, and CI/CD is performed via named, individual accounts.
- Shared or generic admin accounts are not used for production access; where unavoidable, they are tightly controlled and monitored.
- Credentials and API secrets (including Plaid credentials) are stored in secure secret management and are never shared or committed to source control.

### 4. Multi-factor authentication (MFA)

- Multi-factor authentication is required for all administrative access to:
  - Cloud provider consoles
  - Plaid dashboard
  - Source control and CI/CD systems
  - Any systems that can access production data
- MFA methods include TOTP (authenticator apps), hardware keys, or platform-managed authentication.

### 5. Access to production data

- Access to systems that store or process consumer financial data is limited to a small set of authorized personnel.
- Access is used only for operational, support, or security purposes and is logged and auditable.

### 6. Periodic access reviews and audits

- Access rights are reviewed on a periodic basis (at least annually) and when roles or employment status change.
- Onboarding and offboarding checklists ensure timely provisioning and revocation of access.
- Audit logs for administrative actions and access to sensitive data are retained and can be reviewed.

## Review

This policy is reviewed at least annually and when there are material changes to our systems or organization.
