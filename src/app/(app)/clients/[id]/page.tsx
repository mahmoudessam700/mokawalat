'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, User, Phone, Mail, PlusCircle, Loader2, MessageSquare, Briefcase, PhoneCall, MailIcon, Users, NotepadText, Lightbulb, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { addInteraction, getInteractionSummary } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type ClientStatus = 'Lead' | 'Active' | 'Inactive';
type InteractionType = 'Call' | 'Email' | 'Meeting' | 'Note';

type Client = {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  status: ClientStatus;
};

type Interaction = {
  id: string;
  type: InteractionType;
  notes: string;
  date: Timestamp;
};

const statusVariant: { [key in ClientStatus]: 'default' | 'secondary' | 'destructive' } = {
  Lead: 'default',
  Active: 'secondary',
  Inactive: 'destructive',
};

const interactionIcons: { [key in InteractionType]: React.ReactNode } = {
    Call: <PhoneCall className="size-4 text-muted-foreground" />,
    Email: <MailIcon className="size-4 text-muted-foreground" />,
    Meeting: <Users className="size-4 text-muted-foreground" />,
    Note: <NotepadText className="size-4 text-muted-foreground" />,
};

const interactionFormSchema = z.object({
  type: z.enum(["Call", "Email", "Meeting", "Note"]),
  notes: z.string().min(5, "Notes must be at least 5 characters long."),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid date.',
  }),
});

type InteractionFormValues = z.infer<typeof interactionFormSchema>;

function ClientAiSummary({ clientId, clientName }: { clientId: string, clientName: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    setSummary(null);
    try {
      const result = await getInteractionSummary(clientId);
      if (result.error || !result.data) {
        throw new Error(result.message || 'Failed to get summary.');
      }
      setSummary(result.data.summary);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary"/>
            AI Interaction Summary
        </CardTitle>
        <CardDescription>
          Get an AI-generated summary of the entire interaction history with {clientName}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!summary && !isLoading && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-muted p-8 text-center">
                <Lightbulb className="size-12 text-muted-foreground" />
                <p className="text-muted-foreground">Ready to summarize client interactions.</p>
                <Button onClick={handleAnalyze} disabled={isLoading}>
                    {isLoading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
                    ) : ( 'Generate Summary' )}
                </Button>
            </div>
        )}
        
        {isLoading && (
            <div className="space-y-3">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        )}

        {error && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Summary Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {summary && (
            <div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{summary}</p>
                <div className="flex justify-end mt-4">
                    <Button onClick={handleAnalyze} variant="outline" size="sm" disabled={isLoading}>
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Regenerating...</>
                        ) : ( 'Regenerate' )}
                    </Button>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const [client, setClient] = useState<Client | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const { toast } = useToast();
  const clientId = params.id;

  useEffect(() => {
    if (!clientId) return;
    setIsLoading(true);

    const clientRef = doc(firestore, 'clients', clientId);
    
    const unsubClient = onSnapshot(clientRef, (doc) => {
      if (doc.exists()) {
        setClient({ id: doc.id, ...doc.data() } as Client);
      } else {
        setError('Client not found.');
      }
    }, (err) => {
      console.error('Error fetching client:', err);
      setError('Failed to fetch client details.');
    });

    const interactionsQuery = query(collection(firestore, 'clients', clientId, 'interactions'), orderBy('date', 'desc'));
    const unsubInteractions = onSnapshot(interactionsQuery, (snapshot) => {
      const interactionsData: Interaction[] = [];
      snapshot.forEach(doc => {
        interactionsData.push({ id: doc.id, ...doc.data() } as Interaction);
      });
      setInteractions(interactionsData);
      setIsLoading(false);
    }, (err) => {
       console.error('Error fetching interactions:', err);
       setError('Failed to fetch interactions.');
       setIsLoading(false);
    });

    return () => {
      unsubClient();
      unsubInteractions();
    };
  }, [clientId]);

  const form = useForm<InteractionFormValues>({
    resolver: zodResolver(interactionFormSchema),
    defaultValues: {
      type: 'Call',
      notes: '',
      date: new Date().toISOString().split('T')[0],
    },
  });

  async function onInteractionSubmit(values: InteractionFormValues) {
    const result = await addInteraction(clientId, values);

    if (result.errors) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message,
      });
    } else {
      toast({
        title: 'Success',
        description: result.message,
      });
      form.reset();
      setIsFormDialogOpen(false);
    }
  }


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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-6">
                <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
                <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
            </div>
            <Card className="lg:col-span-2"><CardContent className="p-6"><Skeleton className="h-80 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-[50vh]">
        <Users className="w-16 h-16 mb-4 text-destructive" />
        <h2 className="text-2xl font-bold">Error</h2>
        <p className="text-muted-foreground">{error}</p>
         <Button asChild variant="outline" className="mt-4">
          <Link href="/clients">
            <ArrowLeft className="mr-2" />
            Back to Clients
          </Link>
        </Button>
      </div>
    );
  }

  if (!client) return null;

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/clients">
                    <ArrowLeft />
                    <span className="sr-only">Back to Clients</span>
                </Link>
            </Button>
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">
                    {client.name}
                </h1>
                <p className="text-muted-foreground">
                    Detailed client view and interaction history.
                </p>
            </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
           <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Client Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Briefcase className="size-4 text-muted-foreground" />
                            <span className="text-sm">{client.company || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Mail className="size-4 text-muted-foreground" />
                            <a href={`mailto:${client.email}`} className="text-sm hover:underline">{client.email}</a>
                        </div>
                        <div className="flex items-center gap-4">
                            <Phone className="size-4 text-muted-foreground" />
                            <span className="text-sm">{client.phone}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <User className="size-4 text-muted-foreground" />
                            <Badge variant={statusVariant[client.status]}>{client.status}</Badge>
                        </div>
                    </CardContent>
                </Card>

                <ClientAiSummary clientId={client.id} clientName={client.name} />
           </div>

            <Card className="lg:col-span-2">
                 <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle>Interaction History</CardTitle>
                        <CardDescription>A log of all communications with this client.</CardDescription>
                    </div>
                    <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <PlusCircle className="mr-2" /> Log Interaction
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Log New Interaction</DialogTitle>
                                <DialogDescription>Record a new call, email, or meeting.</DialogDescription>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onInteractionSubmit)} className="space-y-4 py-4">
                                    <FormField
                                        control={form.control}
                                        name="date"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Date</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select interaction type" />
                                                    </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Call">Call</SelectItem>
                                                        <SelectItem value="Email">Email</SelectItem>
                                                        <SelectItem value="Meeting">Meeting</SelectItem>
                                                        <SelectItem value="Note">Note</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="notes"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Notes</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Enter details about the interaction..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <DialogFooter>
                                        <Button type="submit" disabled={form.formState.isSubmitting}>
                                            {form.formState.isSubmitting ? (
                                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                                            ) : (
                                                'Log Interaction'
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    {interactions.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Type</TableHead>
                                    <TableHead className="w-[150px]">Date</TableHead>
                                    <TableHead>Notes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {interactions.map(interaction => (
                                    <TableRow key={interaction.id}>
                                        <TableCell>{interactionIcons[interaction.type]}</TableCell>
                                        <TableCell>{interaction.date ? format(interaction.date.toDate(), 'PPP p') : 'N/A'}</TableCell>
                                        <TableCell className="whitespace-pre-wrap">{interaction.notes}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                            <MessageSquare className="size-12" />
                            <p>No interactions logged yet.</p>
                            <p className="text-xs">Use the "Log Interaction" button to add the first one.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
