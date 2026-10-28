# Clinic & Administration Workflow

This document specifies the operational lifecycle for dental clinics and platform administrators on DentaBook.

---

```mermaid
flowchart TD
    C1[1. Clinic Registration] --> C2[2. System Admin Review]
    C2 --> C3{Approval Decision}
    C3 -- Reject --> CReject[Registration Rejected / Re-apply]
    C3 -- Approve --> C4[3. Clinic Onboarding & Dashboard Access]
    C4 --> C5[4. Configure Profile, Location & Contacts]
    C5 --> C6[5. Add Services & Set Pricing]
    C6 --> C7[6. Add Dentist Profiles & Accreditations]
    C7 --> C8[7. Link Dentists to Services & Configure Schedules]
    C8 --> C9[8. Receive & Review Customer Booking Requests]
    C9 --> C10[9. Manage Requests: Accept / Decline / Request Info]
    C10 --> C11[10. Monitor Down Payments & Financial Records]
    C11 --> C12[11. Deliver Care & Complete Appointments]
    C12 --> C13[12. Update Clinic Offerings & Schedules as Needed]
```

---

## Detailed Step-by-Step Breakdown

### Phase 1: Onboarding & Verification
1. **Clinic Account Registration**: Clinic submits an onboarding application with business details, license numbers, clinic name, and owner credentials.
2. **Platform Admin Verification**: A platform super-admin audits the submitted documentation to maintain healthcare compliance and platform trust.
3. **Approval & Activation**: Once verified, the clinic receives official confirmation and credentials to access their management portal.

### Phase 2: Configuration & Service Catalog Setup
4. **Clinic Profile Setup**: Clinic administrators upload logo/photos, set clinic bio, input physical location/directions, and establish public contact channels.
5. **Service & Pricing Configuration**:
   - Add dental treatments (e.g., Cleaning, Root Canal, Orthodontics, Extraction).
   - Set base prices, duration estimates, and down-payment requirements.
6. **Dentist Roster & Qualifications**:
   - Create staff profiles for licensed dentists and hygienists.
   - Attach degrees, certifications, years of experience, and specialty tags.
7. **Service Mapping & Availability Schedules**:
   - Link specific dentists to the dental services they are authorized to perform.
   - Define weekly working hours, shift schedules, vacation dates, and appointment slot buffers.

### Phase 3: Daily Operations & Appointment Management
8. **Live Appointment Ingestion**: Clinic and dentists receive real-time notifications when prospective patients submit booking requests.
9. **Request Evaluation**: Dentists evaluate patient answers to pre-screening questions and either approve the slot, reject it with reasoning, or request clarifying details.
10. **Payment & Deposit Tracking**: Clinic tracks incoming reservation deposits, pending balances, and confirmed booking vouchers.
11. **Appointment Completion**: Clinic marks visits as completed, records internal clinical notes, and tracks patient attendance status.

### Phase 4: Maintenance & Scalability
12. **Ongoing Catalog Adjustments**: Clinic staff dynamically adjust pricing, add seasonal promotions, update schedule availability, or register new dentists as the practice expands.
