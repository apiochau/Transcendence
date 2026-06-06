import { apiClient } from "./client";
import { AuthUser } from "../types/auth";

export interface PublicProfile {
    id: string;
    username: string;
    email:string;
    displayName: string | null;
    avatarUrl: string | null;
    createdAt: string;
    collectionValue: number;
    stats: {
        gamesPlayed: number;
        wins: number;
        losses: number;
    } | null;
}

export function getMyProfile() {
    return apiClient.get<PublicProfile>('/users/me').then((r) => r.data);
}

export function updateMyProfile(data: { displayName?: string}) {
    return apiClient.patch<AuthUser>('/users/me', data).then((r) => r.data);
}

export function getUserProfile(id: string) {
    return apiClient.get<PublicProfile>(`/users/${id}`).then((r) => r.data);
}

export function uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);

    return apiClient.post<AuthUser>('/users/me/avatar', formData, {headers: { 'Content-Type': 'multipart/form-data' }, }).then((r) => r.data);
}
