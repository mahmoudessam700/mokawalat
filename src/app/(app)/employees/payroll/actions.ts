
'use server';

import { firestore } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';

const runPayrollSchema = z.object({
  accountId: z.string().min(1, 'A bank account is required to run payroll.'),
  payrollDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid date.',
  }),
});

export type RunPayrollFormValues = z.infer<typeof runPayrollSchema>;

export async function runPayroll(runBy: { uid: string, email: string }, values: RunPayrollFormValues) {
  const validatedFields = runPayrollSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  const { accountId, payrollDate } = validatedFields.data;
  const transactionDate = new Date(payrollDate);
  const payrollPeriodId = format(transactionDate, 'yyyy-MM');

  try {
    // Check if payroll has already been run for this period
    const payrollRunRef = doc(firestore, 'payrollRuns', payrollPeriodId);
    const payrollRunSnap = await getDoc(payrollRunRef);
    if (payrollRunSnap.exists()) {
        return {
            message: `Payroll has already been run for ${format(transactionDate, 'MMMM yyyy')}.`,
            errors: { _server: ['Duplicate payroll run prevented.'] },
        };
    }


    const employeesQuery = query(
      collection(firestore, 'employees'),
      where('status', '==', 'Active'),
      where('salary', '>', 0)
    );
    const employeesSnapshot = await getDocs(employeesQuery);

    if (employeesSnapshot.empty) {
      return {
        message: 'No active employees with salaries found to run payroll for.',
        errors: { _server: ['No employees to process.'] },
      };
    }

    const batch = writeBatch(firestore);
    const transactionsCollection = collection(firestore, 'transactions');
    let totalPayroll = 0;

    employeesSnapshot.forEach((empDoc) => {
      const employee = empDoc.data();
      const newTransactionRef = doc(transactionsCollection);
      batch.set(newTransactionRef, {
        description: `Monthly Salary for ${employee.name} (${payrollPeriodId})`,
        amount: employee.salary,
        type: 'Expense',
        date: transactionDate,
        accountId: accountId,
        createdAt: serverTimestamp(),
      });
      totalPayroll += employee.salary;
    });

    // Record the payroll run
    batch.set(payrollRunRef, {
        runAt: serverTimestamp(),
        runByEmail: runBy.email,
        totalAmount: totalPayroll,
        employeeCount: employeesSnapshot.size,
        accountId: accountId,
    });


    const activityLogCollection = collection(firestore, 'activityLog');
    const newActivityRef = doc(activityLogCollection);
    batch.set(newActivityRef, {
      message: `Payroll run for ${
        employeesSnapshot.size
      } employees, totaling ${totalPayroll.toLocaleString()}`,
      type: 'PAYROLL_RUN',
      link: `/financials`,
      timestamp: serverTimestamp(),
    });

    await batch.commit();

    revalidatePath('/employees/payroll');
    revalidatePath('/financials');
    revalidatePath('/financials/accounts');

    return {
      message: `Payroll run successfully for ${employeesSnapshot.size} employees.`,
      errors: null,
    };
  } catch (error) {
    console.error('Error running payroll:', error);
    return {
      message: 'Failed to run payroll.',
      errors: { _server: ['An unexpected error occurred.'] },
    };
  }
}
