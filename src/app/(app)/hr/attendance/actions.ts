
'use server';

import { firestore } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  query,
  where,
  getDocs,
  limit,
  getDoc,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';

export async function checkIn(employeeId: string, employeeName: string) {
  if (!employeeId || !employeeName) {
    return { success: false, message: 'errors.employee_info_required' };
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const attendanceCollection = collection(firestore, 'attendance');

  try {
    // Check if there is already an open check-in for today
    const q = query(
      attendanceCollection,
      where('employeeId', '==', employeeId),
      where('date', '==', todayStr)
    );
    const todaysRecords = await getDocs(q);
    
    const hasOpenCheckIn = todaysRecords.docs.some(doc => doc.data().checkOutTime === null);

    if (hasOpenCheckIn) {
      return { success: false, message: 'hr.attendance.already_checked_in' };
    }

    // Create a new attendance record
    await addDoc(attendanceCollection, {
      employeeId,
      employeeName,
      checkInTime: serverTimestamp(),
      checkOutTime: null,
      date: todayStr,
      status: 'Present',
    });

    await addDoc(collection(firestore, 'activityLog'), {
        message: `Employee ${employeeName} checked in.`,
        type: "ATTENDANCE_CHECK_IN",
        link: `/hr/attendance`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/hr/attendance');
    revalidatePath(`/employees/${employeeId}`);

    return { success: true, message: 'hr.attendance.check_in_success' };
  } catch (error) {
    console.error('Error checking in:', error);
    return { success: false, message: 'hr.attendance.check_in_fail' };
  }
}

export async function checkOut(attendanceId: string) {
  if (!attendanceId) {
    return { success: false, message: 'errors.attendance_id_required' };
  }

  try {
    const attendanceRef = doc(firestore, 'attendance', attendanceId);
    await updateDoc(attendanceRef, {
      checkOutTime: serverTimestamp(),
    });

    const attendanceSnap = await getDoc(attendanceRef);
    const employeeName = attendanceSnap.exists() ? attendanceSnap.data().employeeName : 'Unknown';

    await addDoc(collection(firestore, 'activityLog'), {
        message: `Employee ${employeeName} checked out.`,
        type: "ATTENDANCE_CHECK_OUT",
        link: `/hr/attendance`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/hr/attendance');
    if(attendanceSnap.exists()) revalidatePath(`/employees/${attendanceSnap.data().employeeId}`);

    return { success: true, message: 'hr.attendance.check_out_success' };
  } catch (error) {
    console.error('Error checking out:', error);
    return { success: false, message: 'hr.attendance.check_out_fail' };
  }
}
