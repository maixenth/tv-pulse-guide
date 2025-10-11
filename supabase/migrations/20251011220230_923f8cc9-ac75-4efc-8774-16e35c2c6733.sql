-- Create channels table
CREATE TABLE public.channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,
  country TEXT,
  categories TEXT[],
  languages TEXT[],
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create programs table
CREATE TABLE public.programs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  channel_id TEXT NOT NULL,
  category TEXT,
  is_live BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_programs_channel_id ON public.programs(channel_id);
CREATE INDEX idx_programs_start_time ON public.programs(start_time);
CREATE INDEX idx_programs_is_live ON public.programs(is_live);

-- Enable RLS (public read access since it's a TV guide)
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Allow public read access (no auth required for TV guide)
CREATE POLICY "Anyone can read channels"
ON public.channels
FOR SELECT
USING (true);

CREATE POLICY "Anyone can read programs"
ON public.programs
FOR SELECT
USING (true);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_channels_updated_at
BEFORE UPDATE ON public.channels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_programs_updated_at
BEFORE UPDATE ON public.programs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();