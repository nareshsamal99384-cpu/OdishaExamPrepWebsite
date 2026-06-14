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

const updates = [
  {
    id: 'a08445b1-7a45-428f-8951-a6bc6944d3f4',
    questionText: `Circle:

{
  "type": "circle",
  "cx": 300,
  "cy": 200,
  "radius": 120,
  "label": "O"
}

Equation:

$$x^2+y^2+4x-8y-20=0$$

Find radius.`
  },
  {
    id: '575c38b4-017c-40ae-9881-f476ba1973f9',
    questionText: `Coordinate diagram:

{
  "type": "coordinate",
  "xAxis": true,
  "yAxis": true,
  "points": [
    {"x": 0, "y": 8, "label": "B(0,8)"},
    {"x": 6, "y": 0, "label": "A(6,0)"}
  ]
}

Find distance AB.`
  },
  {
    id: '14149df9-92c5-4eef-a5b9-f11607e26ed2',
    questionText: `Graph diagram:

{
  "type": "plot",
  "equation": "y=x^2-6x+8",
  "xRange": [-1, 7],
  "yRange": [-2, 12]
}

Function:

$$y=x^2-6x+8$$

Find vertex.`
  },
  {
    id: '080593e2-1b3b-4b74-9f4d-dcfd80469600',
    questionText: `Triangle diagram:

{
  "type": "geometry",
  "xRange": [-5, 5],
  "yRange": [-1, 3],
  "shapes": [
    {
      "type": "triangle",
      "points": [[-3.464, 0], [3.464, 0], [0, 2]],
      "fill": "rgba(138, 28, 54, 0.05)",
      "stroke": "currentColor",
      "strokeWidth": 2.5
    },
    {
      "type": "line",
      "start": [0, 2],
      "end": [0, 0],
      "stroke": "currentColor",
      "strokeWidth": 2,
      "dashed": true
    }
  ],
  "labels": [
    {"text": "A", "pos": [0, 2.3]},
    {"text": "B", "pos": [-3.8, -0.2]},
    {"text": "C", "pos": [3.8, -0.2]},
    {"text": "D", "pos": [0, -0.3]}
  ]
}

Given:

$$AB=AC$$
$$\angle A=120^\circ$$
$$BD=DC$$

Find:

$$\frac{AD}{BC}$$`
  }
];

async function run() {
  console.log('Starting question updates in Supabase...');
  for (const update of updates) {
    const { data, error } = await supabase
      .from('questions')
      .update({ questionText: update.questionText })
      .eq('id', update.id)
      .select();
    
    if (error) {
      console.error(`Error updating question ${update.id}:`, error);
    } else {
      console.log(`Successfully updated question ${update.id}!`);
    }
  }
  console.log('Updates finished!');
}

run();
