export const HEADER = ['EventID', 'ActivityID', 'OwnerID', 'Revision', 'Action', 'ChunkIndex', 'ChunkCount', 'Payload', 'UpdatedAt'];
export function sameHeader(row: unknown[]) { return HEADER.every((v, i) => row[i] === v); }
export function eventRows(owner: string, id: string, revision: number, action: string, payload: unknown) {
  const json = JSON.stringify(payload); const chunks = json.match(/[\s\S]{1,35000}/g) || ['null']; const eventId = crypto.randomUUID(); const time = new Date().toISOString();
  return chunks.map((chunk, i) => [eventId, id, owner, revision, action, i, chunks.length, chunk, time]);
}
export function readEvents(rows: unknown[][], owner: string) {
  const grouped = new Map<string, unknown[][]>();
  for (const row of rows.slice(1)) if (row[2] === owner && row[0]) { const key = String(row[0]); grouped.set(key, [...(grouped.get(key) || []), row]); }
  const latest = new Map<string, { revision: number; action: string; payload: any; eventId: string }>();
  const versions = new Set<string>();
  for (const [eventId, chunks] of grouped) {
    chunks.sort((a, b) => Number(a[5]) - Number(b[5])); const first = chunks[0];
    if (chunks.length !== Number(first[6])) throw new Error('Incomplete meeting data; contact administrator.');
    const id = String(first[1]), revision = Number(first[3]); const versionKey = `${id}:${revision}`;
    if (versions.has(versionKey)) throw new Error('CONFLICT: simultaneous changes detected; contact administrator to reconcile versions.');
    versions.add(versionKey);
    const payload = JSON.parse(chunks.map(r => String(r[7])).join(''));
    if (!latest.has(id) || revision > (latest.get(id)?.revision || 0)) latest.set(id, { revision, action: String(first[4]), payload, eventId });
  }
  return latest;
}
