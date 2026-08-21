# Defer application authentication

The local v1 has one implicit owner and no application sign-in. Google OAuth authorizes Gmail access only; an internal owner identity is retained in the database so a future multi-user design does not require re-owning every record.
