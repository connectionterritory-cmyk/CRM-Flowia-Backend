const { createClient } = require('@supabase/supabase-js');

const getSupabaseEnv = () => {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
        const error = new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        error.code = 'SUPABASE_ENV_MISSING';
        throw error;
    }

    return { url, serviceRoleKey };
};

let supabaseClient = null;

const getSupabaseClient = () => {
    if (!supabaseClient) {
        const { url, serviceRoleKey } = getSupabaseEnv();
        supabaseClient = createClient(url, serviceRoleKey, {
            auth: { persistSession: false },
        });
    }

    return supabaseClient;
};

const normalizeSupabaseError = (error) => {
    if (!error) return null;
    if (error.code === 'SUPABASE_ENV_MISSING') return error;

    const normalized = new Error(error.message || 'Supabase error');
    normalized.code = error.code || 'SUPABASE_ERROR';
    normalized.details = error.details;
    normalized.hint = error.hint;
    normalized.status = error.status;
    return normalized;
};

const getUsuarioByCodigo = async (codigo) => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('usuarios')
        .select('codigo,password_hash,is_active,rol')
        .eq('codigo', codigo)
        .maybeSingle();

    if (error) {
        throw normalizeSupabaseError(error);
    }

    return data;
};

module.exports = {
    getSupabaseClient,
    getUsuarioByCodigo,
};
