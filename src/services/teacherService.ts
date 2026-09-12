import { Teacher } from '../types';
import { apiUrl } from './apiConfig';

export interface CreateTeacherResponse {
  success: boolean;
  message: string;
  teacher?: Teacher;
  error?: string;
}

/**
 * Creates a new teacher account via the secure backend API.
 * The server cryptographically validates the caller's Firebase ID token
 * and confirms that the caller is strictly tiwarigautam819@gmail.com or rk89experiment@gmail.com.
 */
export async function createTeacherAccountOnServer(
  idToken: string,
  data: { name: string; email: string; password: string }
): Promise<CreateTeacherResponse> {
  const response = await fetch(apiUrl('/api/admin/create-teacher'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify(data),
  });

  const resJson = await response.json();

  if (!response.ok) {
    throw new Error(resJson.error || `Failed to create teacher account (${response.status})`);
  }

  return resJson;
}

/**
 * Fetches the list of created teachers from the secure server endpoint.
 */
export async function fetchTeachersList(idToken: string): Promise<Teacher[]> {
  try {
    const response = await fetch(apiUrl('/api/admin/teachers'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      const resJson = await response.json().catch(() => ({}));
      throw new Error(resJson.error || 'Failed to fetch teachers');
    }

    const data = await response.json();
    return data.teachers || [];
  } catch (err) {
    console.error('Error fetching teachers list:', err);
    return [];
  }
}

/**
 * Asks the server to verify whether the caller's ID token belongs to an authorized Admin.
 */
export async function verifyServerAdminStatus(idToken: string): Promise<boolean> {
  try {
    const response = await fetch(apiUrl('/api/admin/check-admin'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
      },
    });

    if (!response.ok) return false;
    const data = await response.json();
    return data.isAdmin === true;
  } catch {
    return false;
  }
}

