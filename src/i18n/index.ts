import es from "./es.json";
import { DEFAULT_LOCALE, type Locale } from "./config";

type Dict = typeof es;

/* --- Derives the union of valid keys from the JSON itself --- */

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : K) : never;

type Leaves<T> = T extends string
	? ""
	: {
			[K in keyof T]-?: Leaves<T[K]> extends infer R
				? R extends ""
					? K & string
					: Join<K & string, R>
				: never;
		}[keyof T];

/** Every translation key that exists. A typo is a compile error. */
export type TKey = Leaves<Dict>;

const DICTS: Record<string, Dict> = { es };
// when English ships: import en from "./en.json"; DICTS.en = en as Dict;

function leer(src: unknown, key: string): unknown {
	return key
		.split(".")
		.reduce<unknown>(
			(acc, k) =>
				acc && typeof acc === "object"
					? (acc as Record<string, unknown>)[k]
					: undefined,
			src,
		);
}

/**
 * Translator for one locale.
 *
 *   const t = useTranslations(locale);
 *   t("propiedades.habitaciones", { n: 3 })  // "3 hab."
 *
 * Unlike jrdz.dev/src/lib/i18n.ts, which returns the key and moves on, a
 * missing key THROWS in dev. That's the guardrail against shipping
 * half-translated pages once English lands: every route you visit fails
 * until the key exists.
 */
export function useTranslations(locale: Locale = DEFAULT_LOCALE) {
	const dict = DICTS[locale] ?? DICTS[DEFAULT_LOCALE];
	const fallback = DICTS[DEFAULT_LOCALE];

	return function t(key: TKey, vars?: Record<string, string | number>): string {
		const raw = leer(dict, key) ?? leer(fallback, key);

		if (typeof raw !== "string") {
			if (import.meta.env.DEV) {
				throw new Error(`[i18n] Missing key "${key}" for locale "${locale}".`);
			}
			return key;
		}

		return vars
			? raw.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`))
			: raw;
	};
}

export type Translator = ReturnType<typeof useTranslations>;
