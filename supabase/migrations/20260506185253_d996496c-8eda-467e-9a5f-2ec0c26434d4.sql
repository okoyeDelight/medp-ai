REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_hospital_admin(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_verified_provider(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.provider_hospital_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_consultation(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hospital_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_verified_provider(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_hospital_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_consultation(uuid, uuid) TO authenticated;
