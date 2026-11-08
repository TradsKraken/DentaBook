CREATE TABLE concern_notifications (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), concern_id UUID NOT NULL REFERENCES patient_concerns(id),
 audience TEXT NOT NULL CHECK(audience IN ('patient','clinic')), actor_id UUID REFERENCES users(id),
 title TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX concern_notifications_recent ON concern_notifications(created_at DESC,id);
CREATE INDEX concern_notifications_concern ON concern_notifications(concern_id,audience);
CREATE TABLE notification_reads (
 notification_id UUID NOT NULL REFERENCES concern_notifications(id) ON DELETE CASCADE,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 read_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(notification_id,user_id)
);
CREATE FUNCTION notify_new_concern() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
 INSERT INTO concern_notifications(concern_id,audience,actor_id,title) VALUES(NEW.id,'clinic',NEW.patient_id,'New patient concern');
 RETURN NEW;
END $$;
CREATE TRIGGER concern_created_notification AFTER INSERT ON patient_concerns FOR EACH ROW EXECUTE FUNCTION notify_new_concern();
CREATE FUNCTION notify_concern_message() RETURNS TRIGGER LANGUAGE plpgsql AS $$ DECLARE patient UUID; BEGIN
 SELECT patient_id INTO patient FROM patient_concerns WHERE id=NEW.concern_id;
 INSERT INTO concern_notifications(concern_id,audience,actor_id,title) VALUES(NEW.concern_id,CASE WHEN NEW.author_id=patient THEN 'clinic' ELSE 'patient' END,NEW.author_id,CASE WHEN NEW.kind='event' THEN 'Your clinic concern was updated' WHEN NEW.author_id=patient THEN 'Patient replied to a concern' ELSE 'Your clinic replied to your concern' END);
 IF NEW.kind='event' THEN
 INSERT INTO concern_notifications(concern_id,audience,actor_id,title) VALUES(NEW.concern_id,'clinic',NEW.author_id,'Concern assignment or status updated');
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER concern_message_notification AFTER INSERT ON concern_messages FOR EACH ROW EXECUTE FUNCTION notify_concern_message();
