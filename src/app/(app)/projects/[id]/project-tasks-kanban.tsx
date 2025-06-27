
'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from 'react-beautiful-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Task } from './page';
import { updateTaskStatus } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/use-language';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2 } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  photoUrl?: string;
}

interface ProjectTasksKanbanProps {
  tasks: Task[];
  projectId: string;
  team: Employee[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

type TaskStatus = 'To Do' | 'In Progress' | 'Done';

const columns: TaskStatus[] = ['To Do', 'In Progress', 'Done'];

export function ProjectTasksKanban({ tasks, projectId, team, onEditTask, onDeleteTask }: ProjectTasksKanbanProps) {
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }
    
    const newStatus = destination.droppableId as TaskStatus;
    const taskId = draggableId;

    const response = await updateTaskStatus(projectId, taskId, newStatus);

    if (!response.success) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: response.message,
      });
    }
  };

  const tasksByStatus = columns.reduce((acc, status) => {
    acc[status] = tasks
        .filter(task => task.status === status)
        .sort((a,b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
    return acc;
  }, {} as Record<TaskStatus, Task[]>);
  
  if (!isClient) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[400px] w-full" />
        </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <TooltipProvider>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((columnId) => (
            <div key={columnId}>
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg flex justify-between items-center">
                      <span>{columnId}</span>
                      <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded-md">{tasksByStatus[columnId].length}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Droppable droppableId={columnId}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`min-h-[400px] space-y-4 rounded-md p-2 transition-colors ${
                          snapshot.isDraggingOver ? 'bg-accent' : ''
                        }`}
                      >
                        {tasksByStatus[columnId].length > 0 ? (
                          tasksByStatus[columnId].map((task, index) => {
                            const assignedEmployee = team.find(member => member.id === task.assignedTo);
                            return (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                  >
                                    <Card className={`bg-card hover:bg-card/90 group/task relative ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}>
                                      <CardContent className="p-3">
                                        <div className="absolute top-1 right-1 z-10">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover/task:opacity-100 focus:opacity-100">
                                                        <MoreHorizontal className="size-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onSelect={() => onEditTask(task)}>
                                                        {t('edit')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => onDeleteTask(task)} className="text-destructive">
                                                        <Trash2 className="mr-2" />
                                                        {t('delete')}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <div className="flex justify-between items-start">
                                          <p className="font-medium text-sm pr-8">{task.name}</p>
                                          {assignedEmployee && (
                                            <Tooltip>
                                              <TooltipTrigger>
                                                <Avatar className="size-6">
                                                  <AvatarImage src={assignedEmployee.photoUrl || `https://placehold.co/40x40.png`} alt={assignedEmployee.name} data-ai-hint="profile picture" />
                                                  <AvatarFallback>{assignedEmployee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                                </Avatar>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>{t('assigned_to')} {assignedEmployee.name}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                        </div>
                                        {task.dueDate && (
                                          <p className="text-xs text-muted-foreground mt-2">
                                            {t('assets.due')}: {format(task.dueDate.toDate(), 'PPP')}
                                          </p>
                                        )}
                                      </CardContent>
                                    </Card>
                                  </div>
                                )}
                              </Draggable>
                            )
                          })) : (
                          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                              {t('projects.no_tasks_in_column')}
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </TooltipProvider>
    </DragDropContext>
  );
}
