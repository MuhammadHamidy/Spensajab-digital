import { format } from 'date-fns';

// Format date into ISO string
export const toIsoString = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm:ssxxx");
