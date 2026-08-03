/**
 * Syncs an issue to internal-app's Firestore apps collection.
 * Internal-app stores these nested inside app records: { id, text, status, author }
 */
export async function syncIssueToInternalApp(opts: {
  internalAppId: number;
  issueId: string;
  title: string;
  description: string;
  severity: string;
  author: string;
}): Promise<{ synced: boolean; internalIssueId?: number }> {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const apiKey = process.env.FIREBASE_API_KEY;

  if (!projectId || !apiKey) {
    console.log("[Testicon] Firestore not configured — issue sync skipped", opts.issueId);
    return { synced: false };
  }

  try {
    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/modules/apps?key=${apiKey}`;
    const getRes = await fetch(docUrl);
    if (!getRes.ok) throw new Error(`Firestore read failed: ${getRes.status}`);

    const doc = await getRes.json();
    const apps: Array<{
      id: number;
      name: string;
      tickets?: Array<{ id: number; text: string; status: string; author: string }>;
    }> = doc.fields?.data?.arrayValue?.values?.map((v: { mapValue: { fields: Record<string, { stringValue?: string; integerValue?: string; arrayValue?: unknown }> } }) => {
      const f = v.mapValue.fields;
      return {
        id: Number(f.id?.integerValue || f.id?.stringValue),
        name: f.name?.stringValue || "",
        tickets: [],
      };
    }) || [];

    const appIndex = apps.findIndex((a) => a.id === opts.internalAppId);
    if (appIndex === -1) {
      console.warn("[Testicon] Internal app not found:", opts.internalAppId);
      return { synced: false };
    }

    const internalIssueId = Date.now();
    const issueText = `[${opts.severity.toUpperCase()}] ${opts.title}\n\n${opts.description}\n\n— via Testicon (${opts.issueId})`;

    if (!apps[appIndex].tickets) apps[appIndex].tickets = [];
    apps[appIndex].tickets.push({
      id: internalIssueId,
      text: issueText,
      status: "Open",
      author: opts.author,
    });

    const patchUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/modules/apps?updateMask.fieldPaths=data&key=${apiKey}`;
    const firestoreApps = apps.map((a) => ({
      mapValue: {
        fields: {
          id: { integerValue: String(a.id) },
          name: { stringValue: a.name },
          tickets: {
            arrayValue: {
              values: (a.tickets || []).map((t) => ({
                mapValue: {
                  fields: {
                    id: { integerValue: String(t.id) },
                    text: { stringValue: t.text },
                    status: { stringValue: t.status },
                    author: { stringValue: t.author },
                  },
                },
              })),
            },
          },
        },
      },
    }));

    const patchRes = await fetch(patchUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: { data: { arrayValue: { values: firestoreApps } } },
      }),
    });

    if (!patchRes.ok) throw new Error(`Firestore write failed: ${patchRes.status}`);

    return { synced: true, internalIssueId };
  } catch (err) {
    console.error("[Testicon] Firestore sync error:", err);
    return { synced: false };
  }
}
