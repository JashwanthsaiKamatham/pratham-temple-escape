-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (stores bcrypt-authenticated users + Pratham Temple Escape progress)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL DEFAULT 'Adventurer',
  password_hash TEXT NOT NULL,
  high_score INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  diamonds INTEGER NOT NULL DEFAULT 0,
  total_distance INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  equipped_outfit TEXT NOT NULL DEFAULT 'classic',
  unlocked_outfits JSONB NOT NULL DEFAULT '["classic"]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure game progress columns exist even if profiles table was created earlier with minimal columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS high_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS diamonds INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_distance INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS games_played INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_outfit TEXT NOT NULL DEFAULT 'classic';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unlocked_outfits JSONB NOT NULL DEFAULT '["classic"]'::jsonb;

-- Items table (Run logs, Temple quests, Sustainability/Adventure milestones with AI summaries)
CREATE TABLE IF NOT EXISTS public.items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  ai_summary TEXT DEFAULT '',
  category TEXT DEFAULT 'quest',
  score INTEGER DEFAULT 0,
  distance INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.items ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'quest';
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS distance INTEGER DEFAULT 0;

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles: users see & update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for items: users CRUD their own items
DROP POLICY IF EXISTS "Users can view own items" ON public.items;
CREATE POLICY "Users can view own items"
  ON public.items FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own items" ON public.items;
CREATE POLICY "Users can insert own items"
  ON public.items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own items" ON public.items;
CREATE POLICY "Users can update own items"
  ON public.items FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own items" ON public.items;
CREATE POLICY "Users can delete own items"
  ON public.items FOR DELETE
  USING (auth.uid() = user_id);
