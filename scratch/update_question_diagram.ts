import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const updatedDiagram = {
  "grid": true,
  "type": "vector",
  "width": 1000,
  "xAxis": true,
  "yAxis": true,
  "height": 600,
  "shapes": [
    {
      "end": [
        5,
        5
      ],
      "type": "line",
      "label": "$y=x$",
      "start": [
        0,
        0
      ],
      "stroke": "#2563eb",
      "strokeWidth": 3,
      "labelX": 3.8,
      "labelY": 3.8
    },
    {
      "end": [
        4,
        0
      ],
      "type": "line",
      "label": "$y=4-x$",
      "start": [
        0,
        4
      ],
      "stroke": "#16a34a",
      "strokeWidth": 3,
      "labelX": 0.8,
      "labelY": 3.2
    },
    {
      "r": 0.12,
      "fill": "#ef4444",
      "type": "circle",
      "center": [
        2,
        2
      ]
    }
  ],
  "xRange": [
    0,
    6
  ],
  "yRange": [
    0,
    6
  ]
};

async function run() {
  console.log('Updating diagram for QID 7b1117ec-b580-4a95-9578-24b7daca8380...');
  const { data, error } = await supabase
    .from('questions')
    .update({ diagram: updatedDiagram })
    .eq('id', '7b1117ec-b580-4a95-9578-24b7daca8380')
    .select();

  if (error) {
    console.error('Failed to update question:', error);
  } else {
    console.log('Successfully updated question diagram:', data);
  }
}

run();
