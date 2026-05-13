-- Agenda items tabel
CREATE TABLE agenda_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  datum DATE NOT NULL,
  medewerker TEXT NOT NULL,
  tijd TEXT,
  omschrijving TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Werkbonnen tabel
CREATE TABLE werkbonnen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  datum DATE NOT NULL,
  medewerker TEXT NOT NULL,
  klant TEXT NOT NULL,
  projectnummer TEXT,
  werkbonnummer TEXT,
  omschrijving TEXT,
  start_tijd TEXT,
  eind_tijd TEXT,
  pauze INTEGER DEFAULT 0,
  uren NUMERIC(5,2) DEFAULT 0,
  vertrek TEXT,
  bestemming TEXT,
  kilometers NUMERIC(7,1) DEFAULT 0,
  heen_terug BOOLEAN DEFAULT TRUE,
  privaat_voertuig BOOLEAN DEFAULT FALSE,
  km_totaal NUMERIC(7,1) DEFAULT 0,
  fotos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Toegang instellen (interne app, geen login vereist)
ALTER TABLE agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE werkbonnen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_agenda" ON agenda_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_werkbonnen" ON werkbonnen FOR ALL USING (true) WITH CHECK (true);

-- Realtime aanzetten
ALTER PUBLICATION supabase_realtime ADD TABLE agenda_items;
ALTER PUBLICATION supabase_realtime ADD TABLE werkbonnen;
