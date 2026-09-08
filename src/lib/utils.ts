import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merges classes, resolving Tailwind conflicts. Used by shadcn-svelte's components. */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/* --- Helper types shadcn-svelte's components expect --- */

export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
	ref?: U | null;
};

export type WithoutChild<T> = T extends { child?: unknown } ? Omit<T, "child"> : T;

export type WithoutChildren<T> = T extends { children?: unknown }
	? Omit<T, "children">
	: T;

export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
