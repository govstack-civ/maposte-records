import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function logAuditEvent(
  citizenId: string | null,
  eventType: string,
  eventDetail?: Record<string, unknown>
) {
  await supabase.from('audit_log').insert({
    citizen_id: citizenId,
    event_type: eventType,
    event_detail: eventDetail ?? null,
  });
}
