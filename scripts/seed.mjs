// Seed Firestore with realistic linked data for all app pages.
// Usage: npm run seed
// Requires NEXT_PUBLIC_* Firebase env vars set in .env.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, serverTimestamp, addDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';
import 'dotenv/config';

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

if (!cfg.apiKey || !cfg.projectId) {
  console.error('Missing Firebase env. Check .env.');
  process.exit(1);
}

const app = getApps().length ? getApp() : initializeApp(cfg);
const db = getFirestore(app);
const auth = getAuth(app);

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function currency(n) { return Math.round(n * 100) / 100; }

async function ensureUser(uid, data) {
  await setDoc(doc(db, 'users', uid), { ...data }, { merge: true });
  return uid;
}

async function seedSettings() {
  // company
  await setDoc(doc(db, 'company', 'main'), {
    name: 'Mokawalat Co.',
    address: '123 Industrial Zone, Cairo',
    phone: '+20 100 000 0000',
    email: 'info@mokawalat.example',
    logoUrl: '',
    logoPath: '',
    updatedAt: serverTimestamp(),
  }, { merge: true });

  // categories
  const cats = ['Concrete', 'Steel', 'Electrical', 'Plumbing', 'Finishes'];
  for (const name of cats) {
    const id = name.toLowerCase();
    await setDoc(doc(db, 'inventoryCategories', id), { name });
  }

  // warehouses
  const warehouses = [
    { id: 'main', name: 'Main Warehouse', location: '6th of October' },
    { id: 'east', name: 'East Depot', location: 'New Cairo' },
  ];
  for (const w of warehouses) {
    await setDoc(doc(db, 'warehouses', w.id), { name: w.name, location: w.location });
  }
}

async function seedHR() {
  // users collection aligns with settings/users page
  await ensureUser('admin@example.com', { uid: 'admin@example.com', email: 'admin@example.com', role: 'admin' });
  await ensureUser('manager@example.com', { uid: 'manager@example.com', email: 'manager@example.com', role: 'manager' });
  await ensureUser('user@example.com', { uid: 'user@example.com', email: 'user@example.com', role: 'user' });

  // jobs
  const jobRef = await addDoc(collection(db, 'jobs'), {
    title: 'Site Engineer',
    title_lowercase: 'site engineer',
    description: 'Oversee daily site activities and coordinate with subcontractors.',
    department: 'Engineering',
    status: 'Open',
    createdAt: serverTimestamp(),
  });

  // candidates
  await addDoc(collection(db, 'candidates'), {
    name: 'Ahmed Ali',
    email: 'ahmed.ali@example.com',
    phone: '+20 111 222 3333',
    jobId: jobRef.id,
    status: 'Applied',
    appliedAt: serverTimestamp(),
    resumeUrl: '',
    resumePath: '',
  });

  // employees for employees page
  await setDoc(doc(db, 'employees', 'emp1'), {
    name: 'Mona Hassan',
    name_lowercase: 'mona hassan',
    email: 'mona.hassan@example.com',
    role: 'Accountant',
    department: 'Finance',
    status: 'Active',
    salary: 12000,
    photoUrl: '',
    photoPath: '',
    createdAt: serverTimestamp(),
  });
}

async function seedSuppliersAndProjects() {
  // suppliers
  const s1 = await addDoc(collection(db, 'suppliers'), {
    name: 'Nile Steel Co.',
    contactPerson: 'Karim Fathy',
    email: 'sales@nsteel.example',
    phone: '+20 122 333 4444',
    status: 'Active',
    rating: 4,
    evaluationNotes: 'Reliable delivery, competitive pricing',
  });

  const s2 = await addDoc(collection(db, 'suppliers'), {
    name: 'Cairo Concrete Ltd.',
    contactPerson: 'Laila Samir',
    email: 'contact@ccl.example',
    phone: '+20 133 555 6666',
    status: 'Active',
    rating: 5,
    evaluationNotes: 'High quality concrete, on-time dispatch',
  });

  // supplier contracts
  await addDoc(collection(db, 'suppliers', s1.id, 'contracts'), {
    title: 'Annual Steel Supply',
    effectiveDate: serverTimestamp(),
    fileUrl: '',
  });

  // projects
  const p1 = await addDoc(collection(db, 'projects'), {
    name: 'Mall Expansion Phase 2',
    status: 'In Progress',
    budget: 2500000,
    startDate: serverTimestamp(),
  });

  const p2 = await addDoc(collection(db, 'projects'), {
    name: 'Residential Tower A',
    status: 'Planning',
    budget: 1800000,
    startDate: serverTimestamp(),
  });

  return { suppliers: [s1, s2], projects: [p1, p2] };
}

async function seedProcurementFinancials(links) {
  const [s1] = links.suppliers;
  const [p1] = links.projects;

  // procurement request / purchase order
  const po = await addDoc(collection(db, 'procurement'), {
    itemName: 'Rebar 12mm',
    quantity: 1000,
    unitCost: 26.5,
    totalCost: currency(1000 * 26.5),
    status: 'Approved',
    requestedAt: serverTimestamp(),
    projectId: p1.id,
    supplierId: s1.id,
  });

  // transactions
  await addDoc(collection(db, 'transactions'), {
    description: 'Advance payment for rebar',
    amount: 20000,
    type: 'Expense',
    date: serverTimestamp(),
    supplierId: s1.id,
    purchaseOrderId: po.id,
  });

  await addDoc(collection(db, 'transactions'), {
    description: 'Client installment received',
    amount: 50000,
    type: 'Income',
    date: serverTimestamp(),
    projectId: p1.id,
  });
}

async function seedInventory() {
  // items
  await addDoc(collection(db, 'inventory'), {
    name: 'Cement 50kg',
    sku: 'CEM-50',
    categoryId: 'concrete',
    quantity: 250,
    unit: 'bag',
    warehouseId: 'main',
    createdAt: serverTimestamp(),
  });

  await addDoc(collection(db, 'inventory'), {
    name: 'Rebar 12mm',
    sku: 'RB12',
    categoryId: 'steel',
    quantity: 120,
    unit: 'bar',
    warehouseId: 'east',
    createdAt: serverTimestamp(),
  });
}

async function seedClientsInvoices() {
  const c1 = await addDoc(collection(db, 'clients'), {
    name: 'Alpha Developments',
    email: 'ops@alpha.example',
    phone: '+20 155 777 8888',
    address: 'Downtown, Cairo',
    status: 'Active',
  });

  await addDoc(collection(db, 'invoices'), {
    clientId: c1.id,
    issueDate: serverTimestamp(),
    dueDate: serverTimestamp(),
    status: 'Unpaid',
    items: [
      { description: 'Structural works progress', amount: 150000 },
      { description: 'Site mobilization', amount: 25000 },
    ],
    total: 175000,
  });
}

async function seedAlertsAndLogs() {
  await addDoc(collection(db, 'activityLog'), {
    type: 'INFO',
    message: 'Initial seed completed.',
    link: '/dashboard',
    timestamp: serverTimestamp(),
  });
}

async function main() {
  try {
    const email = process.env.SEED_EMAIL;
    const password = process.env.SEED_PASSWORD;
    if (email && password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  console.log('Authenticated with email/password');
  // Bootstrap user doc with admin role so rules allow subsequent writes
  await ensureUser(cred.user.uid, { uid: cred.user.uid, email: cred.user.email, role: 'admin' });
    } else {
      try {
        await signInAnonymously(auth);
        console.log('Authenticated anonymously');
      } catch (e) {
        console.error('Auth failed. Provide SEED_EMAIL and SEED_PASSWORD in .env or enable Anonymous Sign-in in Firebase Auth.');
        throw e;
      }
    }

  await seedSettings();
    await seedHR();
    const links = await seedSuppliersAndProjects();
    await seedProcurementFinancials(links);
    await seedInventory();
    await seedClientsInvoices();
    await seedAlertsAndLogs();

    console.log('Seed complete.');
  } catch (e) {
    console.error('Seed failed:', e);
    process.exitCode = 1;
  }
}

main();
