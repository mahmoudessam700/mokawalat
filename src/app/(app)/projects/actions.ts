
'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { analyzeProjectRisks, ProjectRiskAnalysisInput, type ProjectRiskAnalysisOutput } from '@/ai/flows/project-risk-analysis';

const projectFormSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters long.'),
  description: z.string().optional(),
  location: z.string().optional(),
  budget: z.coerce.number().positive('Budget must be a positive number.'),
  startDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Please select a valid date.',
    }),
  status: z.enum(['Planning', 'In Progress', 'Completed', 'On Hold']),
  progress: z.coerce.number().min(0).max(100).optional(),
});

const assignTeamFormSchema = z.object({
  employeeIds: z.array(z.string()).default([]),
});

const dailyLogFormSchema = z.object({
  notes: z.string().min(10, 'Log notes must be at least 10 characters long.').max(2000),
  authorId: z.string(),
  authorEmail: z.string().email(),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
export type AssignTeamFormValues = z.infer<typeof assignTeamFormSchema>;
export type DailyLogFormValues = z.infer<typeof dailyLogFormSchema>;


export interface AiAnalysisState {
    message: string | null;
    data: ProjectRiskAnalysisOutput | null;
    error: boolean;
}

export async function addProject(values: ProjectFormValues) {
  const validatedFields = projectFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided. Please check the form.',
    };
  }

  try {
    const data = {
        ...validatedFields.data,
        name_lowercase: validatedFields.data.name.toLowerCase(),
        progress: validatedFields.data.progress || 0,
        startDate: new Date(validatedFields.data.startDate),
        createdAt: serverTimestamp(),
    };
    
    const projectRef = await addDoc(collection(firestore, 'projects'), data);

    await addDoc(collection(firestore, 'activityLog'), {
        message: `New project created: ${data.name}`,
        type: "PROJECT_CREATED",
        link: `/projects/${projectRef.id}`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/projects');
    return { message: 'Project added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding project:', error);
    return {
      message: 'Failed to add project.',
      errors: { _server: ['An unexpected error occurred.'] },
    };
  }
}

export async function updateProject(projectId: string, values: ProjectFormValues) {
    if (!projectId) {
        return { message: 'Project ID is required.', errors: { _server: ['Project ID not provided.'] } };
    }

    const validatedFields = projectFormSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Invalid data provided. Please check the form.',
        };
    }

    try {
        const projectRef = doc(firestore, 'projects', projectId);
        await updateDoc(projectRef, {
            ...validatedFields.data,
            name_lowercase: validatedFields.data.name.toLowerCase(),
            progress: validatedFields.data.progress || 0,
            startDate: new Date(validatedFields.data.startDate),
        });
        revalidatePath('/projects');
        revalidatePath(`/projects/${projectId}`);
        return { message: 'Project updated successfully.', errors: null };
    } catch (error) {
        console.error('Error updating project:', error);
        return { message: 'Failed to update project.', errors: { _server: ['An unexpected error occurred.'] } };
    }
}


export async function deleteProject(projectId: string) {
  if (!projectId) {
    return { success: false, message: 'Project ID is required.' };
  }

  try {
    await deleteDoc(doc(firestore, 'projects', projectId));
    revalidatePath('/projects');
    return { success: true, message: 'Project deleted successfully.' };
  } catch (error) {
    console.error('Error deleting project:', error);
    return { success: false, message: 'Failed to delete project.' };
  }
}

export async function assignTeamToProject(projectId: string, values: AssignTeamFormValues) {
    if (!projectId) {
        return { message: 'Project ID is required.', errors: { _server: ['Project ID not provided.'] } };
    }

    const validatedFields = assignTeamFormSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Invalid data provided.',
        };
    }

    try {
        const projectRef = doc(firestore, 'projects', projectId);
        await updateDoc(projectRef, {
            teamMemberIds: validatedFields.data.employeeIds,
        });
        revalidatePath(`/projects/${projectId}`);
        return { message: 'Team updated successfully.', errors: null };
    } catch (error) {
        console.error('Error assigning team to project:', error);
        return { message: 'Failed to assign team.', errors: { _server: ['An unexpected error occurred.'] } };
    }
}

export async function getProjectRiskAnalysis(projectId: string): Promise<AiAnalysisState> {
  if (!projectId) {
    return { message: 'Project ID is required.', data: null, error: true };
  }

  try {
    const projectRef = doc(firestore, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);

    if (!projectDoc.exists()) {
      return { message: 'Project not found.', data: null, error: true };
    }

    const projectData = projectDoc.data();
    const analysisInput: ProjectRiskAnalysisInput = {
      name: projectData.name,
      description: projectData.description || 'No description provided.',
      budget: projectData.budget,
      location: projectData.location || 'Not specified.',
    };
    
    const result = await analyzeProjectRisks(analysisInput);
    
    if (result.risks) {
      return {
        message: 'Analysis generated successfully.',
        data: result,
        error: false,
      };
    } else {
       return {
        message: 'No specific risks could be identified based on the project description.',
        data: { risks: [] },
        error: false,
      };
    }
  } catch (error) {
    console.error('Error getting project risk analysis:', error);
    return {
      message: 'An unexpected AI error occurred. Please try again.',
      data: null,
      error: true,
    };
  }
}

export async function addDailyLog(projectId: string, values: DailyLogFormValues) {
  if (!projectId) {
    return { message: 'Project ID is required.', errors: { _server: ['Project ID is missing.'] } };
  }

  const validatedFields = dailyLogFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  try {
    const logData = {
      ...validatedFields.data,
      createdAt: serverTimestamp(),
    };
    await addDoc(collection(firestore, 'projects', projectId, 'dailyLogs'), logData);

    revalidatePath(`/projects/${projectId}`);
    return { message: 'Daily log added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding daily log:', error);
    return { message: 'Failed to add daily log.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}


export const materialRequestFormSchema = z.object({
  itemId: z.string().min(1, 'Please select an item.'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
});

export type MaterialRequestFormValues = z.infer<typeof materialRequestFormSchema>;

export async function addMaterialRequest(projectId: string, values: MaterialRequestFormValues) {
  if (!projectId) {
    return { message: 'Project ID is required.', errors: { _server: ['Project ID not provided.'] } };
  }

  const validatedFields = materialRequestFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }
  
  try {
    const itemRef = doc(firestore, 'inventory', validatedFields.data.itemId);
    const itemDoc = await getDoc(itemRef);

    if (!itemDoc.exists()) {
        return { message: 'Selected inventory item not found.', errors: { itemId: ['Invalid item selected.'] } };
    }
    
    const itemName = itemDoc.data().name;

    await addDoc(collection(firestore, 'materialRequests'), {
      ...validatedFields.data,
      projectId,
      itemName,
      status: 'Pending',
      requestedAt: serverTimestamp(),
    });

    await addDoc(collection(firestore, 'activityLog'), {
        message: `Material request for ${itemName} created for project`,
        type: "MATERIAL_REQUESTED",
        link: `/projects/${projectId}`,
        timestamp: serverTimestamp(),
    });


    revalidatePath(`/projects/${projectId}`);
    return { message: 'Material request submitted successfully.', errors: null };
  } catch (error) {
    console.error('Error adding material request:', error);
    return { message: 'Failed to submit material request.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function updateMaterialRequestStatus(requestId: string, newStatus: 'Approved' | 'Rejected') {
  if (!requestId) {
    return { success: false, message: 'Request ID is required.' };
  }
  
  const requestRef = doc(firestore, 'materialRequests', requestId);

  try {
    const requestSnapshot = await getDoc(requestRef);
    if (!requestSnapshot.exists()) {
      throw new Error("Request not found.");
    }
    const requestData = requestSnapshot.data();
    const projectId = requestData.projectId;

    if (newStatus === 'Approved') {
        const itemRef = doc(firestore, 'inventory', requestData.itemId);
        const itemDoc = await getDoc(itemRef);

        if (!itemDoc.exists()) {
            throw new Error("Inventory item not found.");
        }
        
        const currentQuantity = itemDoc.data().quantity;
        const newQuantity = currentQuantity - requestData.quantity;

        if (newQuantity < 0) {
            throw new Error(`Insufficient stock for ${itemDoc.data().name}. Required: ${requestData.quantity}, Available: ${currentQuantity}.`);
        }
        
        let newItemStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
        if (newQuantity <= 0) {
            newItemStatus = 'Out of Stock';
        } else if (newQuantity <= 10) {
            newItemStatus = 'Low Stock';
        } else {
            newItemStatus = 'In Stock';
        }

        await updateDoc(itemRef, { quantity: newQuantity, status: newItemStatus });
        await updateDoc(requestRef, { status: 'Approved' });

    } else { // 'Rejected'
        await updateDoc(requestRef, { status: 'Rejected' });
    }

    if (projectId) {
        revalidatePath(`/projects/${projectId}`);
    }
    revalidatePath('/material-requests');

    return { success: true, message: `Request has been ${newStatus.toLowerCase()}.` };

  } catch (error: any) {
    console.error('Error updating material request:', error);
    return { success: false, message: error.message || 'Failed to update request status.' };
  }
}
