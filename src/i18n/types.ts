export type Locale = "uz" | "ru";

export const DEFAULT_LOCALE: Locale = "uz";
export const LANGUAGE_STORAGE_KEY = "language_preference_v1";

export type TranslationTree = {
  readonly [key: string]: string | TranslationTree;
};

export type TranslationSchema<T extends TranslationTree> = {
  readonly [K in keyof T]: T[K] extends TranslationTree
    ? TranslationSchema<T[K]>
    : string;
};

export type DeepKeys<T extends TranslationTree> = {
  [K in keyof T & string]: T[K] extends TranslationTree
    ? `${K}.${DeepKeys<T[K]>}`
    : K;
}[keyof T & string];

export type TranslateParams = Readonly<
  Record<string, string | number | null | undefined>
>;
