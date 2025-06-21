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
- **1.1. Requirements gathering meetings:**
  - Hold intensive meetings with the heads of various departments (management, HR, warehouses, procurement, finance, projects) to identify and understand workflows, input and output data, required reports, and current challenges.
  - Document all functional and non-functional requirements such as performance and security.
- **1.2. Analysis and Definition of Permissions:**
  - Define all functional roles within the company (e.g., project manager, HR employee, warehouse keeper, financial manager).
  - Determine the precise permissions for each role regarding access to sections, and read/write/edit/delete data. This must comply with ISO 9001 principles for access control.
- **1.3. Design ERD (Entity-Relationship Diagram):**
  - Build an entity-relationship diagram to clarify how data is interconnected across different departments (employees with projects, suppliers with procurement, materials with inventory).
- **1.4. Database Structure Design (Firebase - Firestore & Realtime Database):**
  - Identify the necessary Firestore Collections and Documents for each department.
  - Determine the optimal data structure to ensure efficient performance and fast queries.
  - Determine when to use Firestore (for structured data) and when to use Realtime Database (for data requiring real-time updates, like notifications).
  - Design Firebase Security Rules to ensure data can only be accessed and modified by authorized users, in line with ISO 9001 data protection requirements.
- **1.5. Defining Data Entry and Validation Criteria:**
  - Establish rules for validating data input across all forms to ensure data quality and accuracy, a core requirement for ISO 9001.

### Phase 2: UI/UX Design

**Objective:** Create an intuitive, attractive, and eye-friendly user interface that follows "Elite" design principles and ensures a smooth user experience compliant with ISO 9001 standards for usability and accessibility.

**Sub-tasks:**
- **2.1. Competitor Research and Analysis:**
  - Study similar ERP applications in the construction field to draw inspiration from best practices and avoid common mistakes.
- **2.2. Wireframing:**
  - Create simple initial layouts for each page and screen to determine the placement of key elements and the flow of information.
- **2.3. Prototypes Design:**
  - Build high-fidelity interactive models (Mockups) for each section and page, considering a calm and professional color palette that reflects the 'Elite' character.
  - Focus on ease of navigation and clarity of buttons and interactive elements.
- **2.4. Theme & Component Library Selection and Application:**
  - Select a UI component library (e.g., Material-UI, Chakra UI, Ant Design) compatible with Next.js that supports an 'Elite' design.
  - Customize theming to match the company's visual identity.
- **2.5. Responsive Design:**
  - Ensure that the design is adaptive and works perfectly on different screen sizes and devices (desktop, laptop, tablet).
- **2.6. User Experience (UX) Design Principles:**
  - Focus on reducing clicks to access important information.
  - Provide clear user feedback (success messages, error messages, alerts).
  - Design clear and organized data entry forms.

### Phase 3: Core Modules Development

**Objective:** Build the core sections of the application, ensuring efficiency and security using Node.js, Next.js, and Firebase.

**Sub-tasks:**
- **3.1. Set up the development environment:**
  - Set up a new Next.js project.
  - Initialize the Firebase SDK to connect to the database.
  - Set up a Node.js backend environment if needed for complex functions beyond Firebase Functions.
- **3.2. Login/Register Page:**
  - Develop a secure login system using Firebase Authentication.
  - Develop a new user registration function (with initial roles and permissions specified).
  - Password recovery page via email.
  - Implement an advanced Role-Based Access Control system to restrict access to pages and functions based on the user's role.
- **3.3. Main Dashboard:**
  - Build a dashboard interface that displays a summary of key performance indicators (KPIs) from different departments.
  - Develop interactive chart components (using libraries like Chart.js or Recharts) to visualize data.
  - Develop a notification and alert system for pending tasks or important events.
- **3.4. Employee Management (HR):**
  - Develop forms to add, edit, and delete employee data (personal information, job, department, salary, contact details).
  - Implement advanced filters and search for employees.
  - Build detailed view screens for each employee.
- **3.5. Project Management:**
  - Develop forms to add, edit, and delete projects and their details (name, description, location, dates, budget, status).
  - Develop functionality to assign work teams to projects.
  - Build display screens to monitor work progress and the status of each project.

### Phase 4: Advanced Modules Development

**Objective:** Build the more complex sections that require greater integration with each other and with the core data.

**Sub-tasks:**
- **4.1. Supplier Management:**
  - Develop forms to add, edit, and delete suppliers and their details (contact information, services/products).
  - Develop a function to track contracts and agreements with suppliers.
  - Provide the ability to evaluate supplier performance.
- **4.2. Inventory/Warehouse Management:**
  - Develop forms to add, edit, and delete materials and equipment, specifying quantities.
  - Build a system to track inventory entry and exit.
  - Implement a notification system for low stock levels.
  - Develop a function to manage material requests from projects and link them to available inventory.
- **4.3. Procurement Management:**
  - Develop a system to create and track purchase requests and their statuses (under review, approved, executed).
  - Develop a system to manage purchase orders and related invoices.
  - Link purchase orders to suppliers and warehouses.
- **4.4. Client/Sales Management (CRM):**
  - Develop a database for clients (potential and current).
  - Track interaction history with clients.
  - Develop a system to manage quotations and contracts.
  - Track the status of payments and outstanding debts from clients.
- **4.5. Financial & Accounting Management:**
  - Develop forms to record income and expenses.
  - Manage payments to suppliers and receipts from clients.
  - Track bank account balances.
  - (Note: The focus is on basic tracking, not a full accounting system at this stage).

To get started, run the development server:

```bash
npm run dev
```
