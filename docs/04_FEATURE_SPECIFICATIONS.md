# Feature Specifications & Requirements

This document outlines the functional and technical requirements for key DentaBook features.

---

## 1. Interactive Treatment Cost Calculator

### Purpose
To eliminate price ambiguity by giving patients instant, transparent estimates prior to booking.

### Requirements:
- **Service Selection**: Checkbox/multi-select list categorized by treatment type (Preventive, Restorative, Cosmetic, Surgical, Orthodontic).
- **Price Calculation Formula**:
  $$\text{Total Estimated Cost} = \sum_{i=1}^{n} \text{Service Price}_i$$
- **Down Payment Percentage**: Automatically compute the required initial deposit:
  $$\text{Down Payment} = \text{Total Estimated Cost} \times \text{Clinic Deposit Rate (e.g. 20%)}$$
- **Disclaimers**: Prominently display a disclaimer indicating that actual final costs may vary based on clinical examination and additional required imaging/x-rays.

---

## 2. Appointment Scheduling & Slot Engine

### Purpose
To avoid double-booking and synchronize dentist working hours with patient availability.

### Requirements:
- **Dynamic Slot Generation**:
  - Time slots generated based on dentist shift boundaries and service duration.
  - Configurable buffer time (e.g., 15 minutes) between appointments for sanitation.
- **Conflict Prevention**: Instant validation locking a slot during active checkout/submission.
- **Patient Intake Form**:
  - Full Name
  - Mobile Phone Number (SMS/WhatsApp verification readiness)
  - Email Address
  - Medical history / allergy checklist
  - Dental symptom description / notes

---

## 3. Clinic Administration & Staff Dashboard

### Requirements:
- **Appointment Queue**: Filterable view (All, Pending Review, Confirmed, Completed, Cancelled, Rescheduled).
- **Dentist Scheduling Matrix**: Weekly calendar view allowing staff to block holidays, sick days, or off-duty hours.
- **Service Pricing Management**: Direct table editor for procedure name, category, estimated duration, and pricing tiers.
- **Deposit Tracking**: Real-time status for down payments (Pending, Received, Refunded).

---

## 4. Notifications & Status Tracking

### Requirements:
- **Patient Confirmation**: Automated receipt with appointment code, clinic address, dentist name, date, and time.
- **Reminders**: Automated reminders sent ahead of the scheduled appointment time.
- **Reschedule / Cancellation Rules**:
  - Patients can request rescheduling up to a configurable deadline (e.g., 24 hours prior).
  - Cancellation policies and deposit forfeit rules enforced consistently.
- **Post-Visit Review Submission**: Secure review link triggered after clinic marks an appointment as Completed.

