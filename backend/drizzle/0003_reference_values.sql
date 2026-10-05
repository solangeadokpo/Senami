-- CDC section 13 form lists. Still under review: adjust through a new migration.
--
-- location, event_type and bodily_damage accept a value outside the list:
-- their `autre` entry has requires_precision, and the app then asks for free
-- text. That text goes on the PDF only. It is never stored on the server: it
-- can identify a child, and the registry keeps the code `autre`.
INSERT INTO reference_values (list, code, label, sort_order, requires_precision) VALUES
  -- Location of the event
  ('location', 'cour',          'Cour',             1, false),
  ('location', 'classe',        'Classe',           2, false),
  ('location', 'preau',         'Préau',            3, false),
  ('location', 'escaliers',     'Escaliers',        4, false),
  ('location', 'cantine',       'Cantine',          5, false),
  ('location', 'terrain_sport', 'Terrain de sport', 6, false),
  ('location', 'autre',         'Autre',            99, true),
  -- Event type (single choice)
  ('event_type', 'chute',          'Chute',             1, false),
  ('event_type', 'choc',           'Choc',              2, false),
  ('event_type', 'coupure',        'Coupure',           3, false),
  ('event_type', 'piqure_morsure', 'Piqûre / morsure',  4, false),
  ('event_type', 'brulure',        'Brûlure',           5, false),
  ('event_type', 'malaise',        'Malaise',           6, false),
  ('event_type', 'autre',          'Autre',             99, true),
  -- Bodily damage (multiple choice)
  ('bodily_damage', 'leger_traumatisme',     'Léger traumatisme',     1, false),
  ('bodily_damage', 'ecorchure',             'Écorchure',             2, false),
  ('bodily_damage', 'contusion',             'Contusion',             3, false),
  ('bodily_damage', 'coupure_superficielle', 'Coupure superficielle', 4, false),
  ('bodily_damage', 'autre',                 'Autre',                 99, true),
  -- Body parts
  ('body_part', 'tete',    'Tête',    1, false),
  ('body_part', 'visage',  'Visage',  2, false),
  ('body_part', 'cou',     'Cou',     3, false),
  ('body_part', 'epaule',  'Épaule',  4, false),
  ('body_part', 'bras',    'Bras',    5, false),
  ('body_part', 'coude',   'Coude',   6, false),
  ('body_part', 'main',    'Main',    7, false),
  ('body_part', 'dos',     'Dos',     8, false),
  ('body_part', 'ventre',  'Ventre',  9, false),
  ('body_part', 'hanche',  'Hanche',  10, false),
  ('body_part', 'genou',   'Genou',   11, false),
  ('body_part', 'jambe',   'Jambe',   12, false),
  ('body_part', 'cheville','Cheville',13, false),
  ('body_part', 'pied',    'Pied',    14, false),
  -- Laterality
  ('laterality', 'gauche', 'Gauche', 1, false),
  ('laterality', 'droite', 'Droite', 2, false),
  ('laterality', 'median', 'Médian', 3, false),
  -- Observed signs (yes / no on the sheet)
  ('observed_sign', 'deformation',     'Déformation',      1, false),
  ('observed_sign', 'egratignure',     'Égratignure',      2, false),
  ('observed_sign', 'hematome',        'Hématome',         3, false),
  ('observed_sign', 'gonflement',      'Gonflement',       4, false),
  ('observed_sign', 'leger_saignement','Léger saignement', 5, false),
  ('observed_sign', 'paralysie',       'Paralysie',        6, false),
  ('observed_sign', 'petite_cloque',   'Petite cloque',    7, false),
  ('observed_sign', 'peau_arrachee',   'Peau arrachée',    8, false),
  ('observed_sign', 'rougeur',         'Rougeur',          9, false),
  -- Checked risks (yes / no); temperature is a separate numeric field
  ('checked_risk', 'malaise',               'Malaise',               1, false),
  ('checked_risk', 'perte_connaissance',    'Perte de connaissance', 2, false),
  ('checked_risk', 'vertige',               'Vertige',               3, false),
  ('checked_risk', 'vomissement',           'Vomissement',           4, false);
