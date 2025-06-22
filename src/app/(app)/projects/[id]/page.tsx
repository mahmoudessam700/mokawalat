'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, type Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Briefcase, Calendar, DollarSign, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type ProjectStatus = 'In Progress' | 'Planning' | 'Completed' | 'On Hold';

type Project = {
  id: string;
  name: string;
  description?: string;
  budget: number;
  startDate: Timestamp;
  status: ProjectStatus;
};

const statusVariant: {
  [key in ProjectStatus]: 'secondary' | 'default' | 'outline' | 'destructive';
} = {
  'In Progress': 'secondary',
  Planning: 'default',
  Completed: 'outline',
  'On Hold': 'destructive',
};

const formatCurrency = (value: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
    });
    return `LE ${formatter.format(value)}`;
};

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const projectId = params.id;

  useEffect(() => {
    if (!projectId) return;

    const fetchProject = async () => {
      setIsLoading(true);
      try {
        const projectRef = doc(firestore, 'projects', projectId);
        const docSnap = await getDoc(projectRef);

        if (docSnap.exists()) {
          setProject({ id: docSnap.id, ...docSnap.data() } as Project);
        } else {
          setError('Project not found.');
        }
      } catch (err) {
        console.error('Error fetching project:', err);
        setError('Failed to fetch project details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
             <Skeleton className="h-10 w-10 rounded-md" />
            <div>
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48 mt-2" />
            </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-[50vh]">
        <Briefcase className="w-16 h-16 mb-4 text-destructive" />
        <h2 className="text-2xl font-bold">Error</h2>
        <p className="text-muted-foreground">{error}</p>
         <Button asChild variant="outline" className="mt-4">
          <Link href="/projects">
            <ArrowLeft className="mr-2" />
            Back to Projects
          </Link>
        </Button>
      </div>
    );
  }

  if (!project) {
    return null; 
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/projects">
                    <ArrowLeft />
                    <span className="sr-only">Back to Projects</span>
                </Link>
            </Button>
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">
                    {project.name}
                </h1>
                <p className="text-muted-foreground">
                    Detailed view of the project.
                </p>
            </div>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Project Details</CardTitle>
                {project.description && (
                    <CardDescription>{project.description}</CardDescription>
                )}
            </CardHeader>
            <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <DollarSign className="size-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Budget</p>
                            <p className="text-lg font-semibold">{formatCurrency(project.budget)}</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Calendar className="size-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Start Date</p>
                            <p className="text-lg font-semibold">{project.startDate ? format(project.startDate.toDate(), 'PPP') : 'N/A'}</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Activity className="size-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <Badge variant={statusVariant[project.status]} className="text-base font-semibold">{project.status}</Badge>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Assigned Team</CardTitle>
                    <CardDescription>Team members assigned to this project.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Feature coming soon.</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Related Procurements</CardTitle>
                    <CardDescription>Purchase requests linked to this project.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Feature coming soon.</p>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
