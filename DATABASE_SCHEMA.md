# Mokawalat - Database Schema

This document outlines the database structure for the Mokawalat ERP system, which is built on Firebase Firestore. Understanding this schema is crucial for extending functionality or debugging data-related issues.

## Data Modeling Philosophy

The schema is designed with a document-centric approach, leveraging Firestore's sub-collections to create logical groupings and relationships between data entities. This helps in querying related data efficiently and structuring security rules effectively.

Lowercase fields (e.g., `name_lowercase`) are used to facilitate case-insensitive searching and sorting, a common requirement in user-facing applications.

---

## Firestore Collections

### `users`

Stores authentication information and application-specific roles for each user.

-   **Document ID**: Firebase Auth User UID
-   **Fields**:
    -   `uid` (string): The user's unique Firebase Authentication ID.
    -   `email` (string): The user's email address.
    -   `role` (string): The user's role within the application (`admin`, `manager`, or `user`).

### `company`

Stores global company profile information. This collection should only ever contain one document with the ID `main`.

-   **Document ID**: `main`
-   **Fields**:
    -   `name` (string): The company's official name.
    -   `address` (string, optional): The company's physical address.
    -   `phone` (string, optional): The company's primary phone number.
    -   `email` (string, optional): The company's primary email address.
    -   `logoUrl` (string, optional): A public URL to the company logo in Firebase Storage.
    -   `logoPath` (string, optional): The full path to the logo file in Firebase Storage.
    -   `updatedAt` (Timestamp): The timestamp when the profile was last updated.

### `projects`

Contains all information related to construction projects.

-   **Document ID**: Auto-generated
-   **Fields**:
    -   `name` (string): The official name of the project.
    -   `name_lowercase` (string): Lowercase version of the name for searching.
    -   `description` (string, optional): A detailed description of the project.
    -   `location` (string, optional): The physical address or location of the project.
    -   `budget` (number): The total budget allocated for the project.
    -   `startDate` (Timestamp): The official start date of the project.
    -   `status` (string): The current status (`Planning`, `In Progress`, `Completed`, `On Hold`).
    -   `clientId` (string, optional): A reference to the `clients` collection document ID.
    -   `teamMemberIds` (array of strings, optional): An array of UIDs from the `employees` collection.
    -   `progress` (number, optional): The completion percentage, calculated automatically from tasks.
    -   `createdAt` (Timestamp): The timestamp when the project was created.
-   **Sub-collections**:
    -   `tasks`: Tracks individual tasks within a project.
        -   `name` (string): The name of the task.
        -   `status` (string): The task status (`To Do`, `In Progress`, `Done`).
        -   `dueDate` (Timestamp, optional): The deadline for the task.
        -   `assignedTo` (string, optional): The UID of the employee assigned to the task.
        -   `assignedToName` (string, optional): The name of the assigned employee for display.
        -   `createdAt` (Timestamp)
    -   `documents`: Stores metadata for uploaded project files.
        -   `title` (string): The user-defined title for the document.
        -   `fileUrl` (string): The public download URL from Firebase Storage.
        -   `filePath` (string): The full path to the file in Firebase Storage.
        -   `fileName` (string): The original name of the uploaded file.
        -   `createdAt` (Timestamp)
    -   `dailyLogs`: A chronological record of project updates.
        -   `notes` (string): The text content of the log entry.
        -   `authorId` (string): The UID of the employee who created the log.
        -   `authorEmail` (string): The email of the author for display purposes.
        -   `photoUrl` (string, optional): A public URL to an associated photo.
        -   `photoPath` (string, optional): The path to the photo in Firebase Storage.
        -   `createdAt` (Timestamp)

---

## Human Capital Management (HR) Module

### `employees`

Manages all employee profiles. This is the central collection for employee data.

-   **Document ID**: Auto-generated
-   **Fields**:
    -   `name` (string)
    -   `name_lowercase` (string)
    -   `email` (string)
    -   `role` (string): The employee's job title (e.g., 'Project Manager').
    -   `department` (string)
    -   `status` (string): Employment status (`Active`, `On Leave`, `Inactive`).
    -   `salary` (number, optional): The employee's monthly salary.
    -   `photoUrl` (string, optional): A public URL to the employee's profile photo in Firebase Storage.
    -   `photoPath` (string, optional): The full path to the photo file in Firebase Storage.

### `jobs`

Stores information about open job positions for recruitment.

-   **Document ID**: Auto-generated
-   **Fields**:
    -   `title` (string): The job title.
    -   `title_lowercase` (string)
    -   `description` (string): A detailed job description.
    -   `department` (string)
    -   `status` (string): (`Open`, `Closed`).
    -   `createdAt` (Timestamp)

### `candidates`

Tracks applicants for jobs.

-   **Document ID**: Auto-generated
-   **Fields**:
    -   `name` (string)
    -   `email` (string)
    -   `phone` (string)
    -   `jobId` (string): A reference to the `jobs` collection document ID.
    -   `status` (string): (`Applied`, `Interviewing`, `Offered`, `Hired`, `Rejected`).
    -   `resumeUrl` (string, optional): Public URL to the candidate's resume in Firebase Storage.
    -   `resumePath` (string, optional)
    -   `appliedAt` (Timestamp)

### `performanceReviews`

Stores records of employee performance reviews.

-   **Document ID**: Auto-generated
-   **Fields**:
    -   `employeeId` (string): A reference to the `employees` collection document ID.
    -   `reviewerId` (string): UID of the manager who conducted the review.
    -   `reviewDate` (Timestamp)
    -   `goals` (string): Text describing goals for the review period.
    -   `feedback` (string): Text of the manager's feedback.
    -   `rating` (number): A 1-5 rating.

### `trainings`

Manages training and development records for employees.

-   **Document ID**: Auto-generated
-   **Fields**:
    -   `courseName` (string)
    -   `employeeId` (string): A reference to the `employees` collection document ID.
    -   `completionDate` (Timestamp)
    -   `certificateUrl` (string, optional): Public URL to a certificate in Firebase Storage.
    -   `certificatePath` (string, optional)

### `offboarding`

Stores information related to employee departures.

-   **Document ID**: Auto-generated
-   **Fields**:
    -   `employeeId` (string): A reference to the `employees` collection document ID.
    -   `exitDate` (Timestamp)
    -   `reason` (string): The reason for departure.
    -   `feedback` (string, optional): Notes from the exit interview.
    -   `assetsReturned` (boolean)

### `payrollRuns`

Stores a record of each time payroll has been run for a specific month. This prevents duplicate payroll runs.

-   **Document ID**: `YYYY-MM` (e.g., '2025-07')
-   **Fields**:
    -   `runAt` (Timestamp): The timestamp when the payroll was processed.
    -   `runByEmail` (string): The email of the user for display.
    -   `totalAmount` (number): The total cost of this payroll run.
    -   `employeeCount` (number): The number of employees included in this run.
    -   `accountId` (string): A reference to the `accounts` collection document ID from which the payroll was paid.

### `attendance`

Logs daily employee check-in and check-out times.

-   **Document ID**: Auto-generated
-   **Fields**:
    -   `employeeId` (string): A reference to the `employees` collection document ID.
    -   `employeeName` (string): The name of the employee for display purposes.
    -   `checkInTime` (Timestamp): The timestamp of the check-in.
    -   `checkOutTime` (Timestamp, optional): The timestamp of the check-out.
    -   `date` (string): The date of the attendance record in `YYYY-MM-DD` format for easy querying.
    -   `status` (string): The final status for the day (`Present`, `On Leave`, etc.).

### `leaveRequests`

Tracks all employee requests for time off.

-   **Document ID**: Auto-generated
-   **Fields**:
    -   `employeeId` (string): A reference to the `employees` collection document ID.
    -   `employeeName` (string): The name of the employee for display purposes.
    -   `leaveType` (string): The type of leave requested (`Annual`, `Sick`, `Unpaid`, `Other`).
    -   `startDate` (Timestamp): The start date of the leave period.
    -   `endDate` (Timestamp): The end date of the leave period.
    -   `reason` (string, optional): The reason provided by the employee for the leave.
    -   `status` (string): The status of the request (`Pending`, `Approved`, `Rejected`).
    -   `requestedAt` (Timestamp): The timestamp when the request was submitted.

---

### `clients`

Stores information about clients and leads.

-   **Document ID**: Auto-generated
-   **Fields**:
    -   `name` (string)
    -   `name_lowercase` (string)
    -   `company` (string, optional)
    -   `email` (string)
    -   `phone` (string)
    -   `status` (string): The client's status (`Lead`, `Active`, `Inactive`).
    -   `createdAt` (Timestamp)
-   **Sub-collections**:
    -   `interactions`: Logs communications with the client.
        -   `type` (string): Type of interaction (`Call`, `Email`, `Meeting`, `Note`).
        -   `notes` (string)
        -   `date` (Timestamp)
        -   `createdAt` (Timestamp)
    -   `contracts`: Stores metadata for client contracts.
        -   `title` (string)
        -   `effectiveDate` (Timestamp)
        -   `value` (number, optional): The contract's monetary value.
        -   `fileUrl` (string, optional): Download URL from Firebase Storage.
        -   `filePath` (string, optional): Path to the file in Firebase Storage.
        -   `createdAt` (Timestamp)

### `suppliers`

Manages all vendor and supplier information.

-   **Document ID**: Auto-generated
-   **Fields**:
    -   `name` (string)
    -   `name_lowercase` (string)
    -   `contactPerson` (string)
    -   `email` (string)
    -   `phone` (string)
    -   `status` (string): (`Active`, `Inactive`).
    -   `rating` (number, optional): A 1-5 star rating.
    -   `evaluationNotes` (string, optional): Text feedback on supplier performance.
-   **Sub-collections**:
    -   `contracts`: Stores metadata for supplier contracts. (Same structure as client contracts).

### `inventory`

Tracks all materials, tools, and equipment.

-   **Document ID**: Auto-generated
-   **Fields**:
    -   `name` (string)
    -   `name_lowercase` (string)
    -   `category` (string): A reference to a category name.
    -   `quantity` (number): The current stock level.
    -   `warehouse` (string): The name of the warehouse where the item is stored.
    -   `status` (string): The stock status (`In Stock`, `Low Stock`, `Out of Stock`).
    -   `createdAt` (Timestamp)

### `inventoryCategories`

Manages the categories used for inventory items.

-   **Document ID**: Auto-generated
-   **Fields**:
    -   `name` (string): The name of the category (e.g., 'Building Materials').
    -   `name_lowercase` (string)
    -   `createdAt` (Timestamp)

### `warehouses`

Manages warehouse locations.

-   **Document ID**: Auto-generated
-   **Fields**:
    -   `name` (string): The name of the warehouse (e.g., 'Main Warehouse').
    -   `name_lowercase` (string)
    -   `location` (string, optional): The physical address of the warehouse.
    -   `createdAt` (Timestamp)

### `assets`

Manages company-owned assets like vehicles and heavy machinery.

-   **Document ID**: Auto-generated
-   **Fields**:
    -   `name` (string): The name or identifier of the asset (e.g., "Caterpillar 320 Excavator").
    -   `name_lowercase` (string)
    -   `category` (string): (e.g., "Heavy Machinery", "Vehicle", "Power Tool").
    -   `status` (string): The current status (`Available`, `In Use`, `Under Maintenance`, `Decommissioned`).
    -   `purchaseDate` (Timestamp): The date the asset was acquired.
    -   `purchaseCost` (number): The original cost of the asset.
    -   `currentProjectId` (string, optional): A reference to the `projects` collection document ID if currently assigned.
    -   `nextMaintenanceDate` (Timestamp, optional): The date for the next scheduled maintenance.
    -   `createdAt` (Timestamp)
-   **Sub-collections**:
    -   `maintenanceLogs`: A record of all maintenance activities for the asset.
        -   `date` (Timestamp): The date the maintenance was performed.
        -   `type` (string): The type of maintenance (e.g., 'Scheduled', 'Repair', 'Inspection').
        -   `description` (string): A detailed description of the work performed.
        -   `cost` (number, optional): The cost of the maintenance.
        -   `completedBy` (string, optional): Name of the person or company that performed the work.
        -   `createdAt` (Timestamp)

### `procurement`

Tracks purchase orders (POs).

-   **Document ID**: Auto-generated
-   **Fields**:
    -   `itemName` (string): The name of the item being procured.
    -   `itemId` (string): A reference to the `inventory` collection document ID.
    -   `quantity` (number)
    -   `unitCost` (number): The cost per unit of the item.
    -   `totalCost` (number): The total cost for the PO (quantity * unitCost).
    -   `supplierId` (string): A reference to the `suppliers` collection document ID.
    -   `projectId` (string): A reference to the `projects` collection document ID.
    -   `status` (string): The PO status (`Pending`, `Approved`, `Rejected`, `Ordered`, `Received`).
    -   `requestedAt` (Timestamp)

### `materialRequests`

Tracks requests for materials from inventory for specific projects.

-   **Document ID**: Auto-generated
-   **Fields**:
    -   `itemName` (string): The name of the requested item.
    -   `itemId` (string): A reference to the `inventory` collection document ID.
    -   `quantity` (number)
    -   `projectId` (string): A reference to the `projects` collection document ID.
    -   `status` (string): The request status (`Pending`, `Approved`, `Rejected`).
    -   `requestedAt` (Timestamp)

### `transactions`

A ledger of all financial transactions.

-   **Document ID**: Auto-generated
-   **Fields**:
    -   `description` (string)
    -   `amount` (number)
    -   `type` (string): (`Income`, `Expense`).
    -   `date` (Timestamp): The date the transaction occurred.
    -   `accountId` (string): A reference to the `accounts` collection document ID.
    -   `projectId` (string, optional)
    -   `clientId` (string, optional)
    -   `supplierId` (string, optional)
    -   `purchaseOrderId` (string, optional)
    -   `contractId` (string, optional): A reference to a `contracts` sub-collection document ID.
    -   `contractType` (string, optional): The parent collection type for the contract ('client' or 'supplier').
    -   `createdAt` (Timestamp)

### `invoices`

Tracks all client invoices.

-   **Document ID**: Auto-generated
-   **Fields**:
    -   `invoiceNumber` (string): A unique, sequential identifier for the invoice.
    -   `invoiceNumber_lowercase` (string): Lowercase version for searching.
    -   `clientId` (string): A reference to the `clients` collection document ID.
    -   `projectId` (string, optional): A reference to the `projects` collection document ID.
    -   `issueDate` (Timestamp): The date the invoice was issued.
    -   `dueDate` (Timestamp): The date the payment is due.
    -   `totalAmount` (number): The total amount of the invoice, calculated from line items.
    -   `status` (string): The invoice status (`Draft`, `Sent`, `Paid`, `Void`).
    -   `lineItems` (array of maps): An array of items being billed.
        -   `description` (string)
        -   `quantity` (number)
        -   `unitPrice` (number)
    -   `createdAt` (Timestamp)


### `accounts`

Manages company bank accounts.

-   **Document ID**: Auto-generated
-   **Fields**:
    -   `name` (string): A nickname for the account (e.g., 'CIB Main').
    -   `bankName` (string)
    -   `accountNumber` (string, optional)
    -   `initialBalance` (number)
    -   `createdAt` (Timestamp)

### `activityLog`

A global audit trail for major events in the system.

-   **Document ID**: Auto-generated
-   **Fields**:
    -   `message` (string): A description of the event.
    -   `type` (string): An event type identifier (e.g., 'PROJECT_CREATED').
    -   `link` (string): A URL to the relevant page in the app.
    -   `timestamp` (Timestamp)

---

## Firebase Security Rules

The security of the database is enforced by rules defined in the `firestore.rules` file. These rules are crucial for ensuring data integrity and preventing unauthorized access. The core principles of these rules are:

1.  **Authentication Required**: All access to the database requires a user to be authenticated.
2.  **Role-Based Access Control (RBAC)**:
    -   Users with the `admin` role generally have the widest permissions, including creation and deletion rights on all collections and system settings.
    -   Users with the `manager` role have permissions to manage most day-to-day operational data (projects, clients, approvals) but cannot alter system settings or manage users.
    -   Users with the `user` role have more restricted permissions, typically limited to reading data and creating items in sub-collections (like daily logs or material requests).
3.  **Ownership and Relationship-Based Rules**: For sub-collections, write access is often granted based on a user's relationship to the parent document (e.g., only team members of a project can add tasks).
4.  **Data Validation**: Rules can enforce data types and constraints, though the primary validation is handled in the application's server actions.

For the specific implementation details, always refer to the `firestore.rules` file in the project root.
