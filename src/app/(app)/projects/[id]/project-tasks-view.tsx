
'use client';

import { useIsMobile } from "@/hooks/use-mobile";
import type { Task } from "./page";
import { ProjectTasksKanban } from "./project-tasks-kanban";
import { ProjectTasksList } from "./project-tasks-list";

interface Employee {
  id: string;
  name: string;
  photoUrl?: string;
}

interface ProjectTasksViewProps {
  tasks: Task[];
  projectId: string;
  team: Employee[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

export function ProjectTasksView({ tasks, projectId, team, onEditTask, onDeleteTask }: ProjectTasksViewProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <ProjectTasksList
        tasks={tasks}
        projectId={projectId}
        team={team}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
      />
    );
  }

  return (
    <ProjectTasksKanban
      tasks={tasks}
      projectId={projectId}
      team={team}
      onEditTask={onEditTask}
      onDeleteTask={onDeleteTask}
    />
  );
}
