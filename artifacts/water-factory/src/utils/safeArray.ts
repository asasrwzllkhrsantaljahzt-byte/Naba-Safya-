export const safeArray = <T,>(data: any): T[] => {
  return Array.isArray(data) ? data : [];
};