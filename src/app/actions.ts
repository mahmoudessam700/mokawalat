'use server';

import { firestore } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, or, and } from 'firebase/firestore';

export interface SearchResult {
    name: string;
    type: 'Project' | 'Client' | 'Employee' | 'Supplier' | 'Inventory Item';
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

    // Firestore doesn't support case-insensitive or partial text search natively.
    // The standard workaround is to search for a range, which acts as a "starts-with" search.
    // This is case-sensitive. A more robust solution would involve a third-party search service 
    // or storing lowercase fields for searching, but that is beyond the scope of this implementation.
    const searchQuery = (collectionName: string, searchField: string, contextField?: string) => 
        query(
            collection(firestore, collectionName),
            where(searchField, '>=', searchTerm),
            where(searchField, '<=', searchTerm + '\uf8ff'),
            limit(searchLimit)
        );

    // Projects
    const projectsSnapshot = await getDocs(searchQuery('projects', 'name'));
    projectsSnapshot.forEach(doc => {
        const data = doc.data();
        addResult({ name: data.name, type: 'Project', url: `/projects/${doc.id}`, context: data.status });
    });

    // Clients
    const clientsSnapshot = await getDocs(searchQuery('clients', 'name'));
    clientsSnapshot.forEach(doc => {
        const data = doc.data();
        addResult({ name: data.name, type: 'Client', url: `/clients/${doc.id}`, context: data.email });
    });
    
    // Employees
    const employeesSnapshot = await getDocs(searchQuery('employees', 'name'));
    employeesSnapshot.forEach(doc => {
        const data = doc.data();
        addResult({ name: data.name, type: 'Employee', url: `/employees/${doc.id}`, context: data.role });
    });
    
    // Suppliers
    const suppliersSnapshot = await getDocs(searchQuery('suppliers', 'name'));
    suppliersSnapshot.forEach(doc => {
        const data = doc.data();
        addResult({ name: data.name, type: 'Supplier', url: `/suppliers/${doc.id}`, context: data.contactPerson });
    });
    
    // Inventory
    const inventorySnapshot = await getDocs(searchQuery('inventory', 'name'));
    inventorySnapshot.forEach(doc => {
        const data = doc.data();
        addResult({ name: data.name, type: 'Inventory Item', url: `/inventory`, context: `Qty: ${data.quantity}` });
    });
    
    // Note: If you see permission errors in the browser console, you may need to create indexes in Firebase.
    // The error message will typically provide a direct link to create the required index.
    
    return results.slice(0, 10); // Return a max of 10 results overall
}
