
'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, getDoc, runTransaction } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { analyzeProjectRisks, ProjectRiskAnalysisInput, ProjectRiskAnalysisOutput } from '@/ai/flows/project-risk-analysis';

const projectFormSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters long.'),
  description: z.string().optional(),
  budget: z.coerce.number().positive('Budget must be a positive number.'),
  startDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Please select a valid date.',
    }),
  status: z.enum(['Planning', 'In Progress', 'Completed', 'On Hold']),
});

const assignTeamFormSchema = z.object({
  employeeIds: z.array(z.string()).default([]),
});

const materialRequestFormSchema = z.object({
  itemId: z.string().min(1, 'Please select an item.'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
export type AssignTeamFormValues = z.infer<typeof assignTeamFormSchema>;
export type MaterialRequestFormValues = z.infer<typeof materialRequestFormSchema>;
export type ProjectRiskAnalysisOutput = z.infer<typeof ProjectRiskAnalysisOutput>;

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
    const { name, description, budget, startDate, status } =
      validatedFields.data;
    const projectRef = await addDoc(collection(firestore, 'projects'), {
      name,
      description: description || '',
      budget,
      startDate: new Date(startDate),
      status,
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(firestore, 'activityLog'), {
        message: `New project created: ${name}`,
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
    if (newStatus === 'Approved') {
        await runTransaction(firestore, async (transaction) => {
            const requestDoc = await transaction.get(requestRef);
            if (!requestDoc.exists()) {
                throw new Error("Request not found.");
            }
            const requestData = requestDoc.data();
            const itemRef = doc(firestore, 'inventory', requestData.itemId);
            const itemDoc = await transaction.get(itemRef);

            if (!itemDoc.exists()) {
                throw new Error("Inventory item not found.");
            }
            
            const currentQuantity = itemDoc.data().quantity;
            const newQuantity = currentQuantity - requestData.quantity;

            if (newQuantity < 0) {
                throw new Error("Insufficient stock to approve this request.");
            }
            
            let newItemStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
            if (newQuantity <= 0) {
                newItemStatus = 'Out of Stock';
            } else if (newQuantity <= 10) {
                newItemStatus = 'Low Stock';
            } else {
                newItemStatus = 'In Stock';
            }

            transaction.update(itemRef, { quantity: newQuantity, status: newItemStatus });
            transaction.update(requestRef, { status: 'Approved' });
        });
    } else {
        await updateDoc(requestRef, { status: 'Rejected' });
    }

    const requestSnapshot = await getDoc(requestRef);
    const projectId = requestSnapshot.data()?.projectId;
    if (projectId) {
        revalidatePath(`/projects/${projectId}`);
    }

    return { success: true, message: `Request has been ${newStatus.toLowerCase()}.` };

  } catch (error: any) {
    console.error('Error updating material request:', error);
    return { success: false, message: error.message || 'Failed to update request status.' };
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
    };
    
    const result = await analyzeProjectRisks(analysisInput);
    
    if (result.risks && result.risks.length > 0) {
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
