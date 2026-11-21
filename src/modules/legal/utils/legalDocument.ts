/**
 * The offer and the privacy policy as the server publishes them
 * (GET /api/legal/offer, /api/legal/privacy): Markdown in `body`. Pure: no
 * React Native, so it is tested on its own.
 */

export type LegalDocumentKind = "offer" | "privacy";

export interface LegalDocument {
  title: string | null;
  /** Markdown. */
  body: string;
}

/** The languages the offer is published in; the app's others read Uzbek. */
export function legalLanguage(locale: string): "uz" | "ru" {
  return locale === "ru" ? "ru" : "uz";
}

/** The document, or null when the answer carries no text to show. */
export function parseLegalDocument(input: unknown): LegalDocument | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const item = input as Record<string, unknown>;
  const body = typeof item.body === "string" ? item.body.trim() : "";
  if (!body) return null;
  const title = typeof item.title === "string" && item.title.trim() ? item.title.trim() : null;
  return { title, body };
}

export interface LegalPageColors {
  text: string;
  muted: string;
  link: string;
  border: string;
  background: string;
  surface: string;
}

/**
 * The page the document is shown in: the app's colours and type, readable at
 * phone width, tables that scroll sideways instead of overflowing.
 */
export function legalDocumentPage(html: string, colors: LegalPageColors): string {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
html,body{margin:0;padding:0;background:${colors.background};}
body{color:${colors.text};font-family:-apple-system,Roboto,"Segoe UI",sans-serif;font-size:16px;line-height:1.6;padding:4px 18px 32px;word-wrap:break-word;overflow-wrap:anywhere;-webkit-text-size-adjust:100%;}
h1{font-size:22px;line-height:1.3;margin:16px 0 8px;}
h2{font-size:19px;line-height:1.35;margin:22px 0 8px;}
h3,h4{font-size:17px;margin:18px 0 6px;}
p,ul,ol{margin:0 0 12px;}
ul,ol{padding-left:22px;}
li{margin:4px 0;}
a{color:${colors.link};}
hr{border:0;border-top:1px solid ${colors.border};margin:20px 0;}
blockquote{margin:0 0 12px;padding:8px 12px;border-left:3px solid ${colors.border};color:${colors.muted};}
table{display:block;overflow-x:auto;border-collapse:collapse;margin:0 0 14px;max-width:100%;}
th,td{border:1px solid ${colors.border};padding:6px 10px;text-align:left;vertical-align:top;}
th{background:${colors.surface};}
code{font-size:14px;}
</style></head><body>${html}</body></html>`;
}
