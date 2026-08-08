import { useAuth } from "./useAuth";

// Returns the authenticated user's ID. Null while loading or signed out.
export const useUserId = (): string | null => {
  const { user } = useAuth();
  return user?.id ?? null;
};
