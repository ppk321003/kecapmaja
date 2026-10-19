import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Meeting, Person } from './model';
export async function meetingRequest<T>(body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke('meeting-sheets', { body });
  if (error) {
    if (error instanceof FunctionsHttpError) { const text = await error.context.text(); let parsed: { error?: string } = {}; try { parsed = JSON.parse(text); } catch { /* non-JSON response */ } throw new Error(parsed.error || text || error.message); }
    throw error;
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}
export interface MeetingList { meetings: Meeting[]; people: Person[]; masterRevision: number; }
