import { supabase } from './supabaseClient.js';

const fail = (error) => { throw new Error(error.message || 'Error de base de datos'); };

export const supabaseStore = {
  kind: 'supabase',
  async list(table) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) fail(error);
    return data;
  },
  async upsert(table, row) {
    const payload = { ...row };
    if (!payload.id) delete payload.id;
    const { data, error } = await supabase.from(table).upsert(payload).select().single();
    if (error) fail(error);
    return data;
  },
  async update(table, id, patch) {
    const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single();
    if (error) fail(error);
    return data;
  },
  async remove(table, id) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) fail(error);
  },
};
