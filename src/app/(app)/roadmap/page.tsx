import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ListChecks } from "lucide-react"

const roadmapPhases = [
  {
    title: "Phase 1: Requirements Analysis and Database Design",
    objective: "An in-depth understanding of all business needs and the design of an effective and secure database structure that meets these requirements and complies with ISO 9001 standards.",
    subTasks: [
      {
        title: "1.1. Requirements gathering meetings:",
        details: [
          "Hold intensive meetings with the heads of various departments (management, HR, warehouses, procurement, finance, projects) to identify and understand workflows, input and output data, required reports, and current challenges.",
          "Document all functional and non-functional requirements such as performance and security.",
        ]
      },
      {
        title: "1.2. Analysis and Definition of Permissions:",
        details: [
            "Define all functional roles within the company (e.g., project manager, HR employee, warehouse keeper, financial manager).",
            "Determine the precise permissions for each role regarding access to sections, and read/write/edit/delete data. This must comply with ISO 9001 principles for access control."
        ]
      },
      {
        title: "1.3. Design ERD (Entity-Relationship Diagram):",
        details: [
            "Build an entity-relationship diagram to clarify how data is interconnected across different departments (employees with projects, suppliers with procurement, materials with inventory)."
        ]
      },
      {
        title: "1.4. Database Structure Design (Firebase - Firestore & Realtime Database):",
        details: [
          "Identify the necessary Firestore Collections and Documents for each department.",
          "Determine the optimal data structure to ensure efficient performance and fast queries.",
          "Determine when to use Firestore (for structured data) and when to use Realtime Database (for data requiring real-time updates, like notifications).",
          "Design Firebase Security Rules to ensure data can only be accessed and modified by authorized users, in line with ISO 9001 data protection requirements."
        ]
      },
      {
        title: "1.5. Defining Data Entry and Validation Criteria:",
        details: [
          "Establish rules for validating data input across all forms to ensure data quality and accuracy, a core requirement for ISO 9001.",
        ]
      }
    ]
  },
  {
    title: "Phase 2: UI/UX Design",
    objective: "Create an intuitive, attractive, and eye-friendly user interface that follows \"Elite\" design principles and ensures a smooth user experience compliant with ISO 9001 standards for usability and accessibility.",
    subTasks: [
      {
        title: "2.1. Competitor Research and Analysis:",
        details: [
          "Study similar ERP applications in the construction field to draw inspiration from best practices and avoid common mistakes.",
        ]
      },
      {
        title: "2.2. Wireframing:",
        details: [
          "Create simple initial layouts for each page and screen to determine the placement of key elements and the flow of information.",
        ]
      },
      {
        title: "2.3. Prototypes Design:",
        details: [
          "Build high-fidelity interactive models (Mockups) for each section and page, considering a calm and professional color palette that reflects the 'Elite' character.",
          "Focus on ease of navigation and clarity of buttons and interactive elements.",
        ]
      },
      {
        title: "2.4. Theme & Component Library Selection and Application:",
        details: [
          "Select a UI component library (e.g., Material-UI, Chakra UI, Ant Design) compatible with Next.js that supports an 'Elite' design.",
          "Customize theming to match the company's visual identity."
        ]
      },
      {
        title: "2.5. Responsive Design:",
        details: [
          "Ensure that the design is adaptive and works perfectly on different screen sizes and devices (desktop, laptop, tablet).",
        ]
      },
      {
        title: "2.6. User Experience (UX) Design Principles:",
        details: [
          "Focus on reducing clicks to access important information.",
          "Provide clear user feedback (success messages, error messages, alerts).",
          "Design clear and organized data entry forms.",
        ]
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
                <AccordionTrigger className="text-lg font-semibold">
                  {phase.title}
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
                          <p className="font-medium">{task.title}</p>
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
