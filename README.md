# Mokawalat ERP

This is a Next.js-based ERP system for a construction company, built with Firebase Studio.

## Core Modules

- Dashboard
- Project Management
- Employee Management (HR)
- Supplier Management
- Inventory/Warehouse Management
- Procurement Management
- Client/Sales Management (CRM)
- Financial & Accounting Management
- Reporting & Analytics
- AI-Powered ISO 9001 Compliance Assistant

## Project Development Plan

### Phase 1: Requirements Analysis and Database Design

**Objective:** An in-depth understanding of all business needs and the design of an effective and secure database structure that meets these requirements and complies with ISO 9001 standards.

**Sub-tasks:**
- **Requirements gathering meetings:**
  - Hold intensive meetings with the heads of various departments (management, HR, warehouses, procurement, finance, projects) to identify and understand workflows, input and output data, required reports, and current challenges.
  - Document all functional and non-functional requirements such as performance and security.
- **Analysis and Definition of Permissions:**
  - Define all functional roles within the company (e.g., project manager, HR employee, warehouse keeper, financial manager).
  - Determine the precise permissions for each role regarding access to sections, and read/write/edit/delete data. This must comply with ISO 9001 principles for access control.
- **Design ERD (Entity-Relationship Diagram):**
  - Build an entity-relationship diagram to clarify how data is interconnected across different departments (employees with projects, suppliers with procurement, materials with inventory).
- **Database Structure Design (Firebase - Firestore & Realtime Database):**
  - Identify the necessary Firestore Collections and Documents for each department.
  - Determine the optimal data structure to ensure efficient performance and fast queries.
  - Determine when to use Firestore (for structured data) and when to use Realtime Database (for data requiring real-time updates, like notifications).
  - Design Firebase Security Rules to ensure data can only be accessed and modified by authorized users, in line with ISO 9001 data protection requirements.
- **Defining Data Entry and Validation Criteria:**
  - Establish rules for validating data input across all forms to ensure data quality and accuracy, a core requirement for ISO 9001.

To get started, run the development server:

```bash
npm run dev
```
