# NSOS Student Migration Operating Model

## Purpose

The NSOS **Secure Student Migration** workspace helps a school move approved spreadsheet records into a selected class and academic session without manually recreating every student profile. It is designed for deliberate onboarding, not unattended data ingestion.

## Supported input

An owner or administrator pastes a CSV or tab-separated spreadsheet extract with the required `admissionNo`, `firstName`, and `lastName` columns. Optional student contact and biodata fields may be included, together with one primary guardian’s name, relationship, email, and phone. The interface copies the exact header template and accepts no more than 100 rows per reviewed batch.

## Required controls

| Control | How NSOS enforces it |
|---|---|
| Role and tenant boundary | Only active owners and administrators can preview, import, or view migration batches for their school. Class and session IDs are verified against the same school. |
| Review before write | Every row is validated before an import can be confirmed. Empty names, malformed dates, invalid gender values, invalid emails, incomplete guardian details, duplicate rows, and existing admission numbers are surfaced as row-level errors. |
| Explicit approval | No record is created until the user checks the final confirmation and submits the exact reviewed batch. |
| Duplicate resilience | The batch uses a tenant-scoped idempotency key and checksum. Retrying the same completed request returns its prior result rather than creating duplicate students. |
| Atomic persistence | Students, enrolments, eligible primary guardians, and guardian links are created in one transaction. A failed batch does not leave partial imported records. |
| Data minimisation | Raw spreadsheets are not stored and are not passed to an AI model. Migration history retains only operational counts, status, timestamps, and batch identifiers. |

## Operational guidance

Schools should start with a small approved batch, confirm the student directory and class assignment, then continue in batches of no more than 100 rows. A guardian with the same approved email or phone may be reused inside the batch or from an existing tenant record; no guardian is invented. NSOS does not send portal invitations during migration. Invitations remain a separate administrator-reviewed action after the imported records are checked.

> **Migration is a controlled creation workflow.** It does not alter existing students, publish family information, send messages, approve payments, or activate financial or website settings.
