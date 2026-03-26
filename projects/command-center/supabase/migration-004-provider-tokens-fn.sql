-- Secure function to get active provider tokens from auth.sessions
-- Only callable by service_role (used by cron job), not by authenticated users
CREATE OR REPLACE FUNCTION get_active_provider_tokens()
RETURNS TABLE(user_id uuid, provider_token text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT ON (user_id) user_id, provider_token::text
  FROM auth.sessions
  WHERE provider_token IS NOT NULL
  ORDER BY user_id, created_at DESC;
$$;

-- Restrict access: only service_role can call this function
REVOKE EXECUTE ON FUNCTION get_active_provider_tokens() FROM public;
REVOKE EXECUTE ON FUNCTION get_active_provider_tokens() FROM authenticated;
GRANT EXECUTE ON FUNCTION get_active_provider_tokens() TO service_role;
