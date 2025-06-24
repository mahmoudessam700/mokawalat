
'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from 'react-beautiful-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Task } from './page';
import { updateTaskStatus } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ProjectTasksKanbanProps {
  tasks: Task[];
  projectId: string;
}

type TaskStatus = 'To Do' | 'In Progress' | 'Done';

const columns: TaskStatus[] = ['To Do', 'In Progress', 'Done'];

export function ProjectTasksKanban({ tasks, projectId }: ProjectTasksKanbanProps) {
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

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

    // Firestore `onSnapshot` will handle the UI update automatically when the data changes.
    // This removes the need for complex optimistic UI updates here.
    const response = await updateTaskStatus(projectId, taskId, newStatus);

    if (!response.success) {
      toast({
        variant: 'destructive',
        title: 'Error updating task',
        description: response.message,
      });
    }
  };

  const tasksByStatus = columns.reduce((acc, status) => {
    acc[status] = tasks
        .filter(task => task.status === status)
        .sort((a,b) => a.createdAt.toMillis() - b.createdAt.toMillis());
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
                        tasksByStatus[columnId].map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <Card className={`bg-card hover:bg-card/90 ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}>
                                <CardContent className="p-3">
                                  <p className="font-medium text-sm">{task.name}</p>
                                  {task.dueDate && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Due: {format(task.dueDate.toDate(), 'PPP')}
                                    </p>
                                  )}
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))) : (
                        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                            No tasks in this column.
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
    </DragDropContext>
  );
}

