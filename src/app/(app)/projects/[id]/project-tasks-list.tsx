
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Task } from './page';
import { format } from 'date-fns';
import { useLanguage } from '@/hooks/use-language';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { updateTaskStatus } from '../actions';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  id: string;
  name: string;
  photoUrl?: string;
}

interface ProjectTasksListProps {
  tasks: Task[];
  projectId: string;
  team: Employee[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

type TaskStatus = 'To Do' | 'In Progress' | 'Done';

export function ProjectTasksList({ tasks, projectId, team, onEditTask, onDeleteTask }: ProjectTasksListProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const response = await updateTaskStatus(projectId, taskId, newStatus);
    if (!response.success) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: response.message,
      });
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const statusOrder: Record<TaskStatus, number> = { 'To Do': 1, 'In Progress': 2, 'Done': 3 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0);
  });

  return (
    <TooltipProvider>
      <Card className="bg-muted/50">
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {sortedTasks.length > 0 ? (
              sortedTasks.map(task => {
                const assignedEmployee = team.find(member => member.id === task.assignedTo);
                return (
                  <li key={task.id} className="flex items-center justify-between p-4">
                    <div className="flex-1 space-y-1">
                      <p className="font-medium">{task.name}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{t('status')}: {task.status}</span>
                        {task.dueDate && <span>{t('assets.due')}: {format(task.dueDate.toDate(), 'PPP')}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {assignedEmployee && (
                           <Tooltip>
                              <TooltipTrigger>
                                <Avatar className="size-7">
                                  <AvatarImage src={assignedEmployee.photoUrl || `https://placehold.co/40x40.png`} alt={assignedEmployee.name} data-ai-hint="profile picture" />
                                  <AvatarFallback>{assignedEmployee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t('assigned_to')} {assignedEmployee.name}</p>
                              </TooltipContent>
                            </Tooltip>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>{t('change_status')}</DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        <DropdownMenuItem disabled={task.status === 'To Do'} onClick={() => handleStatusChange(task.id, 'To Do')}>{t('to_do')}</DropdownMenuItem>
                                        <DropdownMenuItem disabled={task.status === 'In Progress'} onClick={() => handleStatusChange(task.id, 'In Progress')}>{t('in_progress')}</DropdownMenuItem>
                                        <DropdownMenuItem disabled={task.status === 'Done'} onClick={() => handleStatusChange(task.id, 'Done')}>{t('done')}</DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator />
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
                  </li>
                );
              })
            ) : (
              <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                {t('projects.no_tasks_in_column')}
              </div>
            )}
          </ul>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
