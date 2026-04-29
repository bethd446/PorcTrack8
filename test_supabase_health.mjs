import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '/root/PorcTrack8/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkHealth() {
    const { count, error: countError } = await supabase
        .from('health_logs')
        .select('*', { count: 'exact', head: true });
    
    const { error: notesError } = await supabase.from('notes').select('id').limit(1);

    if (countError) console.error("Erreur health_logs count:", countError);
    else console.log("Success: Count health_logs =", count);
    
    if (notesError) console.error("Erreur notes table:", notesError);
    else console.log("Success: Table notes accessible.");
}

checkHealth();
