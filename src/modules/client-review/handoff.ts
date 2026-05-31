export type ClientReviewHandoffItem = {
  id: string;
  src: string;
  label: string;
  day?: string;
  filename?: string;
  caption?: string;
  cta?: string;
  hashtags?: string[];
};

export type ClientReviewHandoffPayload = {
  version: "v1";
  source: "export-week-pack";
  packTitle: string;
  createdAt: string;
  preparedBy: string;
  items: ClientReviewHandoffItem[];
};

export const CLIENT_REVIEW_HANDOFF_KEY = "creatorops:client-review-handoff:v1";

export function writeClientReviewHandoff(payload: ClientReviewHandoffPayload) {
  sessionStorage.setItem(CLIENT_REVIEW_HANDOFF_KEY, JSON.stringify(payload));
}

export function readClientReviewHandoff(): ClientReviewHandoffPayload | null {
  try {
    const raw = sessionStorage.getItem(CLIENT_REVIEW_HANDOFF_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ClientReviewHandoffPayload;

    if (parsed?.version !== "v1") return null;
    if (parsed?.source !== "export-week-pack") return null;
    if (!Array.isArray(parsed.items)) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function clearClientReviewHandoff() {
  sessionStorage.removeItem(CLIENT_REVIEW_HANDOFF_KEY);
}
