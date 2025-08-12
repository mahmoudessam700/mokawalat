// Admin seeding for Firestore, bypassing client auth restrictions.
// Usage: npm run seed:admin
// Requires Firebase Admin credentials: either GOOGLE_APPLICATION_CREDENTIALS pointing
// to a service account JSON, or FIREBASE_SERVICE_ACCOUNT_JSON containing the JSON.

import 'dotenv/config';
import admin from 'firebase-admin';

function initAdmin() {
  if (!admin.apps.length) {
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      credential = admin.credential.cert(parsed);
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      credential = admin.credential.applicationDefault();
    } else {
      console.error('Missing admin credentials. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON');
      process.exit(1);
    }
    admin.initializeApp({ credential, projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
  }
  return admin;
}

const app = initAdmin();
const db = app.firestore();

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function currency(n) { return Math.round(n * 100) / 100; }

async function seedSettings() {
  await db.collection('company').doc('main').set({
    name: 'Mokawalat Co.',
    address: '123 Industrial Zone, Cairo',
    phone: '+20 100 000 0000',
    email: 'info@mokawalat.example',
    logoUrl: '',
    logoPath: '',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  const cats = ['Concrete', 'Steel', 'Electrical', 'Plumbing', 'Finishes'];
  for (const name of cats) await db.collection('inventoryCategories').doc(name.toLowerCase()).set({ name });
  const warehouses = [
    { id: 'main', name: 'Main Warehouse', location: '6th of October' },
    { id: 'east', name: 'East Depot', location: 'New Cairo' },
  ];
  for (const w of warehouses) await db.collection('warehouses').doc(w.id).set({ name: w.name, location: w.location });
}

async function seedHR() {
  await db.collection('users').doc('admin@example.com').set({ uid: 'admin@example.com', email: 'admin@example.com', role: 'admin' });
  await db.collection('users').doc('manager@example.com').set({ uid: 'manager@example.com', email: 'manager@example.com', role: 'manager' });
  await db.collection('users').doc('user@example.com').set({ uid: 'user@example.com', email: 'user@example.com', role: 'user' });

  const jobRef = await db.collection('jobs').add({
    title: 'Site Engineer', title_lowercase: 'site engineer', description: 'Oversee daily site activities.', department: 'Engineering', status: 'Open', createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await db.collection('candidates').add({
    name: 'Ahmed Ali', email: 'ahmed.ali@example.com', phone: '+20 111 222 3333', jobId: jobRef.id, status: 'Applied', appliedAt: admin.firestore.FieldValue.serverTimestamp(), resumeUrl: '', resumePath: '',
  });
  await db.collection('employees').doc('emp1').set({
    name: 'Mona Hassan', name_lowercase: 'mona hassan', email: 'mona.hassan@example.com', role: 'Accountant', department: 'Finance', status: 'Active', salary: 12000, photoUrl: '', photoPath: '', createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  // attendance, leave, performance, training, offboarding
  await db.collection('attendance').add({ employeeId: 'emp1', date: admin.firestore.Timestamp.now(), checkInTime: admin.firestore.Timestamp.now(), checkOutTime: null });
  await db.collection('leaveRequests').add({ employeeId: 'emp1', startDate: admin.firestore.Timestamp.now(), endDate: admin.firestore.Timestamp.now(), status: 'Pending', reason: 'Personal' });
  await db.collection('performanceReviews').add({ employeeId: 'emp1', reviewer: 'manager@example.com', score: 4, comments: 'Strong performer', reviewDate: admin.firestore.Timestamp.now() });
  await db.collection('trainings').add({ employeeId: 'emp1', topic: 'Safety Training', completionDate: admin.firestore.Timestamp.now(), status: 'Completed' });
  await db.collection('offboarding').add({ employeeId: 'emp1', exitDate: admin.firestore.Timestamp.now(), reason: 'Project end' });
}

async function seedSuppliersProjectsInventory() {
  const s1 = await db.collection('suppliers').add({ name: 'Nile Steel Co.', contactPerson: 'Karim Fathy', email: 'sales@nsteel.example', phone: '+20 122 333 4444', status: 'Active', rating: 4, evaluationNotes: 'Reliable.' });
  await db.collection('suppliers').doc(s1.id).collection('contracts').add({ title: 'Annual Steel Supply', effectiveDate: admin.firestore.Timestamp.now(), fileUrl: '' });

  const p1 = await db.collection('projects').add({ name: 'Mall Expansion Phase 2', status: 'In Progress', budget: 2500000, startDate: admin.firestore.FieldValue.serverTimestamp() });
  await db.collection('projects').doc(p1.id).collection('tasks').add({ name: 'Mobilization', createdAt: admin.firestore.FieldValue.serverTimestamp(), status: 'Open' });
  await db.collection('projects').doc(p1.id).collection('dailyLogs').add({ createdAt: admin.firestore.FieldValue.serverTimestamp(), notes: 'Initial setup' });
  await db.collection('projects').doc(p1.id).collection('documents').add({ createdAt: admin.firestore.FieldValue.serverTimestamp(), title: 'Permit', url: '' });

  await db.collection('inventory').add({ name: 'Cement 50kg', sku: 'CEM-50', categoryId: 'concrete', quantity: 250, unit: 'bag', warehouseId: 'main', createdAt: admin.firestore.FieldValue.serverTimestamp() });
  await db.collection('assets').add({ name: 'Excavator CAT320', serial: 'CAT320-001', currentProjectId: p1.id, nextMaintenanceDate: admin.firestore.Timestamp.now() });
}

async function seedFinancialsProcurementClients() {
  const accCash = await db.collection('accounts').add({ name: 'Cash', type: 'Asset' });
  const accExpenses = await db.collection('accounts').add({ name: 'Expenses', type: 'Expense' });

  const supplier = (await db.collection('suppliers').limit(1).get()).docs[0];
  const project = (await db.collection('projects').limit(1).get()).docs[0];

  const po = await db.collection('procurement').add({ itemName: 'Rebar 12mm', quantity: 1000, unitCost: 26.5, totalCost: currency(1000 * 26.5), status: 'Approved', requestedAt: admin.firestore.FieldValue.serverTimestamp(), projectId: project.id, supplierId: supplier.id });

  await db.collection('transactions').add({ description: 'Advance payment for rebar', amount: 20000, type: 'Expense', date: admin.firestore.FieldValue.serverTimestamp(), supplierId: supplier.id, purchaseOrderId: po.id, accountId: accExpenses.id });
  await db.collection('transactions').add({ description: 'Client installment received', amount: 50000, type: 'Income', date: admin.firestore.FieldValue.serverTimestamp(), projectId: project.id, accountId: accCash.id });

  const client = await db.collection('clients').add({ name: 'Alpha Developments', email: 'ops@alpha.example', phone: '+20 155 777 8888', address: 'Downtown, Cairo', status: 'Active', createdAt: admin.firestore.FieldValue.serverTimestamp() });
  await db.collection('clients').doc(client.id).collection('interactions').add({ date: admin.firestore.FieldValue.serverTimestamp(), note: 'Kickoff call.' });
  await db.collection('clients').doc(client.id).collection('contracts').add({ effectiveDate: admin.firestore.FieldValue.serverTimestamp(), title: 'Main Contract' });
  await db.collection('invoices').add({ clientId: client.id, issueDate: admin.firestore.FieldValue.serverTimestamp(), dueDate: admin.firestore.FieldValue.serverTimestamp(), status: 'Unpaid', items: [{ description: 'Structural works progress', amount: 150000 }], total: 150000 });
}

async function seedAux() {
  await db.collection('materialRequests').add({ projectId: (await db.collection('projects').limit(1).get()).docs[0].id, itemId: 'cement', quantity: 50, status: 'Pending', requestedAt: admin.firestore.FieldValue.serverTimestamp() });
  await db.collection('activityLog').add({ type: 'INFO', message: 'Admin seed completed.', link: '/dashboard', timestamp: admin.firestore.FieldValue.serverTimestamp() });
}

async function main() {
  try {
    await seedSettings();
    await seedHR();
    await seedSuppliersProjectsInventory();
    await seedFinancialsProcurementClients();
    await seedAux();
    console.log('Admin seed complete.');
  } catch (e) {
    console.error('Admin seed failed:', e);
    process.exit(1);
  }
}

main();
