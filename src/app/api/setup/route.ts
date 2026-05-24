import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CITIZEN_ID = '00000000-0000-0000-0000-000000000001';
const RECORD_ID_1 = '00000000-0000-0000-0001-000000000001';
const RECORD_ID_2 = '00000000-0000-0000-0001-000000000002';

export async function GET() {
  const results: Record<string, unknown> = {};

  // Insert citizen
  const { error: citizenError } = await supabase.from('citizens').upsert({
    id: CITIZEN_ID,
    nni: '10294857362',
    full_name: 'Awa Koné',
    phone: '+22507123456787',
    email: 'awa.kone@email.ci',
  }, { onConflict: 'nni' });
  results.citizen = citizenError ? citizenError.message : 'ok';

  // Insert academic record 1
  const { error: r1Error } = await supabase.from('academic_records').upsert({
    id: RECORD_ID_1,
    citizen_id: CITIZEN_ID,
    institution: 'Université Félix Houphouët-Boigny',
    record_type: 'degree',
    field_of_study: 'Licence en Informatique',
    year_awarded: 2023,
    mention: 'Bien',
    status: 'available',
  }, { onConflict: 'id' });
  results.record1 = r1Error ? r1Error.message : 'ok';

  // Insert academic record 2
  const { error: r2Error } = await supabase.from('academic_records').upsert({
    id: RECORD_ID_2,
    citizen_id: CITIZEN_ID,
    institution: 'DECO',
    record_type: 'baccalaureat',
    field_of_study: 'Baccalauréat Série C',
    year_awarded: 2019,
    mention: 'Assez Bien',
    status: 'available',
  }, { onConflict: 'id' });
  results.record2 = r2Error ? r2Error.message : 'ok';

  const success = Object.values(results).every((v) => v === 'ok');

  return NextResponse.json({
    success,
    results,
    message: success
      ? 'Seed data inserted successfully. NNI: 10294857362'
      : 'Some operations failed. Make sure the schema SQL has been run in Supabase.',
  });
}
