
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users } from 'lucide-react';
import { assignTeamToProject } from '../actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/hooks/use-language';

// Employee type mirroring what's in employees/page.tsx
type Employee = {
  id: string;
  name: string;
  role: string;
};

const assignTeamFormSchema = z.object({
  employeeIds: z.array(z.string()).default([]),
});

type AssignTeamFormValues = z.infer<typeof assignTeamFormSchema>;

interface AssignTeamDialogProps {
  projectId: string;
  employees: Employee[];
  assignedEmployeeIds: string[];
}

export function AssignTeamDialog({ projectId, employees, assignedEmployeeIds }: AssignTeamDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const form = useForm<AssignTeamFormValues>({
    resolver: zodResolver(assignTeamFormSchema),
    defaultValues: {
      employeeIds: assignedEmployeeIds || [],
    },
  });

  async function onSubmit(values: AssignTeamFormValues) {
    const result = await assignTeamToProject(projectId, values);

    if (result.errors) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: result.message,
      });
    } else {
      toast({
        title: t('success'),
        description: result.message,
      });
      setIsOpen(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users className="mr-2" />
          {t('projects.assign_team_button')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('projects.assign_team_dialog_title')}</DialogTitle>
          <DialogDescription>
            {t('projects.assign_team_dialog_desc')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="employeeIds"
              render={() => (
                <FormItem>
                  <ScrollArea className="h-72 w-full rounded-md border p-4">
                    <div className="mb-4">
                        <FormLabel className="text-base">{t('projects.employees_label')}</FormLabel>
                    </div>
                    {employees.map((employee) => (
                      <FormField
                        key={employee.id}
                        control={form.control}
                        name="employeeIds"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={employee.id}
                              className="flex flex-row items-start space-x-3 space-y-0 py-2"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(employee.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, employee.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== employee.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                <div className="flex flex-col">
                                    <span>{employee.name}</span>
                                    <span className="text-xs text-muted-foreground">{employee.role}</span>
                                </div>
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </ScrollArea>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  t('projects.save_team_button')
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
