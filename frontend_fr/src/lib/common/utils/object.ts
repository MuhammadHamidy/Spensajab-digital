// Deep clone any object (useful for immutability)
export const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));
