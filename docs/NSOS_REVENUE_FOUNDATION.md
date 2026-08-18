# NSOS Revenue Foundation

## Purpose and Boundary

NSOS now separates **platform revenue** from each school’s own student-fee operations. School finance users continue to manage tuition, invoices, receipts, and parent payments inside their tenant. The NSOS operator manages the commercial relationship with a school through a separate plan, subscription, and platform-billing record.

> **Commercial status is intentionally non-destructive in this release.** Assigning `payment_due`, `suspended`, or `cancelled` records the operator’s verified commercial decision, but does not automatically interrupt a school’s operational access. This prevents an accidental billing action from blocking access to student records.

| Domain | Controlled by | Data boundary | Current purpose |
| --- | --- | --- | --- |
| School fee invoice | School owner, administrator, or finance role | One school tenant | Parent and student fee collection |
| NSOS subscription plan | NSOS platform operator | Platform-wide | Defines a commercial offer in NGN |
| School subscription | NSOS platform operator | One school tenant | Records plan assignment and commercial state |
| Platform billing record | NSOS platform operator | One school tenant | Records onboarding or renewal billing after a plan is assigned |

## Revenue Workflow

The platform operator creates a plan with a code, name, and monthly or annual amount. The operator then assigns that plan to a real school, records a commercial state, and selects the agreed billing cycle. A platform billing record can be issued only for a paid monthly or annual plan. It is marked paid only after payment is independently verified, with the verification method and reference retained in the platform record.

| Step | Safeguard | Audit result |
| --- | --- | --- |
| Create plan | Restricted to the global NSOS administrator | Plan is only usable when active |
| Assign subscription | Validates the school and active plan | Tenant-scoped assignment event |
| Issue billing record | Derives the amount from the assigned plan; browser cannot supply an amount | Tenant-scoped issued-record event |
| Mark payment paid | Requires an existing issued record and verified method/reference | Tenant-scoped paid-record event |

## Access Model

The **Platform revenue** console is available only to the NSOS global administrator. It gives the operator a cross-school view of plans, commercial states, issued platform billing records, and verified collections. A school owner or administrator may view only their school’s subscription state and latest platform billing record; they cannot view platform pricing controls, other schools, or settlement actions. Staff, teachers, finance users, parents, and students cannot read the platform subscription endpoint.

## Data Model

The additive `0010_oval_lenny_balinger.sql` migration creates three tables:

| Table | Important controls |
| --- | --- |
| `subscriptionPlans` | Globally unique code, NGN pricing, active/archived state |
| `schoolSubscriptions` | Exactly one subscription record per school, indexed commercial state |
| `platformBillingRecords` | Globally unique record number, issued-to-paid lifecycle, school and status indexes |

Every newly created school starts with a `trial` commercial record and a `manual` billing cycle. No paid plan, invoice, payment, parent, staff record, or synthetic customer data is created automatically.

## Next Commercial Integration

The present release deliberately supports verified manual onboarding and renewal records first. The next payment phase should add a **platform-owned** Paystack or Flutterwave collection flow, provider-signed payment callbacks, idempotent settlement, and a reconciliation screen. It must use a platform credential set that is separate from the payment provider configuration each school controls for parent-fee collection.
