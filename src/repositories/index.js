import { BACKEND } from '../config/env.js';
import { createRepo } from './createRepo.js';
import { localStore } from './localStore.js';
import { supabaseStore } from './supabaseStore.js';
import { supabase } from './supabaseClient.js';

export const repo = BACKEND === 'supabase' ? createRepo(supabaseStore, supabase) : createRepo(localStore);
export { localStore };
