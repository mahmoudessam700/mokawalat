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
} from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const runPayrollSchema = z.object({
  accountId: z.string().min(1, 'A bank account is required to run payroll.'),
  payrollDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid date.',
  }),
});

export type RunPayrollFormValues = z.infer<typeof runPayrollSchema>;

export async function runPayroll(values: RunPayrollFormValues) {
  const validatedFields = runPayrollSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  const { accountId, payrollDate } = validatedFields.data;
  const transactionDate = new Date(payrollDate);

  try {
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

    employeesSnapshot.forEach((doc) => {
      const employee = doc.data();
      const newTransactionRef = doc(transactionsCollection);
      batch.set(newTransactionRef, {
        description: `Monthly Salary for ${employee.name}`,
        amount: employee.salary,
        type: 'Expense',
        date: transactionDate,
        accountId: accountId,
        createdAt: serverTimestamp(),
      });
      totalPayroll += employee.salary;
    });

    const activityLogCollection = collection(firestore, 'activityLog');
    const newActivityRef = doc(activityLogCollection);
    batch.set(newActivityRef, {
      message: `Monthly payroll run for ${
        employeesSnapshot.size
      } employees, totaling ${totalPayroll.toLocaleString()}.`,
      type: 'TRANSACTION_ADDED',
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
