
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ListChecks, CheckCircle } from "lucide-react"

const roadmapPhases = [
  {
    title: "Phase 1: Requirements Analysis and Database Design",
    objective: "An in-depth understanding of all business needs and the design of an effective and secure database structure that meets these requirements and complies with ISO 9001 standards.",
    completed: true,
    subTasks: [
      {
        title: "1.1. Requirements gathering meetings:",
        details: [
          "Hold intensive meetings with the heads of various departments (management, HR, warehouses, procurement, finance, projects) to identify and understand workflows, input and output data, required reports, and current challenges.",
          "Document all functional and non-functional requirements such as performance and security.",
        ],
        completed: true,
      },
      {
        title: "1.2. Analysis and Definition of Permissions:",
        details: [
            "Define all functional roles within the company (e.g., project manager, HR employee, warehouse keeper, financial manager).",
            "Determine the precise permissions for each role regarding access to sections, and read/write/edit/delete data. This must comply with ISO 9001 principles for access control."
        ],
        completed: true,
      },
      {
        title: "1.3. Design ERD (Entity-Relationship Diagram):",
        details: [
            "Build an entity-relationship diagram to clarify how data is interconnected across different departments (employees with projects, suppliers with procurement, materials with inventory)."
        ],
        completed: true,
      },
      {
        title: "1.4. Database Structure Design (Firebase - Firestore & Realtime Database):",
        details: [
          "Identify the necessary Firestore Collections and Documents for each department.",
          "Determine the optimal data structure to ensure efficient performance and fast queries.",
          "Determine when to use Firestore (for structured data) and when to use Realtime Database (for data requiring real-time updates, like notifications).",
          "Design Firebase Security Rules to ensure data can only be accessed and modified by authorized users, in line with ISO 9001 data protection requirements."
        ],
        completed: true,
      },
      {
        title: "1.5. Defining Data Entry and Validation Criteria:",
        details: [
          "Establish rules for validating data input across all forms to ensure data quality and accuracy, a core requirement for ISO 9001.",
        ],
        completed: true,
      }
    ]
  },
  {
    title: "Phase 2: UI/UX Design",
    objective: "Create an intuitive, attractive, and eye-friendly user interface that follows \"Elite\" design principles and ensures a smooth user experience compliant with ISO 9001 standards for usability and accessibility.",
    completed: true,
    subTasks: [
      {
        title: "2.1. Competitor Research and Analysis:",
        details: [
          "Study similar ERP applications in the construction field to draw inspiration from best practices and avoid common mistakes.",
        ],
        completed: true,
      },
      {
        title: "2.2. Wireframing:",
        details: [
          "Create simple initial layouts for each page and screen to determine the placement of key elements and the flow of information.",
        ],
        completed: true,
      },
      {
        title: "2.3. Prototypes Design:",
        details: [
          "Build high-fidelity interactive models (Mockups) for each section and page, considering a calm and professional color palette that reflects the 'Elite' character.",
          "Focus on ease of navigation and clarity of buttons and interactive elements.",
        ],
        completed: true,
      },
      {
        title: "2.4. Theme & Component Library Selection and Application:",
        details: [
          "Select a UI component library (e.g., Material-UI, Chakra UI, Ant Design) compatible with Next.js that supports an 'Elite' design.",
          "Customize theming to match the company's visual identity."
        ],
        completed: true,
      },
      {
        title: "2.5. Responsive Design:",
        details: [
          "Ensure that the design is adaptive and works perfectly on different screen sizes and devices (desktop, laptop, tablet).",
        ],
        completed: true,
      },
      {
        title: "2.6. User Experience (UX) Design Principles:",
        details: [
          "Focus on reducing clicks to access important information.",
          "Provide clear user feedback (success messages, error messages, alerts).",
          "Design clear and organized data entry forms.",
        ],
        completed: true,
      }
    ]
  },
  {
    title: "Phase 3: Core Modules Development",
    objective: "Build the core sections of the application, ensuring efficiency and security using Node.js, Next.js, and Firebase.",
    completed: true,
    subTasks: [
      {
        title: "3.1. Set up the development environment:",
        details: [
          "Set up a new Next.js project.",
          "Initialize the Firebase SDK to connect to the database.",
          "Set up a Node.js backend environment if needed for complex functions beyond Firebase Functions."
        ],
        completed: true,
      },
      {
        title: "3.2. Login/Register Page:",
        details: [
          "Develop a secure login system using Firebase Authentication.",
          "Develop a new user registration function (with initial roles and permissions specified).",
          "Password recovery page via email.",
          "Implement an advanced Role-Based Access Control system to restrict access to pages and functions based on the user's role."
        ],
        completed: true,
      },
      {
        title: "3.3. Main Dashboard:",
        details: [
            "Build a dashboard interface that displays a summary of key performance indicators (KPIs) from different departments.",
            "Develop interactive chart components (using libraries like Chart.js or Recharts) to visualize data.",
            "Develop a notification and alert system for pending tasks or important events."
        ],
        completed: true,
      },
      {
        title: "3.4. Employee Management (HR):",
        details: [
          "Develop forms to add, edit, and delete employee data (personal information, job, department, salary, contact details).",
          "Implement advanced filters and search for employees.",
          "Build detailed view screens for each employee."
        ],
        completed: true,
      },
      {
        title: "3.5. Project Management:",
        details: [
          "Develop forms to add, edit, and delete projects and their details (name, description, location, dates, budget, status).",
          "Develop functionality to assign work teams to projects.",
          "Build display screens to monitor work progress and the status of each project."
        ],
        completed: true,
      }
    ]
  },
  {
    title: "Phase 4: Advanced Modules Development",
    objective: "Build the more complex sections that require greater integration with each other and with the core data.",
    completed: true,
    subTasks: [
      {
        title: "4.1. Supplier Management:",
        details: [
          "Develop forms to add, edit, and delete suppliers and their details (contact information, services/products).",
          "Develop a function to track contracts and agreements with suppliers.",
          "Provide the ability to evaluate supplier performance.",
        ],
        completed: true,
      },
      {
        title: "4.2. Inventory/Warehouse Management:",
        details: [
          "Develop forms to add, edit, and delete materials and equipment, specifying quantities.",
          "Build a system to track inventory entry and exit.",
          "Implement a notification system for low stock levels.",
          "Develop a function to manage material requests from projects and link them to available inventory.",
        ],
        completed: true,
      },
      {
        title: "4.3. Procurement Management:",
        details: [
          "Develop a system to create and track purchase requests and their statuses (under review, approved, executed).",
          "Develop a system to manage purchase orders and related invoices.",
          "Link purchase orders to suppliers and warehouses.",
        ],
        completed: true,
      },
      {
        title: "4.4. Client/Sales Management (CRM):",
        details: [
          "Develop a database for clients (potential and current).",
          "Track interaction history with clients.",
          "Develop a system to manage quotations and contracts.",
          "Track the status of payments and outstanding debts from clients.",
        ],
        completed: true,
      },
      {
        title: "4.5. Financial & Accounting Management:",
        details: [
          "Develop forms to record income and expenses.",
          "Manage payments to suppliers and receipts from clients.",
          "Track bank account balances.",
          "(Note: The focus is on basic tracking, not a full accounting system at this stage).",
        ],
        completed: true,
      }
    ]
  },
  {
    title: "Phase 5: Testing",
    objective: "Ensure the application is error-free, performs efficiently, all functions meet requirements, and it complies with ISO 9001 quality standards.",
    completed: true,
    subTasks: [
      {
        title: "5.1. Unit Testing:",
        details: [
          "Write tests for individual functions and components to ensure they work correctly in isolation.",
        ],
        completed: true,
      },
      {
        title: "5.2. Integration Testing:",
        details: [
          "Test how different modules interact with each other (e.g., when an item is added to inventory, does it reflect in the procurement list?).",
        ],
        completed: true,
      },
      {
        title: "5.3. UI Testing:",
        details: [
          "Verify that all UI elements work as expected and that the design displays correctly on various devices.",
        ],
        completed: true,
      },
      {
        title: "5.4. Performance Testing:",
        details: [
          "Evaluate the application's response speed, especially when handling large amounts of data or a high number of concurrent users.",
        ],
        completed: true,
      },
      {
        title: "5.5. Security Testing:",
        details: [
          "Check for potential security vulnerabilities and test the permissions system to ensure users cannot access unauthorized data or functions.",
          "Ensure all security measures comply with ISO 9001 data protection standards.",
        ],
        completed: true,
      },
      {
        title: "5.6. ISO 9001 Compliance Testing:",
        details: [
          "Thoroughly review all forms and processes to ensure they provide necessary documentation, clear process tracking, and are auditable.",
          "Ensure all workflows within the application contribute to quality objectives.",
        ],
        completed: true,
      },
      {
        title: "5.7. User Acceptance Testing (UAT):",
        details: [
          "Involve end-users from various departments to test the application and provide feedback and suggestions.",
        ],
        completed: true,
      }
    ]
  },
  {
    title: "Phase 6: Documentation",
    objective: "Provide comprehensive and up-to-date documentation for the application, including code, database design, and user manual, to facilitate future maintenance, development, and compliance with ISO 9001 standards.",
    completed: false,
    subTasks: [
        {
            title: "6.1. Code Documentation:",
            details: [
                "Write clear inline comments in the code to explain functions and complex logic.",
                "Create detailed README files for each part of the project (Frontend, Backend, Database Rules).",
            ],
            completed: true,
        },
        {
            title: "6.2. Database Design Documentation:",
            details: [
                "Create a detailed document for the Firebase Firestore and Realtime Database structure, describing each collection, document, and field, as well as the relationships between them.",
                "Document Firebase Security Rules.",
            ],
            completed: true,
        },
        {
            title: "6.3. User Manual:",
            details: [
                "Create a comprehensive and clear user manual that explains how to use each section of the application, step-by-step.",
                "Include screenshots to illustrate the steps.",
                "Include a Frequently Asked Questions (FAQ) and troubleshooting section.",
            ],
            completed: false,
        },
        {
            title: "6.4. API Documentation (if any):",
            details: [
                "If any external or internal APIs are developed, document the endpoints, request methods, parameters, and responses.",
            ],
            completed: false,
        },
        {
            title: "6.5. Deployment Documentation:",
            details: [
                "Document the steps required to deploy and update the application on production servers.",
            ],
            completed: false,
        },
        {
            title: "6.6. ISO 9001 Compliance Documentation:",
            details: [
                "Create a separate document that explains how the application's design and processes comply with ISO 9001 requirements, referencing specific features that support each clause of the standard (e.g., how documents are controlled, how processes are tracked).",
            ],
            completed: false,
        }
    ]
  }
];


export default function RoadmapPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Project Roadmap
        </h1>
        <p className="text-muted-foreground">
          Following the plan to build a comprehensive ERP system.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Development Phases</CardTitle>
          <CardDescription>
            The project is broken down into the following phases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
            {roadmapPhases.map((phase, index) => (
              <AccordionItem value={`item-${index}`} key={index}>
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    {phase.title}
                    {phase.completed && <CheckCircle className="size-5 text-green-500" />}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4 pl-4">
                  <div className="flex items-start gap-4">
                     <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <ListChecks className="h-5 w-5" />
                     </div>
                     <div>
                        <h3 className="font-semibold">Objective</h3>
                        <p className="text-muted-foreground">{phase.objective}</p>
                     </div>
                  </div>
                  
                  <div>
                    <h3 className="mb-2 font-semibold mt-4">Sub-tasks</h3>
                    <ul className="space-y-3">
                      {phase.subTasks.map((task, taskIndex) => (
                        <li key={taskIndex}>
                          <p className="font-medium flex items-center gap-2">
                            {task.title}
                            {task.completed && <CheckCircle className="size-4 text-green-500" />}
                          </p>
                          <ul className="ml-5 mt-2 list-disc space-y-1 text-muted-foreground">
                            {task.details.map((detail, detailIndex) => (
                               <li key={detailIndex}>{detail}</li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
