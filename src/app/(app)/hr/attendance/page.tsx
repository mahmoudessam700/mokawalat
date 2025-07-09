
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, where, orderBy, type Timestamp, limit } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { ArrowLeft, Check, Clock, Loader2, LogIn, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { checkIn, checkOut } from './actions';
import Link from 'next/link';
import { useLanguage } from '@/hooks/use-language';
import { Badge } from '@/components/ui/badge';

type Attendance = {
  id: string;
  employeeId: string;
  employeeName: string;
  checkInTime: Timestamp;
  checkOutTime: Timestamp | null;
  date: string;
  status: 'Present' | 'On Leave';
};

export default function AttendancePage() {
  const [attendanceLog, setAttendanceLog] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const { profile, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const myTodaysAttendance = useMemo(() => {
    if (!profile) return null;
    return attendanceLog.find(
      (a) => a.employeeId === profile.uid && a.date === todayStr && a.checkOutTime === null
    );
  }, [attendanceLog, profile, todayStr]);

  const hasCheckedInToday = useMemo(() => {
     if (!profile) return false;
     return attendanceLog.some(a => a.employeeId === profile.uid && a.date === todayStr);
  }, [attendanceLog, profile, todayStr]);


  useEffect(() => {
    if (!isAuthLoading && !profile) {
      router.replace('/login');
      return;
    }
    const q = query(collection(firestore, 'attendance'), orderBy('checkInTime', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAttendanceLog(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance)));
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching attendance: ", error);
      toast({ variant: 'destructive', title: t('error'), description: 'Failed to fetch attendance.' });
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [isAuthLoading, profile, router, toast, t]);

  const handleCheckIn = async () => {
    if (!profile) return;
    setIsActionLoading(true);
    const result = await checkIn(profile.uid, profile.email);
    if (result.success) {
      toast({ title: t('success'), description: t(result.message) });
    } else {
      toast({ variant: 'destructive', title: t('error'), description: t(result.message) });
    }
    setIsActionLoading(false);
  };

  const handleCheckOut = async () => {
    if (!myTodaysAttendance) return;
    setIsActionLoading(true);
    const result = await checkOut(myTodaysAttendance.id);
    if (result.success) {
      toast({ title: t('success'), description: t(result.message) });
    } else {
      toast({ variant: 'destructive', title: t('error'), description: t(result.message) });
    }
    setIsActionLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/hr">
              <ArrowLeft />
              <span className="sr-only">{t('employees.back_to_hr')}</span>
            </Link>
          </Button>
          <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight">
              {t('human_capital_management.attendance.title')}
            </h1>
            <p className="text-muted-foreground">{t('human_capital_management.attendance.page_desc')}</p>
          </div>
        </div>
        <Card className="p-4">
            {myTodaysAttendance ? (
                <Button onClick={handleCheckOut} disabled={isActionLoading} variant="destructive">
                    {isActionLoading ? <Loader2 className="mr-2 animate-spin" /> : <LogOut className="mr-2" />}
                    {t('human_capital_management.attendance.check_out')}
                </Button>
            ) : hasCheckedInToday ? (
                <div className="flex items-center gap-2 text-green-600 font-semibold">
                    <Check className="size-5" />
                    <span>{t('human_capital_management.attendance.already_checked_out')}</span>
                </div>
            ) : (
                <Button onClick={handleCheckIn} disabled={isActionLoading}>
                     {isActionLoading ? <Loader2 className="mr-2 animate-spin" /> : <LogIn className="mr-2" />}
                    {t('human_capital_management.attendance.check_in')}
                </Button>
            )}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('human_capital_management.attendance.log_title')}</CardTitle>
          <CardDescription>{t('human_capital_management.attendance.log_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('employee')}</TableHead>
                <TableHead>{t('date')}</TableHead>
                <TableHead>{t('human_capital_management.attendance.check_in')}</TableHead>
                <TableHead>{t('human_capital_management.attendance.check_out')}</TableHead>
                <TableHead>{t('status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))
              ) : attendanceLog.length > 0 ? (
                attendanceLog.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.employeeName}</TableCell>
                    <TableCell>{format(new Date(log.date), 'PPP')}</TableCell>
                    <TableCell>{log.checkInTime ? format(log.checkInTime.toDate(), 'p') : 'N/A'}</TableCell>
                    <TableCell>{log.checkOutTime ? format(log.checkOutTime.toDate(), 'p') : '-'}</TableCell>
                    <TableCell><Badge variant={log.status === 'Present' ? 'secondary' : 'outline'}>{t(`human_capital_management.attendance.status.${log.status}`)}</Badge></TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-24 text-center"><div className="flex flex-col items-center justify-center gap-2 text-muted-foreground"><Clock className="size-12" /><p>{t('human_capital_management.attendance.no_history')}</p></div></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
