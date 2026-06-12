import { AuthResponse } from '../types/auth';
import { apiClient } from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  username: string;
}

export interface OAuthProvider {
  id: string;
  label: string;
  enabled: boolean;
}

export async function login(payload: LoginPayload) {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
  return data;
}

export async function register(payload: RegisterPayload) {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
  return data;
}

export async function getOAuthProviders() {
  const { data } = await apiClient.get<OAuthProvider[]>('/auth/oauth/providers');
  return data;
}

export function getOAuthLoginUrl(providerId: string) {
  const baseUrl = import.meta.env.VITE_API_URL ?? '/api';
  return `${baseUrl}/auth/oauth/${providerId}`;
}
