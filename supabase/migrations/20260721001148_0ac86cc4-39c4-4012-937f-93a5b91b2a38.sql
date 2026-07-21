
REVOKE EXECUTE ON FUNCTION public.request_triage(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accept_triage(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decline_triage(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.issue_followup_token(uuid, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redeem_followup_token(uuid) FROM PUBLIC;
