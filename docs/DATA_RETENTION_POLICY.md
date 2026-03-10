## Coconut Data Retention and Deletion Policy

### 1. Purpose and scope

This policy describes how long Coconut retains different types of data and how that data is deleted when no longer needed. It applies to all personal and financial data processed by Coconut, including data received from Plaid.

### 2. Data categories

For the purposes of this policy, Coconut handles the following categories of data:

- **Account and profile data** – user identifiers, email address, profile information, authentication metadata.
- **Financial account data** – identifiers and metadata for accounts connected via Plaid (e.g., institution, account type, last four digits).
- **Transaction data** – transaction records (amounts, dates, merchants, categories, enriched metadata).
- **Derived insights** – summaries, subscription detections, budgets, and other analytics derived from transaction data.
- **Operational data** – logs, metrics, and diagnostic information.

### 3. Retention principles

- Coconut retains data **only as long as necessary** to:
  - Provide and improve the service to the user
  - Meet legal, regulatory, tax, or accounting obligations
  - Enforce our terms, prevent abuse, and secure the platform
- Where possible, Coconut prefers **de-identification** or aggregation over long-term retention of raw data.

### 4. Standard retention periods

The following are Coconut's default retention targets. Actual legal requirements may override these targets in some jurisdictions; in such cases, the longer required period applies.

- **Active accounts**
  - Account/profile data, connected institutions, and transaction history are retained for the life of the account so that Coconut can function as expected.
  - Derived insights (e.g., subscription detection results, summaries) are stored as long as they remain relevant to the user experience.
- **Disconnected institutions**
  - When a user disconnects a financial institution, Coconut stops initiating new Plaid syncs for that institution.
  - Related access tokens are removed or revoked where applicable.
  - Associated financial data may be retained for a limited period for historical reporting and reconciliation, after which it is deleted or irreversibly de-identified in line with this policy.
- **Closed / deleted accounts**
  - When a user deletes their account (or otherwise requests deletion), Coconut will:
    - Delete or de-identify profile data, Plaid tokens, and associated transaction records within a reasonable period, typically within 30–60 days, subject to legal or operational constraints.
    - Remove or anonymize derived insights and cached analytics based on that user's data.
- **Logs and backups**
  - Application logs and diagnostic data are retained for a limited period (e.g., 30–90 days) to support debugging, security investigations, and operational stability.
  - Database and file backups are kept for a defined backup window (e.g., up to 90 days) to support disaster recovery. Data in backups is not modified retroactively but ages out and is destroyed as backups roll over.

### 5. Deletion and de-identification

When data reaches the end of its retention period or when a valid deletion request is received, Coconut takes one or more of the following actions:

- **Logical deletion / tombstoning**
  - User records may be marked as deleted to prevent further use while preserving minimal metadata required for abuse prevention or legal compliance.
- **Physical deletion**
  - Records are permanently removed from active databases and storage where feasible.
- **De-identification / anonymization**
  - Where full deletion would materially impact the integrity of aggregated analytics, Coconut may strip identifiers so that remaining records cannot reasonably be linked back to an individual user.

### 6. User rights and requests

- Users can initiate account deletion from within the product (where available) or by contacting support.
- Upon receiving a verifiable deletion request, Coconut will:
  - Authenticate the requester
  - Identify all reasonably associated records across systems
  - Perform deletion or de-identification as described above
  - Confirm completion to the user where appropriate

### 7. Responsibilities

- Engineering and operations teams are responsible for implementing this policy in application logic, database schemas, and operational processes.
- The security and privacy owner is responsible for:
  - Maintaining this policy
  - Coordinating responses to deletion and data access requests
  - Ensuring that retention configurations in infrastructure (e.g., logs, backups) match the intended timelines

### 8. Review

- This policy is reviewed at least annually, and whenever there are material changes to:
  - The categories of data collected
  - How long data is stored
  - Where or how data is processed (e.g., new storage systems or regions)
