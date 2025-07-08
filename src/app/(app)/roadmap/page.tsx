
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ListChecks, CheckCircle, Rocket } from "lucide-react"
import { useLanguage } from "@/hooks/use-language";

export default function RoadmapPage() {
  const { t } = useLanguage();

  const roadmapPhases = [
    {
      title: t('roadmap.phase1.title'),
      objective: t('roadmap.phase1.objective'),
      completed: true,
      subTasks: [
        {
          title: t('roadmap.phase1.subtask1.title'),
          details: [
            t('roadmap.phase1.subtask1.detail1'),
            t('roadmap.phase1.subtask1.detail2'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase1.subtask2.title'),
          details: [
              t('roadmap.phase1.subtask2.detail1'),
              t('roadmap.phase1.subtask2.detail2'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase1.subtask3.title'),
          details: [
              t('roadmap.phase1.subtask3.detail1'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase1.subtask4.title'),
          details: [
            t('roadmap.phase1.subtask4.detail1'),
            t('roadmap.phase1.subtask4.detail2'),
            t('roadmap.phase1.subtask4.detail3'),
            t('roadmap.phase1.subtask4.detail4'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase1.subtask5.title'),
          details: [
            t('roadmap.phase1.subtask5.detail1'),
          ],
          completed: true,
        }
      ]
    },
    {
      title: t('roadmap.phase2.title'),
      objective: t('roadmap.phase2.objective'),
      completed: true,
      subTasks: [
        {
          title: t('roadmap.phase2.subtask1.title'),
          details: [
            t('roadmap.phase2.subtask1.detail1'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase2.subtask2.title'),
          details: [
            t('roadmap.phase2.subtask2.detail1'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase2.subtask3.title'),
          details: [
            t('roadmap.phase2.subtask3.detail1'),
            t('roadmap.phase2.subtask3.detail2'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase2.subtask4.title'),
          details: [
            t('roadmap.phase2.subtask4.detail1'),
            t('roadmap.phase2.subtask4.detail2'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase2.subtask5.title'),
          details: [
            t('roadmap.phase2.subtask5.detail1'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase2.subtask6.title'),
          details: [
            t('roadmap.phase2.subtask6.detail1'),
            t('roadmap.phase2.subtask6.detail2'),
            t('roadmap.phase2.subtask6.detail3'),
          ],
          completed: true,
        }
      ]
    },
    {
      title: t('roadmap.phase3.title'),
      objective: t('roadmap.phase3.objective'),
      completed: true,
      subTasks: [
        {
          title: t('roadmap.phase3.subtask1.title'),
          details: [
            t('roadmap.phase3.subtask1.detail1'),
            t('roadmap.phase3.subtask1.detail2'),
            t('roadmap.phase3.subtask1.detail3'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase3.subtask2.title'),
          details: [
            t('roadmap.phase3.subtask2.detail1'),
            t('roadmap.phase3.subtask2.detail2'),
            t('roadmap.phase3.subtask2.detail3'),
            t('roadmap.phase3.subtask2.detail4'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase3.subtask3.title'),
          details: [
            t('roadmap.phase3.subtask3.detail1'),
            t('roadmap.phase3.subtask3.detail2'),
            t('roadmap.phase3.subtask3.detail3'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase3.subtask4.title'),
          details: [
            t('roadmap.phase3.subtask4.detail1'),
            t('roadmap.phase3.subtask4.detail2'),
            t('roadmap.phase3.subtask4.detail3'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase3.subtask5.title'),
          details: [
            t('roadmap.phase3.subtask5.detail1'),
            t('roadmap.phase3.subtask5.detail2'),
            t('roadmap.phase3.subtask5.detail3'),
          ],
          completed: true,
        }
      ]
    },
    {
      title: t('roadmap.phase4.title'),
      objective: t('roadmap.phase4.objective'),
      completed: true,
      subTasks: [
        {
          title: t('roadmap.phase4.subtask1.title'),
          details: [
            t('roadmap.phase4.subtask1.detail1'),
            t('roadmap.phase4.subtask1.detail2'),
            t('roadmap.phase4.subtask1.detail3'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase4.subtask2.title'),
          details: [
            t('roadmap.phase4.subtask2.detail1'),
            t('roadmap.phase4.subtask2.detail2'),
            t('roadmap.phase4.subtask2.detail3'),
            t('roadmap.phase4.subtask2.detail4'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase4.subtask3.title'),
          details: [
            t('roadmap.phase4.subtask3.detail1'),
            t('roadmap.phase4.subtask3.detail2'),
            t('roadmap.phase4.subtask3.detail3'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase4.subtask4.title'),
          details: [
            t('roadmap.phase4.subtask4.detail1'),
            t('roadmap.phase4.subtask4.detail2'),
            t('roadmap.phase4.subtask4.detail3'),
            t('roadmap.phase4.subtask4.detail4'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase4.subtask5.title'),
          details: [
            t('roadmap.phase4.subtask5.detail1'),
            t('roadmap.phase4.subtask5.detail2'),
            t('roadmap.phase4.subtask5.detail3'),
            t('roadmap.phase4.subtask5.detail4'),
          ],
          completed: true,
        }
      ]
    },
    {
      title: t('roadmap.phase5.title'),
      objective: t('roadmap.phase5.objective'),
      completed: true,
      subTasks: [
        {
          title: t('roadmap.phase5.subtask1.title'),
          details: [
            t('roadmap.phase5.subtask1.detail1'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase5.subtask2.title'),
          details: [
            t('roadmap.phase5.subtask2.detail1'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase5.subtask3.title'),
          details: [
            t('roadmap.phase5.subtask3.detail1'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase5.subtask4.title'),
          details: [
            t('roadmap.phase5.subtask4.detail1'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase5.subtask5.title'),
          details: [
            t('roadmap.phase5.subtask5.detail1'),
            t('roadmap.phase5.subtask5.detail2'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase5.subtask6.title'),
          details: [
            t('roadmap.phase5.subtask6.detail1'),
            t('roadmap.phase5.subtask6.detail2'),
          ],
          completed: true,
        },
        {
          title: t('roadmap.phase5.subtask7.title'),
          details: [
            t('roadmap.phase5.subtask7.detail1'),
          ],
          completed: true,
        }
      ]
    },
    {
      title: t('roadmap.phase6.title'),
      objective: t('roadmap.phase6.objective'),
      completed: false,
      subTasks: [
          {
              title: t('roadmap.phase6.subtask1.title'),
              details: [
                  t('roadmap.phase6.subtask1.detail1'),
                  t('roadmap.phase6.subtask1.detail2'),
              ],
              completed: false,
          },
          {
              title: t('roadmap.phase6.subtask2.title'),
              details: [
                  t('roadmap.phase6.subtask2.detail1'),
                  t('roadmap.phase6.subtask2.detail2'),
              ],
              completed: false,
          },
          {
              title: t('roadmap.phase6.subtask3.title'),
              details: [
                  t('roadmap.phase6.subtask3.detail1'),
                  t('roadmap.phase6.subtask3.detail2'),
                  t('roadmap.phase6.subtask3.detail3'),
              ],
              completed: false,
          },
          {
              title: t('roadmap.phase6.subtask4.title'),
              details: [
                  t('roadmap.phase6.subtask4.detail1'),
              ],
              completed: false,
          },
          {
              title: t('roadmap.phase6.subtask5.title'),
              details: [
                  t('roadmap.phase6.subtask5.detail1'),
              ],
              completed: false,
          },
          {
              title: t('roadmap.phase6.subtask6.title'),
              details: [
                  t('roadmap.phase6.subtask6.detail1'),
              ],
              completed: false,
          }
      ]
    }
  ];


  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          {t('roadmap_title')}
        </h1>
        <p className="text-muted-foreground">
          {t('roadmap_desc')}
        </p>
      </div>
      
       <Card className="bg-primary/10 border-primary/20">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
            <Rocket className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-primary-foreground/90">{t('project_complete')}</CardTitle>
            <CardDescription className="text-primary-foreground/80">
              {t('project_complete_desc')}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('development_phases')}</CardTitle>
          <CardDescription>
            {t('development_phases_desc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
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
                        <h3 className="font-semibold">{t('objective')}</h3>
                        <p className="text-muted-foreground">{phase.objective}</p>
                     </div>
                  </div>
                  
                  <div>
                    <h3 className="mb-2 font-semibold mt-4">{t('sub-tasks')}</h3>
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
