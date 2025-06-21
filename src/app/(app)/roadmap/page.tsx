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
