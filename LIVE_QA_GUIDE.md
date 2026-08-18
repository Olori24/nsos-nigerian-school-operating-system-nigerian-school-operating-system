# NSOS Live Workspace Validation Guide

Each school creates and owns its own empty NSOS workspace. The system does not seed learners, guardians, contact details, staff, fees, or real applications.

## Before Using Real Data

The school owner should first configure the academic session, term, classes, subjects, staff roles, fee structure, and public website content. For the first live role review, schools should use internal accounts or clearly designated test accounts and avoid real family contact details until communication settings are approved.

| Role | Confirm in the workspace |
|---|---|
| Owner or administrator | Can manage school settings, website publishing, domain verification, admissions, records, academics, finance, staff, communication, and reporting. |
| Staff | Can record attendance and view the operational modules assigned to staff. |
| Teacher | Can manage academic plans, attendance, and results, but cannot manage finance or the public website. |
| Finance | Can manage fee structures, invoices, payments, receipts, and finance reports without student-record write access. |
| Parent or guardian | Can view only linked wards’ attendance, published results, fees, and announcements. |
| Student | Can view only their own published records and announcements. |

## Website and Custom Domain

Schools may publish their public website from **School website** in NSOS. To activate a custom domain, save the domain, add the displayed DNS TXT verification record, connect that domain to the NSOS deployment in the platform’s domain settings, and select **Verify domain**. NSOS only serves a custom-domain website once the DNS record verifies, the domain status is active, and the website is published.
