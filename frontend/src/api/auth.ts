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
export type LoginResult = 
  | { requires2FA: true; tempToken: string }
  | AuthResponse; 

export async function login(payload: LoginPayload) {
  const { data } = await apiClient.post<LoginResult>('/auth/login', payload);
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
export async function verifyTwoFactor(tempToken: string, code: string) {
  const { data } = await apiClient.post<AuthResponse>('/auth/2fa/verify', { tempToken, code });
  return data;
}

export async function setup2FA() {
  const { data } = await apiClient.post<{ qrCodeDataUrl: string, otpauthUrl: string}>('/auth/2fa/setup');
  return data;
}

export async function enable2FA(code: string) {
  await apiClient.post<void>('/auth/2fa/enable', { code });
}

export async function disable2FA(code: string) {
  await apiClient.post<void>('/auth/2fa/disable', { code });
}
