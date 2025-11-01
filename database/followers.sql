-- ============================================
-- FOLLOWERS & FOLLOWING SYSTEM
-- ============================================

-- Create followers table
CREATE TABLE IF NOT EXISTS followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS followers_follower_id_idx ON followers(follower_id);
CREATE INDEX IF NOT EXISTS followers_following_id_idx ON followers(following_id);
CREATE INDEX IF NOT EXISTS followers_status_idx ON followers(status);

-- Enable Row Level Security
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

-- Followers policies
CREATE POLICY "Users can view their followers"
  ON followers FOR SELECT
  USING (auth.uid() = following_id OR auth.uid() = follower_id);

CREATE POLICY "Users can view who they are following"
  ON followers FOR SELECT
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can request to follow others"
  ON followers FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can update their follow requests"
  ON followers FOR UPDATE
  USING (auth.uid() = following_id OR auth.uid() = follower_id);

CREATE POLICY "Users can delete their follow requests"
  ON followers FOR DELETE
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Create function to handle updated_at
CREATE OR REPLACE FUNCTION handle_followers_updated_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for followers updated_at
DROP TRIGGER IF EXISTS set_followers_updated_at ON followers;
CREATE TRIGGER set_followers_updated_at
  BEFORE UPDATE ON followers
  FOR EACH ROW
  EXECUTE FUNCTION handle_followers_updated_at();

-- Create notifications table for follow requests
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'follow_request', 'follow_accepted', 'follow_rejected'
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);
CREATE INDEX IF NOT EXISTS notifications_type_idx ON notifications(type);

-- Enable Row Level Security for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark notifications as read"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Create function to handle follow requests
CREATE OR REPLACE FUNCTION handle_follow_request()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  following_user_is_private BOOLEAN;
BEGIN
  -- Check if the user being followed has a private profile
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = NEW.following_id AND is_private = true
  ) INTO following_user_is_private;
  
  -- If the user is private, set status to pending, otherwise accepted
  IF following_user_is_private THEN
    NEW.status := 'pending';
    -- Create notification for follow request
    INSERT INTO notifications (user_id, from_user_id, type, message)
    VALUES (
      NEW.following_id, 
      NEW.follower_id, 
      'follow_request', 
      'You have a new follow request'
    );
  ELSE
    NEW.status := 'accepted';
    -- Create notification for new follower
    INSERT INTO notifications (user_id, from_user_id, type, message)
    VALUES (
      NEW.following_id, 
      NEW.follower_id, 
      'new_follower', 
      'You have a new follower'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for follow requests
DROP TRIGGER IF EXISTS on_follow_request ON followers;
CREATE TRIGGER on_follow_request
  BEFORE INSERT ON followers
  FOR EACH ROW
  EXECUTE FUNCTION handle_follow_request();

-- Add is_private column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

-- Add display_name column to profiles table for public display
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Add website column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS website TEXT;

-- Add social links columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS twitter TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS linkedin TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS github TEXT;

-- Create index for is_private column
CREATE INDEX IF NOT EXISTS profiles_is_private_idx ON profiles(is_private);

-- Update profiles policies to allow viewing public profiles
DROP POLICY IF EXISTS "Enable read access for users" ON profiles;
CREATE POLICY "Enable read access for users"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id OR 
    is_private = false OR
    EXISTS (
      SELECT 1 FROM followers 
      WHERE follower_id = auth.uid() 
      AND following_id = id 
      AND status = 'accepted'
    )
  );

-- Create function to handle profile privacy changes
CREATE OR REPLACE FUNCTION handle_profile_privacy_change()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user changed profile to private, reject all pending follow requests
  IF NEW.is_private = true AND OLD.is_private = false THEN
    UPDATE followers 
    SET status = 'rejected' 
    WHERE following_id = NEW.id AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile privacy changes
DROP TRIGGER IF EXISTS on_profile_privacy_change ON profiles;
CREATE TRIGGER on_profile_privacy_change
  AFTER UPDATE OF is_private ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_profile_privacy_change();

-- ============================================
-- VERIFICATION
-- ============================================

-- Check if everything is set up correctly
DO $$
BEGIN
  RAISE NOTICE '✅ Followers system setup complete!';
  RAISE NOTICE 'Tables created: followers, notifications';
  RAISE NOTICE 'RLS enabled: Yes';
  RAISE NOTICE 'Policies created: 7';
  RAISE NOTICE 'Triggers created: 3';
  RAISE NOTICE 'New column added: profiles.is_private';
END $$;