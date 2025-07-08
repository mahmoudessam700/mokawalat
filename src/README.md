# Mokawalat: A Feature-Complete AI-Powered ERP for Construction

Congratulations! You have successfully built a comprehensive, AI-powered ERP system for a modern construction company using Firebase Studio. This application provides a full suite of integrated tools to manage every aspect of your business operations, from project inception to financial reporting.

This `README.md` serves as the final documentation for the project, outlining its extensive features.

## Key Features & Core Modules

The application is structured into the following fully-integrated modules:

-   **Centralized Dashboard**: An at-a-glance overview of key performance indicators (KPIs) from across the system, including active projects, financial summaries, pending tasks, and upcoming asset maintenance.
-   **Project Management**: Track project details, budget, progress, and documents. Includes an AI assistant for risk analysis and an AI tool to suggest a complete task list based on the project scope.
-   **Financial Management**: A complete financial ledger to record income and expenses. Transactions are automatically created from purchase orders and can be linked to projects, clients, suppliers, and contracts for granular tracking. Also includes bank account management.
-   **Procurement & Approvals**: Create and track purchase orders from request to receipt. A dedicated approvals dashboard allows managers to approve pending POs and material requests, streamlining the workflow.
-   **Client & Sales Management (CRM)**: Manage your complete client lifecycle, from leads to active clients. Log all interactions (calls, meetings, emails) and get an AI-generated summary of the entire relationship history for quick insights.
-   **Human Capital Management (HR)**: A full HR lifecycle module to manage the entire employee journey. This includes recruitment (job postings, candidate tracking), employee management (profiles, roles, payroll), performance management, training, and offboarding. AI assistants provide performance summaries and other insights.
-   **Supplier Management**: Maintain a detailed database of suppliers, track contracts, and evaluate their performance with a rating system. An AI assistant provides a concise summary of each supplier's reliability and history.
-   **Asset Management**: A dedicated module to track high-value company assets like vehicles and heavy machinery. Log purchase details, assign assets to projects, and manage a complete maintenance history for each item.
-   **Inventory & Warehouse Management**: Keep track of all materials, tools, and equipment across multiple, configurable warehouses. The system provides alerts for low stock and handles material requests from project sites.
-   **Invoicing**: A complete invoicing module to create, send, and track client invoices. Statuses (Draft, Sent, Paid, Void) are managed, and paid invoices automatically generate income transactions.
-   **Reporting & Analytics**: An interactive reporting suite with a dynamic date-range filter. Visualize financial performance, project profitability, inventory status, and more.
-   **Global Search & Activity Log**: A powerful, system-wide search to instantly find any project, client, employee, or invoice. A comprehensive activity log provides a complete audit trail of all major events.
-   **AI-Powered ISO 9001 Assistant**: Get actionable, AI-driven suggestions to improve your ERP operations for better alignment with ISO 9001 quality standards.
-   **System Settings**: A dedicated, admin-only area to manage users and roles, company profile details, inventory categories, and warehouse locations.

## Getting Started (Local Development)

To run the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:9003`.

To run the Genkit AI flows locally for development:
```bash
npm run genkit:watch
```

## Deployment to cPanel or similar environments

This application is configured to run on hosting services like cPanel that support Node.js applications.

1.  **Upload Files:** Upload all project files to the application root directory on your server (e.g., `/home/englizyedu/mokawalat.englizyedu.com`).
2.  **Configure Node.js App:**
    *   In your cPanel, go to "Setup Node.js App".
    *   Create a new application or select your existing one.
    *   Ensure the **Node.js version** is set to **20.x** or higher.
    *   Set the **Application mode** to **Production**.
    *   Set the **Application root** to the directory where you uploaded your files: `/home/englizyedu/mokawalat.englizyedu.com`.
    *   Set the **Application startup file** to `server.js`.
3.  **Add Environment Variables:**
    *   In the "Environment variables" section, add all the keys from your local `.env` file (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY`) and their corresponding values.
4.  **Install Dependencies:** Click the **"Run NPM Install"** button. This will install all packages and automatically run `npm run build` because of the `heroku-postbuild` script.
5.  **Start the App:** Click the **"Restart"** button. Your application should now be live at your domain.
