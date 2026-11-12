import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind sinflarini birlashtirish (shadcn/ui konvensiyasi). */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
