-- Owner access is explicitly provisioned by an operator, never public registration.
ALTER TABLE users ADD COLUMN username VARCHAR(40);
ALTER TABLE users ADD COLUMN owner_access BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN development_only BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_identity_check CHECK (email IS NOT NULL OR username IS NOT NULL);
ALTER TABLE users ADD CONSTRAINT users_username_check CHECK (username IS NULL OR username ~ '^[a-zA-Z][a-zA-Z0-9_.-]{2,39}$');
CREATE UNIQUE INDEX users_username_lower_unique ON users (LOWER(username));
ALTER TABLE users ADD CONSTRAINT users_owner_access_check CHECK (NOT owner_access OR role = 'system_admin');
ALTER TABLE users ADD CONSTRAINT users_development_only_check CHECK (NOT development_only OR owner_access);

-- A portal session keeps its effective role. Ordinary accounts retain their
-- original single-role boundary; only explicitly granted owners can switch.
CREATE OR REPLACE FUNCTION revoke_account_sessions() RETURNS trigger AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.password_hash IS DISTINCT FROM OLD.password_hash
     OR NEW.owner_access IS DISTINCT FROM OLD.owner_access
     OR NEW.development_only IS DISTINCT FROM OLD.development_only
     OR NEW.username IS DISTINCT FROM OLD.username THEN
    DELETE FROM sessions WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER users_revoke_sessions ON users;
CREATE TRIGGER users_revoke_sessions
AFTER UPDATE OF role, password_hash, owner_access, development_only, username ON users
FOR EACH ROW EXECUTE FUNCTION revoke_account_sessions();
