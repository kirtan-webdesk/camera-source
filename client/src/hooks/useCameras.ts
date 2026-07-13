import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Camera, ApiResponse } from '../types';

const CAMERAS_KEY = ['cameras'];

export const useCameras = () =>
  useQuery({
    queryKey: CAMERAS_KEY,
    queryFn: () =>
      api.get<ApiResponse<Camera[]>>('/cameras').then((r) => r.data.data ?? []),
  });

export const useCreateCamera = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Camera>) =>
      api.post<ApiResponse<Camera>>('/cameras', data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CAMERAS_KEY }),
  });
};

export const useDeleteCamera = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/cameras/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: CAMERAS_KEY }),
  });
};
