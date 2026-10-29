-- Bind a session to the portal role used at sign-in.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS role VARCHAR(30);
UPDATE sessions s SET role = u.role FROM users u
WHERE s.user_id = u.id AND s.role IS NULL;
ALTER TABLE sessions ALTER COLUMN role SET NOT NULL;
ALTER TABLE sessions ADD CONSTRAINT sessions_role_check
  CHECK (role IN ('patient', 'clinic_staff', 'system_admin'));

-- Credential or privilege changes must require a fresh sign-in, including when
-- an operator changes an account directly in PostgreSQL.
CREATE FUNCTION revoke_account_sessions() RETURNS trigger AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
    DELETE FROM sessions WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_revoke_sessions
AFTER UPDATE OF role, password_hash ON users
FOR EACH ROW EXECUTE FUNCTION revoke_account_sessions();
