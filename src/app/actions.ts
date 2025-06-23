
'use server';

import { firestore } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, or, and } from 'firebase/firestore';

export interface SearchResult {
    name: string;
    type: 'Project' | 'Client' | 'Employee' | 'Supplier' | 'Inventory Item' | 'Asset' | 'Invoice';
    url: string;
    context?: string;
}

export async function globalSearch(searchTerm: string): Promise<SearchResult[]> {
    if (!searchTerm || searchTerm.trim().length < 2) {
        return [];
    }

    const term = searchTerm.toLowerCase();
    const results: SearchResult[] = [];
    const searchLimit = 5;

    // Helper to add results and avoid duplicates by URL
    const addedUrls = new Set<string>();
    const addResult = (result: SearchResult) => {
        if (!addedUrls.has(result.url)) {
            results.push(result);
            addedUrls.add(result.url);
        }
    };

    // By searching on a pre-populated lowercase field, we can achieve case-insensitive "starts-with" search.
    const searchQuery = (collectionName: string, searchField: string) => 
        query(
            collection(firestore, collectionName),
            where(searchField, '>=', term),
            where(searchField, '<=', term + '\uf8ff'),
            limit(searchLimit)
        );

    // Projects
    const projectsSnapshot = await getDocs(searchQuery('projects', 'name_lowercase'));
    projectsSnapshot.forEach(doc => {
        const data = doc.data();
        addResult({ name: data.name, type: 'Project', url: `/projects/${doc.id}`, context: data.status });
    });

    // Clients
    const clientsSnapshot = await getDocs(searchQuery('clients', 'name_lowercase'));
    clientsSnapshot.forEach(doc => {
        const data = doc.data();
        addResult({ name: data.name, type: 'Client', url: `/clients/${doc.id}`, context: data.email });
    });
    
    // Employees
    const employeesSnapshot = await getDocs(searchQuery('employees', 'name_lowercase'));
    employeesSnapshot.forEach(doc => {
        const data = doc.data();
        addResult({ name: data.name, type: 'Employee', url: `/employees/${doc.id}`, context: data.role });
    });
    
    // Suppliers
    const suppliersSnapshot = await getDocs(searchQuery('suppliers', 'name_lowercase'));
    suppliersSnapshot.forEach(doc => {
        const data = doc.data();
        addResult({ name: data.name, type: 'Supplier', url: `/suppliers/${doc.id}`, context: data.contactPerson });
    });
    
    // Inventory
    const inventorySnapshot = await getDocs(searchQuery('inventory', 'name_lowercase'));
    inventorySnapshot.forEach(doc => {
        const data = doc.data();
        addResult({ name: data.name, type: 'Inventory Item', url: `/inventory`, context: `Qty: ${data.quantity}` });
    });

    // Assets
    const assetsSnapshot = await getDocs(searchQuery('assets', 'name_lowercase'));
    assetsSnapshot.forEach(doc => {
        const data = doc.data();
        addResult({ name: data.name, type: 'Asset', url: `/assets/${doc.id}`, context: data.category });
    });
    
    // Invoices
    const invoicesSnapshot = await getDocs(searchQuery('invoices', 'invoiceNumber_lowercase'));
    invoicesSnapshot.forEach(doc => {
        const data = doc.data();
        addResult({ name: data.invoiceNumber, type: 'Invoice', url: `/invoices/${doc.id}`, context: `Status: ${data.status}` });
    });
    
    // Note: If you see permission errors in the browser console, you may need to create new indexes in Firebase
    // for the 'name_lowercase' fields. The error message will typically provide a direct link to do so.
    
    return results.slice(0, 10); // Return a max of 10 results overall
}
