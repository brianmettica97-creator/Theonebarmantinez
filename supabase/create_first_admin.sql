-- PRIMER ADMINISTRADOR (ejecutar manualmente en el SQL Editor de Supabase; nunca desde el frontend)
-- 1) Authentication > Users > "Add user" (email + contraseña fuerte, "Auto Confirm User").
--    En Authentication > Providers > Email desactivar "Allow new users to sign up" (no hay registro público).
-- 2) Reemplazar el email y ejecutar:
insert into public.profiles (id, full_name, role)
select id, 'Administrador', 'admin' from auth.users where email = 'REEMPLAZAR@EMAIL.COM'
on conflict (id) do update set role = 'admin';
