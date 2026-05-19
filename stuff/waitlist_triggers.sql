-- Waitlist Trigger Functions for ClinicOS
-- Handles automatic position assignment and notification on appointment cancellation

-- ============================================================================
-- Trigger 1: set_waitlist_position
-- Automatically assigns position to new waitlist entries
-- ============================================================================

CREATE OR REPLACE FUNCTION set_waitlist_position()
RETURNS TRIGGER AS $$
DECLARE
    max_position INTEGER;
BEGIN
    -- Find max position for the clinic where status is 'waiting'
    SELECT COALESCE(MAX(position), 0)
    INTO max_position
    FROM waitlist
    WHERE clinic_id = NEW.clinic_id AND status = 'waiting';
    
    -- Set position to max + 1
    NEW.position := max_position + 1;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for waitlist insert
CREATE TRIGGER on_waitlist_insert
BEFORE INSERT ON waitlist
FOR EACH ROW
EXECUTE FUNCTION set_waitlist_position();

-- ============================================================================
-- Trigger 2: check_waitlist_on_cancellation
-- Notifies waitlist when an appointment is cancelled
-- ============================================================================

CREATE OR REPLACE FUNCTION check_waitlist_on_cancellation()
RETURNS TRIGGER AS $$
DECLARE
    waitlist_entry RECORD;
    expiry_date DATE;
BEGIN
    -- Only process if appointment was scheduled and is now cancelled
    IF OLD.status = 'scheduled' AND NEW.status = 'cancelled' THEN
        
        -- Find the best matching waitlist entry
        -- Order by: priority desc (higher priority first), position asc (earlier in queue)
        SELECT *
        INTO waitlist_entry
        FROM waitlist
        WHERE clinic_id = NEW.clinic_id
          AND status = 'waiting'
          AND (doctor_id IS NULL OR doctor_id = NEW.doctor_id)
          AND (preferred_date IS NULL OR preferred_date = NEW.appointment_date)
          AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
        ORDER BY priority DESC, position ASC
        LIMIT 1;
        
        -- If a matching entry is found, insert notification
        IF waitlist_entry IS NOT NULL THEN
            INSERT INTO waitlist_notifications (
                waitlist_id,
                clinic_id,
                patient_id,
                appointment_date,
                time_slot,
                created_at,
                status
            ) VALUES (
                waitlist_entry.id,
                NEW.clinic_id,
                waitlist_entry.patient_id,
                NEW.appointment_date,
                NEW.time_slot,
                CURRENT_TIMESTAMP,
                'pending'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for appointment cancellation
CREATE TRIGGER on_appointment_cancelled
AFTER UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION check_waitlist_on_cancellation();
