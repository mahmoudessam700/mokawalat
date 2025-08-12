
'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, collection, query, orderBy, type Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Wrench, Calendar, DollarSign, Activity, ListTodo, PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { addMaintenanceLog, type MaintenanceLogFormValues } from './actions';
import { useLanguage } from '@/hooks/use-language';

type AssetStatus = 'Available' | 'In Use' | 'Under Maintenance' | 'Decommissioned';

type Asset = {
  id: string;
  name: string;
  category: string;
  status: AssetStatus;
  purchaseDate: Timestamp;
  purchaseCost: number;
  currentProjectId?: string;
  nextMaintenanceDate?: Timestamp;
};

type Project = {
    id: string;
    name: string;
};

type MaintenanceLog = {
    id: string;
    date: Timestamp;
    type: string;
    description: string;
    cost?: number;
    completedBy?: string;
};

const statusVariant: { [key in AssetStatus]: 'secondary' | 'default' | 'outline' | 'destructive' } = {
  'Available': 'secondary',
  'In Use': 'default',
  'Under Maintenance': 'outline',
  'Decommissioned': 'destructive',
};

const maintenanceTypes = ['Scheduled', 'Repair', 'Inspection', 'Upgrade', 'Other'];

const maintenanceLogFormSchema = z.object({
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid date.',
  }),
  type: z.string().min(1, "Type is required."),
  description: z.string().min(5, "Description must be at least 5 characters long."),
  cost: z.coerce.number().optional(),
  completedBy: z.string().optional(),
});

const formatCurrency = (value: number) => {
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
  });
  return `LE ${formatter.format(value)}`;
};

export default function AssetDetailPage({ params }: { params: { id: string } }) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();
  const assetId = params.id;
  const { t } = useLanguage();

  useEffect(() => {
    if (!assetId) return;
    setIsLoading(true);
    setError(null);

    const unsubscribes: (() => void)[] = [];

    const assetRef = doc(firestore, 'assets', assetId);
    unsubscribes.push(onSnapshot(assetRef, (assetDoc) => {
        if (assetDoc.exists()) {
            const assetData = { id: assetDoc.id, ...assetDoc.data() } as Asset;
            setAsset(assetData);
            if (assetData.currentProjectId) {
                const projectRef = doc(firestore, 'projects', assetData.currentProjectId);
                unsubscribes.push(onSnapshot(projectRef, (projectDoc: any) => {
                    setProject(projectDoc.exists() ? { id: projectDoc.id, ...projectDoc.data() } as Project : null);
                }));
            }
        } else {
            setError('Asset not found.');
        }
        setIsLoading(false);
    }, (err) => {
        console.error('Error fetching asset:', err);
        setError('Failed to fetch asset details.');
        setIsLoading(false);
    }));

    const logsQuery = query(collection(firestore, 'assets', assetId, 'maintenanceLogs'), orderBy('date', 'desc'));
    unsubscribes.push(onSnapshot(logsQuery, (snapshot) => {
        setMaintenanceLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceLog)));
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [assetId]);

  const logForm = useForm<MaintenanceLogFormValues>({
    resolver: zodResolver(maintenanceLogFormSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      type: '',
      description: '',
      cost: 0,
      completedBy: '',
    },
  });

  async function onLogSubmit(values: MaintenanceLogFormValues) {
    const result = await addMaintenanceLog(assetId, values);
    if (result.errors) {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    } else {
      toast({ title: t('success'), description: result.message });
      logForm.reset();
      setIsLogDialogOpen(false);
    }
  }
  
  if (isLoading) {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10" />
                <div>
                    <Skeleton className="h-9 w-64" />
                    <Skeleton className="h-5 w-32 mt-1" />
                </div>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
                <Card className="lg:col-span-2"><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
            </div>
        </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-[50vh]">
        <Wrench className="w-16 h-16 mb-4 text-destructive" />
        <h2 className="text-2xl font-bold">{t('error')}</h2>
        <p className="text-muted-foreground">{error}</p>
         <Button asChild variant="outline" className="mt-4">
          <Link href="/assets">
            <ArrowLeft className="mr-2" />
            {t('assets.back_to_assets')}
          </Link>
        </Button>
      </div>
    );
  }

  if (!asset) return null;

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/assets">
                    <ArrowLeft />
                    <span className="sr-only">{t('assets.back_to_assets')}</span>
                </Link>
            </Button>
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">{asset.name}</h1>
                <p className="text-muted-foreground">{t(`asset_categories.${asset.category.replace(/ /g, '_')}`)}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle>{t('assets.details_card_title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('status')}</span>
                        <Badge variant={statusVariant[asset.status]}>{t(`assets.status.${asset.status.replace(/ /g, '_')}`)}</Badge>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('assets.purchase_date_label')}</span>
                        <span>{asset.purchaseDate ? format(asset.purchaseDate.toDate(), 'PPP') : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('assets.purchase_cost_label')}</span>
                        <span className="font-semibold">{formatCurrency(asset.purchaseCost)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('assets.next_maintenance_label')}</span>
                        <span>{asset.nextMaintenanceDate ? format(asset.nextMaintenanceDate.toDate(), 'PPP') : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('assets.assigned_project_header')}</span>
                        <span>{project ? <Link href={`/projects/${project.id}`} className="font-medium text-primary hover:underline">{project.name}</Link> : 'N/A'}</span>
                    </div>
                </CardContent>
            </Card>
            
            <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>{t('assets.maintenance_history_title')}</CardTitle>
                        <CardDescription>{t('assets.maintenance_history_desc')}</CardDescription>
                    </div>
                    {['admin', 'manager'].includes(profile?.role || '') && (
                        <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
                            <DialogTrigger asChild><Button><PlusCircle className="mr-2" />{t('assets.log_maintenance_button')}</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{t('assets.log_new_maintenance_title')}</DialogTitle>
                                </DialogHeader>
                                <Form {...logForm}>
                                    <form onSubmit={logForm.handleSubmit(onLogSubmit)} className="space-y-4 py-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={logForm.control} name="date" render={({ field }) => (<FormItem><FormLabel>{t('date')}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={logForm.control} name="type" render={({ field }) => (<FormItem><FormLabel>{t('type')}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent>{maintenanceTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                                        </div>
                                        <FormField control={logForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>{t('assets.description_of_work')}</FormLabel><FormControl><Textarea placeholder={t('assets.work_desc_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={logForm.control} name="cost" render={({ field }) => (<FormItem><FormLabel>{t('assets.cost_le_optional')}</FormLabel><FormControl><Input type="number" placeholder={t('assets.cost_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={logForm.control} name="completedBy" render={({ field }) => (<FormItem><FormLabel>{t('assets.completed_by_optional')}</FormLabel><FormControl><Input placeholder={t('assets.completed_by_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit" disabled={logForm.formState.isSubmitting}>{logForm.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('saving')}</> : t('assets.save_log_button')}</Button>
                                        </DialogFooter>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    )}
                </CardHeader>
                <CardContent>
                    {maintenanceLogs.length > 0 ? (
                        <Table>
                            <TableHeader><TableRow><TableHead>{t('date')}</TableHead><TableHead>{t('type')}</TableHead><TableHead>{t('description')}</TableHead><TableHead className="text-right">{t('amount')}</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {maintenanceLogs.map(log => (
                                    <TableRow key={log.id}>
                                        <TableCell>{log.date ? format(log.date.toDate(), 'PPP') : 'N/A'}</TableCell>
                                        <TableCell><Badge variant="outline">{log.type}</Badge></TableCell>
                                        <TableCell>{log.description}</TableCell>
                                        <TableCell className="text-right">{log.cost ? formatCurrency(log.cost) : 'N/A'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground"><ListTodo className="size-12" /><p>{t('assets.no_maintenance_logs')}</p></div>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}

