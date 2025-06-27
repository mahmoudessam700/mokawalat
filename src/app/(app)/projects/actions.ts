
'use server';
/**
 * @fileoverview Server actions for the Projects module.
 * This file contains the business logic for creating, updating, and deleting projects,
 * managing tasks, team assignments, documents, and daily logs. It also interfaces
 * with AI flows for risk analysis and log summarization.
 */

import { firestore, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, getDoc, setDoc, runTransaction, getDocs, writeBatch } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { analyzeProjectRisks, type ProjectRiskAnalysisOutput } from '@/ai/flows/project-risk-analysis';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { summarizeDailyLogs } from '@/ai/flows/summarize-daily-logs';
import { suggestProjectTasks } from '@/ai/flows/suggest-project-tasks';

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
  clientId: z.string().optional(),
});

const assignTeamFormSchema = z.object({
  employeeIds: z.array(z.string()).default([]),
});

const dailyLogFormSchema = z.object({
  notes: z.string().min(10, 'Log notes must be at least 10 characters long.').max(2000),
});

const taskFormSchema = z.object({
  name: z.string().min(3, "Task name must be at least 3 characters long."),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
export type AssignTeamFormValues = z.infer<typeof assignTeamFormSchema>;
export type DailyLogFormValues = z.infer<typeof dailyLogFormSchema>;
export type TaskFormValues = z.infer<typeof taskFormSchema>;


export interface AiAnalysisState {
    message: string | null;
    data: ProjectRiskAnalysisOutput | null;
    error: boolean;
}

/**
 * Recalculates and updates a project's progress percentage based on completed tasks.
 * @param {string} projectId - The ID of the project to update.
 */
async function recalculateProjectProgress(projectId: string) {
  const tasksRef = collection(firestore, 'projects', projectId, 'tasks');
  const tasksSnapshot = await getDocs(tasksRef);
  
  if (tasksSnapshot.empty) {
    const projectRef = doc(firestore, 'projects', projectId);
    await updateDoc(projectRef, { progress: 0 });
    return;
  }
  
  const totalTasks = tasksSnapshot.size;
  const completedTasks = tasksSnapshot.docs.filter(doc => doc.data().status === 'Done').length;
  
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const projectRef = doc(firestore, 'projects', projectId);
  await updateDoc(projectRef, { progress });
}

/**
 * Adds a new project to Firestore.
 * @param {ProjectFormValues} values - The project data from the form.
 * @returns {Promise<{message: string, errors: object|null}>} An object with a success or error message.
 */
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
        progress: 0, // Progress starts at 0
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

/**
 * Updates an existing project in Firestore.
 * @param {string} projectId - The ID of the project to update.
 * @param {ProjectFormValues} values - The new project data.
 * @returns {Promise<{message: string, errors: object|null}>} An object with a success or error message.
 */
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
            startDate: new Date(validatedFields.data.startDate),
        });

        await addDoc(collection(firestore, 'activityLog'), {
            message: `Project details updated for: ${validatedFields.data.name}`,
            type: "PROJECT_UPDATED",
            link: `/projects/${projectId}`,
            timestamp: serverTimestamp(),
        });

        revalidatePath('/projects');
        revalidatePath(`/projects/${projectId}`);
        return { message: 'Project updated successfully.', errors: null };
    } catch (error) {
        console.error('Error updating project:', error);
        return { message: 'Failed to update project.', errors: { _server: ['An unexpected error occurred.'] } };
    }
}


/**
 * Deletes a project from Firestore. Note: This does not delete sub-collections like tasks or documents.
 * @param {string} projectId - The ID of the project to delete.
 * @returns {Promise<{success: boolean, message: string}>} An object indicating success or failure.
 */
export async function deleteProject(projectId: string) {
  if (!projectId) {
    return { success: false, message: 'Project ID is required.' };
  }

  try {
    const projectRef = doc(firestore, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists()) {
        return { success: false, message: 'Project not found.' };
    }
    const projectName = projectSnap.data().name;

    await deleteDoc(projectRef);

    await addDoc(collection(firestore, 'activityLog'), {
        message: `Project deleted: ${projectName}`,
        type: "PROJECT_DELETED",
        link: `/projects`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/projects');
    return { success: true, message: 'Project deleted successfully.' };
  } catch (error) {
    console.error('Error deleting project:', error);
    return { success: false, message: 'Failed to delete project.' };
  }
}

/**
 * Assigns or updates the team members for a project.
 * @param {string} projectId - The ID of the project.
 * @param {AssignTeamFormValues} values - An object containing an array of employee IDs.
 * @returns {Promise<{message: string, errors: object|null}>} An object with a success or error message.
 */
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

        const projectSnap = await getDoc(projectRef);
        const projectName = projectSnap.exists() ? projectSnap.data().name : 'Unknown Project';

        await addDoc(collection(firestore, 'activityLog'), {
            message: `Team updated for project: ${projectName}`,
            type: "TEAM_ASSIGNED_TO_PROJECT",
            link: `/projects/${projectId}`,
            timestamp: serverTimestamp(),
        });
        
        revalidatePath(`/projects/${projectId}`);
        return { message: 'Team updated successfully.', errors: null };
    } catch (error) {
        console.error('Error assigning team to project:', error);
        return { message: 'Failed to assign team.', errors: { _server: ['An unexpected error occurred.'] } };
    }
}

/**
 * Fetches project data and runs it through an AI flow to analyze potential risks.
 * @param {string} projectId - The ID of the project to analyze.
 * @returns {Promise<AiAnalysisState>} The state object containing the analysis data or an error.
 */
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
    const analysisInput = {
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

/**
 * Adds a new daily log entry to a project, optionally with a photo.
 * @param {string} projectId - The ID of the project.
 * @param {{uid: string, email: string}} author - The user creating the log.
 * @param {FormData} formData - The form data containing the notes and optional photo.
 * @returns {Promise<{message: string, errors: object|null}>} An object with a success or error message.
 */
export async function addDailyLog(projectId: string, author: { uid: string, email: string }, formData: FormData) {
    if (!projectId) {
        return { message: 'Project ID is required.', errors: { _server: ['Project ID is missing.'] } };
    }
    if (!author?.uid || !author.email) {
        return { message: 'Author information is missing.', errors: { _server: ['Authentication error.'] } };
    }

    const formValues = {
        notes: formData.get('notes'),
    };
    const validatedFields = dailyLogFormSchema.safeParse(formValues);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Invalid data provided.',
        };
    }

    const photo = formData.get('photo') as File | null;
    
    if (photo && photo.size > 5 * 1024 * 1024) { // 5MB limit
      return { message: 'File is too large.', errors: { photo: ['Photo must be less than 5MB.'] } };
    }
    if (photo && photo.size > 0 && !['image/jpeg', 'image/png', 'image/webp'].includes(photo.type)) {
      return { message: 'Invalid file type.', errors: { photo: ['Please upload a JPG, PNG, or WEBP image.'] } };
    }

    try {
        const newLogRef = doc(collection(firestore, 'projects', projectId, 'dailyLogs'));
        let photoUrl = '';
        let photoPath = '';

        if (photo && photo.size > 0) {
            photoPath = `projects/${projectId}/dailyLogs/${newLogRef.id}/${photo.name}`;
            const storageRef = ref(storage, photoPath);
            await uploadBytes(storageRef, photo);
            photoUrl = await getDownloadURL(storageRef);
        }

        const logData = {
            notes: validatedFields.data.notes,
            authorId: author.uid,
            authorEmail: author.email,
            createdAt: serverTimestamp(),
            photoUrl,
            photoPath,
        };
        
        await setDoc(newLogRef, logData);

        revalidatePath(`/projects/${projectId}`);
        return { message: 'Daily log added successfully.', errors: null };
    } catch (error) {
        console.error('Error adding daily log:', error);
        return { message: 'Failed to add daily log.', errors: { _server: ['An unexpected error occurred.'] } };
    }
}


export interface AiLogSummaryState {
    message: string | null;
    data: { summary: string } | null;
    error: boolean;
}

/**
 * Generates an AI-powered summary of a project's daily logs.
 * @param {string} projectId - The ID of the project to summarize.
 * @returns {Promise<AiLogSummaryState>} The state object containing the summary data or an error.
 */
export async function getDailyLogSummary(projectId: string): Promise<AiLogSummaryState> {
  if (!projectId) {
    return { message: 'Project ID is required.', data: null, error: true };
  }

  try {
    const result = await summarizeDailyLogs({ projectId });
    
    if (result.summary) {
      return {
        message: 'Summary generated successfully.',
        data: result,
        error: false,
      };
    } else {
       return {
        message: 'AI could not generate a summary from the logs.',
        data: null,
        error: true,
      };
    }
  } catch (error) {
    console.error('Error getting daily log summary:', error);
    return {
      message: 'An unexpected AI error occurred. Please try again.',
      data: null,
      error: true,
    };
  }
}

const documentFormSchema = z.object({
  title: z.string().min(3, 'Document title must be at least 3 characters long.'),
});

export type DocumentFormValues = z.infer<typeof documentFormSchema>;

/**
 * Uploads a document and attaches it to a project.
 * @param {string} projectId - The ID of the project.
 * @param {FormData} formData - The form data containing the title and file.
 * @returns {Promise<{message: string, errors: object|null}>} An object with a success or error message.
 */
export async function addProjectDocument(projectId: string, formData: FormData) {
  if (!projectId) {
    return { message: 'Project ID is required.', errors: { _server: ['Project ID is missing.'] } };
  }

  const formValues = {
      title: formData.get('title'),
  }

  const validatedFields = documentFormSchema.safeParse(formValues);
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors, message: 'Invalid data provided.' };
  }
  
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) {
      return { message: 'A document file is required.', errors: { file: ['Please select a file to upload.'] } };
  }

  try {
    const newDocRef = doc(collection(firestore, 'projects', projectId, 'documents'));
    const filePath = `projects/${projectId}/documents/${newDocRef.id}/${file.name}`;
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, file);
    const fileUrl = await getDownloadURL(storageRef);
    
    const documentData = {
      ...validatedFields.data,
      fileUrl,
      filePath,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      createdAt: serverTimestamp(),
    };
    
    await setDoc(newDocRef, documentData);

    const projectSnap = await getDoc(doc(firestore, 'projects', projectId));
    const projectName = projectSnap.exists() ? projectSnap.data().name : 'Unknown Project';

    await addDoc(collection(firestore, 'activityLog'), {
        message: `Document "${validatedFields.data.title}" added to project: ${projectName}`,
        type: "DOCUMENT_UPLOADED",
        link: `/projects/${projectId}`,
        timestamp: serverTimestamp(),
    });

    revalidatePath(`/projects/${projectId}`);
    return { message: 'Document added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding project document:', error);
    return { message: 'Failed to add document.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

/**
 * Deletes a project document from Firestore and Firebase Storage.
 * @param {string} projectId - The ID of the project.
 * @param {string} documentId - The ID of the document to delete.
 * @returns {Promise<{success: boolean, message: string}>} An object indicating success or failure.
 */
export async function deleteProjectDocument(projectId: string, documentId: string) {
  if (!projectId || !documentId) {
    return { success: false, message: 'Project and Document ID are required.' };
  }

  try {
    const docRef = doc(firestore, 'projects', projectId, 'documents', documentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const docData = docSnap.data();
        if (docData.filePath) {
            const fileRef = ref(storage, docData.filePath);
            await deleteObject(fileRef).catch(err => {
                // Log error but don't block deletion of firestore doc
                console.error("Failed to delete document file from storage:", err);
            });
        }
        
        const projectSnap = await getDoc(doc(firestore, 'projects', projectId));
        const projectName = projectSnap.exists() ? projectSnap.data().name : 'Unknown Project';

        await addDoc(collection(firestore, 'activityLog'), {
            message: `Document "${docData.title}" deleted from project: ${projectName}`,
            type: "DOCUMENT_DELETED",
            link: `/projects/${projectId}`,
            timestamp: serverTimestamp(),
        });
    }

    await deleteDoc(docRef);
    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: 'Document deleted successfully.' };
  } catch (error) {
    console.error('Error deleting document:', error);
    return { success: false, message: 'Failed to delete document.' };
  }
}

/**
 * Adds a new task to a project's sub-collection.
 * @param {string} projectId - The ID of the project.
 * @param {TaskFormValues} values - The task data from the form.
 * @returns {Promise<{message: string, errors: object|null}>} An object with a success or error message.
 */
export async function addTask(projectId: string, values: TaskFormValues) {
    if (!projectId) {
        return { message: 'Project ID is required.', errors: { _server: ['Project ID not provided.'] } };
    }

    const validatedFields = taskFormSchema.safeParse(values);
    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors, message: 'Invalid data provided.' };
    }

    try {
        const { assignedTo, ...taskData } = validatedFields.data;
        let assignedToName = '';

        if (assignedTo) {
            const employeeDoc = await getDoc(doc(firestore, 'employees', assignedTo));
            if (employeeDoc.exists()) {
                assignedToName = employeeDoc.data().name;
            }
        }

        await addDoc(collection(firestore, 'projects', projectId, 'tasks'), {
            ...taskData,
            assignedTo: assignedTo || null,
            assignedToName: assignedToName || '',
            dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
            status: 'To Do',
            createdAt: serverTimestamp(),
        });

        const projectSnap = await getDoc(doc(firestore, 'projects', projectId));
        const projectName = projectSnap.exists() ? projectSnap.data().name : 'Unknown Project';
        await addDoc(collection(firestore, 'activityLog'), {
            message: `Task "${validatedFields.data.name}" added to project: ${projectName}`,
            type: "TASK_ADDED",
            link: `/projects/${projectId}`,
            timestamp: serverTimestamp(),
        });

        await recalculateProjectProgress(projectId);
        revalidatePath(`/projects/${projectId}`);
        return { message: 'Task added successfully.', errors: null };
    } catch (error) {
        console.error('Error adding task:', error);
        return { message: 'Failed to add task.', errors: { _server: ['An unexpected error occurred.'] } };
    }
}

/**
 * Updates an existing task in a project's sub-collection.
 * @param {string} projectId - The ID of the project.
 * @param {string} taskId - The ID of the task to update.
 * @param {TaskFormValues} values - The new task data.
 * @returns {Promise<{message: string, errors: object|null}>} An object with a success or error message.
 */
export async function updateTask(projectId: string, taskId: string, values: TaskFormValues) {
  if (!projectId || !taskId) {
    return { message: 'Project and Task ID are required.', errors: { _server: ['IDs not provided.'] } };
  }

  const validatedFields = taskFormSchema.safeParse(values);
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors, message: 'Invalid data provided.' };
  }

  try {
    const { assignedTo, ...taskData } = validatedFields.data;
    let assignedToName = '';

    if (assignedTo) {
      const employeeDoc = await getDoc(doc(firestore, 'employees', assignedTo));
      if (employeeDoc.exists()) {
        assignedToName = employeeDoc.data().name;
      }
    }

    const taskRef = doc(firestore, 'projects', projectId, 'tasks', taskId);
    await updateDoc(taskRef, {
      ...taskData,
      assignedTo: assignedTo || null,
      assignedToName: assignedToName || '',
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
    });
    
    revalidatePath(`/projects/${projectId}`);
    return { message: 'Task updated successfully.', errors: null };
  } catch (error) {
    console.error('Error updating task:', error);
    return { message: 'Failed to update task.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}


/**
 * Updates the status of a project task.
 * @param {string} projectId - The ID of the project.
 * @param {string} taskId - The ID of the task to update.
 * @param {'To Do' | 'In Progress' | 'Done'} status - The new status for the task.
 * @returns {Promise<{success: boolean, message: string}>} An object indicating success or failure.
 */
export async function updateTaskStatus(projectId: string, taskId: string, status: 'To Do' | 'In Progress' | 'Done') {
    if (!projectId || !taskId) {
        return { success: false, message: 'Project and Task ID are required.' };
    }

    try {
        const taskRef = doc(firestore, 'projects', projectId, 'tasks', taskId);
        await updateDoc(taskRef, { status });
        
        const taskSnap = await getDoc(taskRef);
        const taskName = taskSnap.data()?.name || 'Unknown Task';
    
        await addDoc(collection(firestore, 'activityLog'), {
            message: `Task "${taskName}" status changed to ${status}`,
            type: "TASK_STATUS_CHANGED",
            link: `/projects/${projectId}`,
            timestamp: serverTimestamp(),
        });

        await recalculateProjectProgress(projectId);
        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: 'Task status updated.' };
    } catch (error) {
        console.error('Error updating task status:', error);
        return { success: false, message: 'Failed to update task status.' };
    }
}

/**
 * Deletes a task from a project.
 * @param {string} projectId - The ID of the project.
 * @param {string} taskId - The ID of the task to delete.
 * @returns {Promise<{success: boolean, message: string}>} An object indicating success or failure.
 */
export async function deleteTask(projectId: string, taskId: string) {
    if (!projectId || !taskId) {
        return { success: false, message: 'Project and Task ID are required.' };
    }

    try {
        const taskRef = doc(firestore, 'projects', projectId, 'tasks', taskId);
        const taskSnap = await getDoc(taskRef);

        if (taskSnap.exists()) {
            const taskName = taskSnap.data().name;
            await addDoc(collection(firestore, 'activityLog'), {
                message: `Task deleted: "${taskName}"`,
                type: "TASK_DELETED",
                link: `/projects/${projectId}`,
                timestamp: serverTimestamp(),
            });
        }

        await deleteDoc(taskRef);
        await recalculateProjectProgress(projectId);
        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: 'Task deleted successfully.' };
    } catch (error) {
        console.error('Error deleting task:', error);
        return { success: false, message: 'Failed to delete task.' };
    }
}


/**
 * Generates a list of tasks for a project using AI and adds them to Firestore.
 * @param {string} projectId - The ID of the project.
 * @returns {Promise<{success: boolean, message: string}>} An object indicating success or failure.
 */
export async function suggestTasksForProject(projectId: string) {
    if (!projectId) {
        return { success: false, message: 'Project ID is required.' };
    }

    try {
        const projectRef = doc(firestore, 'projects', projectId);
        const projectDoc = await getDoc(projectRef);

        if (!projectDoc.exists()) {
            return { success: false, message: 'Project not found.' };
        }

        const projectData = projectDoc.data();
        const result = await suggestProjectTasks({
            projectName: projectData.name,
            projectDescription: projectData.description || 'No description provided.',
        });

        if (!result.tasks || result.tasks.length === 0) {
            return { success: false, message: 'AI could not suggest any tasks for this project.' };
        }

        const batch = writeBatch(firestore);
        const tasksRef = collection(firestore, 'projects', projectId, 'tasks');
        
        result.tasks.forEach(task => {
            const newTaskRef = doc(tasksRef);
            batch.set(newTaskRef, {
                name: task.name,
                status: 'To Do',
                createdAt: serverTimestamp(),
                dueDate: null,
            });
        });

        await batch.commit();
        await recalculateProjectProgress(projectId);

        await addDoc(collection(firestore, 'activityLog'), {
            message: `AI suggested ${result.tasks.length} tasks for project: ${projectData.name}`,
            type: "AI_TASKS_SUGGESTED",
            link: `/projects/${projectId}`,
            timestamp: serverTimestamp(),
        });
        
        revalidatePath(`/projects/${projectId}`);
        
        return { success: true, message: `${result.tasks.length} tasks suggested and added.` };
    } catch (error) {
        console.error('Error suggesting tasks:', error);
        return { success: false, message: 'An unexpected AI error occurred while suggesting tasks.' };
    }
}
