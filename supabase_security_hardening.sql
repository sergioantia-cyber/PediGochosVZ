-- =====================================================================================
-- MASTER SECURITY HARDENING SCRIPT FOR SUPABASE & POSTGRESQL (PediGochos)
-- COMPATIBILIDAD TOTAL CON TABLAS PREEXISTENTES (user_roles, establishments, orders)
-- =====================================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================================
-- PASO PREVIO OBLIGATORIO: MIGRACIÓN Y ADAPTACIÓN DE TABLA user_roles PREEXISTENTE
-- =====================================================================================

-- Si la tabla user_roles ya existe de scripts anteriores, le agregamos las columnas necesarias
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'customer',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar columnas modernas sin romper datos existentes
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer';
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS business_id TEXT;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS establishment_id TEXT;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id);

-- Si la columna email era NOT NULL de versiones viejas, la flexibilizamos para soportar login con user_id
ALTER TABLE public.user_roles ALTER COLUMN email DROP NOT NULL;

-- Sincronizar establishment_id con business_id si ya existían datos
UPDATE public.user_roles 
SET business_id = establishment_id 
WHERE business_id IS NULL AND establishment_id IS NOT NULL;

UPDATE public.user_roles 
SET establishment_id = business_id 
WHERE establishment_id IS NULL AND business_id IS NOT NULL;

-- Vincular user_id a los registros existentes que solo tenían email
UPDATE public.user_roles ur
SET user_id = u.id
FROM auth.users u
WHERE ur.user_id IS NULL 
  AND ur.email IS NOT NULL 
  AND lower(ur.email) = lower(u.email);

-- Crear índices de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_user_roles_lookup_uid ON public.user_roles(user_id, role, is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_lookup_email ON public.user_roles(email, role, is_active);

-- =====================================================================================
-- SECCIÓN 2: FUNCIONES SQL HELPER RBAC ULTRA-ROBUSTAS (SECURITY DEFINER + PATH SAFE)
-- =====================================================================================

-- 2.1 Obtener rol principal del usuario (Compatible con user_id y fallback email)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT COALESCE(
        (
            SELECT ur.role 
            FROM public.user_roles ur 
            WHERE (
                (auth.uid() IS NOT NULL AND ur.user_id = auth.uid()) OR
                (auth.jwt()->>'email' IS NOT NULL AND ur.email IS NOT NULL AND lower(ur.email) = lower(auth.jwt()->>'email'))
            )
            AND COALESCE(ur.is_active, true) = true 
            ORDER BY CASE ur.role 
                WHEN 'superadmin' THEN 1 
                WHEN 'owner' THEN 1
                WHEN 'merchant' THEN 2 
                WHEN 'courier' THEN 3 
                WHEN 'waiter' THEN 4 
                ELSE 5 END
            LIMIT 1
        ),
        'customer'
    );
$$;

-- 2.2 Validación de Superadmin / Dueño Global
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT COALESCE(
        (
            auth.uid() IS NOT NULL AND
            EXISTS (
                SELECT 1 
                FROM public.user_roles ur 
                WHERE (
                    ur.user_id = auth.uid() OR
                    (ur.email IS NOT NULL AND lower(ur.email) = lower(auth.jwt()->>'email'))
                )
                AND ur.role IN ('superadmin', 'owner')
                AND COALESCE(ur.is_active, true) = true
            )
        ),
        false
    );
$$;

-- 2.3 Validación de Comercio / Dueño del negocio específico (Acepta TEXT para slugs o UUID)
CREATE OR REPLACE FUNCTION public.is_merchant(target_business_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT COALESCE(
        (
            auth.uid() IS NOT NULL AND
            (
                public.is_superadmin() OR
                EXISTS (
                    SELECT 1 
                    FROM public.user_roles ur 
                    WHERE (
                        ur.user_id = auth.uid() OR
                        (ur.email IS NOT NULL AND lower(ur.email) = lower(auth.jwt()->>'email'))
                    )
                    AND ur.role IN ('merchant', 'owner')
                    AND (
                        ur.business_id = target_business_id 
                        OR ur.establishment_id = target_business_id
                        OR (ur.business_id IS NULL AND ur.establishment_id IS NULL) -- Administrador sin local asignado
                    )
                    AND COALESCE(ur.is_active, true) = true
                )
            )
        ),
        false
    );
$$;

-- Sobrecarga para aceptar UUID si alguna tabla usa UUID
CREATE OR REPLACE FUNCTION public.is_merchant(target_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT public.is_merchant(target_business_id::text);
$$;

-- 2.4 Validación de Repartidor (Courier)
CREATE OR REPLACE FUNCTION public.is_courier()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT COALESCE(
        (
            auth.uid() IS NOT NULL AND
            (
                public.is_superadmin() OR
                EXISTS (
                    SELECT 1 
                    FROM public.user_roles ur 
                    WHERE (
                        ur.user_id = auth.uid() OR
                        (ur.email IS NOT NULL AND lower(ur.email) = lower(auth.jwt()->>'email'))
                    )
                    AND ur.role = 'courier' 
                    AND COALESCE(ur.is_active, true) = true
                )
            )
        ),
        false
    );
$$;

-- 2.5 Validación de Mozo (Waiter)
CREATE OR REPLACE FUNCTION public.is_waiter(target_business_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT COALESCE(
        (
            auth.uid() IS NOT NULL AND
            (
                public.is_merchant(target_business_id) OR
                EXISTS (
                    SELECT 1 
                    FROM public.user_roles ur 
                    WHERE (
                        ur.user_id = auth.uid() OR
                        (ur.email IS NOT NULL AND lower(ur.email) = lower(auth.jwt()->>'email'))
                    )
                    AND ur.role = 'waiter' 
                    AND (ur.business_id = target_business_id OR ur.establishment_id = target_business_id)
                    AND COALESCE(ur.is_active, true) = true
                )
            )
        ),
        false
    );
$$;

CREATE OR REPLACE FUNCTION public.is_waiter(target_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT public.is_waiter(target_business_id::text);
$$;

-- 2.6 Trigger para Autoregistro Seguro de Nuevos Usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    -- Si ya existía un rol precargado por email, le asociamos su user_id real
    UPDATE public.user_roles
    SET user_id = NEW.id,
        is_active = true
    WHERE user_id IS NULL 
      AND email IS NOT NULL 
      AND lower(email) = lower(NEW.email);

    -- Si no tenía ningún rol previo, se registra por defecto con perfil seguro 'customer'
    IF NOT FOUND THEN
        INSERT INTO public.user_roles (user_id, email, role, is_active)
        VALUES (NEW.id, NEW.email, 'customer', true);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();
