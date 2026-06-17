import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CORRECT_DATA = [
  {
    id: "8e6f58a7-fcd3-4996-b317-27eb212fd0aa",
    questionText: "In the rectangle shown below, the length is 24 m and breadth is 18 m. Find the area of the rectangle.",
    diagram: {
      type: "vector",
      elements: [
        {
          type: "rect",
          points: [[2, 2], [8, 6]]
        },
        {
          type: "text",
          pos: [5, 1],
          text: "$24\\,m$"
        },
        {
          type: "text",
          pos: [9, 4],
          text: "$18\\,m$"
        }
      ]
    }
  },
  {
    id: "ed4478ae-f906-4b4a-8a53-13dabce04b9c",
    questionText: "In the triangle below, one angle is $90^\\circ$ and another angle is $35^\\circ$. Find angle x.",
    diagram: {
      type: "vector",
      elements: [
        {
          type: "line",
          start: [2, 2],
          end: [8, 2]
        },
        {
          type: "line",
          start: [2, 2],
          end: [2, 7]
        },
        {
          type: "line",
          start: [2, 7],
          end: [8, 2]
        },
        {
          type: "text",
          pos: [2.8, 2.8],
          text: "$90^\\circ$"
        },
        {
          type: "text",
          pos: [6.5, 2.8],
          text: "$35^\\circ$"
        },
        {
          type: "text",
          pos: [3.8, 5.8],
          text: "$x$"
        }
      ]
    }
  },
  {
    id: "11814108-5d80-4df0-8877-d469645de4f0",
    questionText: "In the circle below, radius = 14 cm. Find the circumference. (Use $\\pi=22/7$)",
    diagram: {
      type: "vector",
      elements: [
        {
          type: "circle",
          center: [5, 5],
          r: 3
        },
        {
          type: "line",
          start: [5, 5],
          end: [8, 5]
        },
        {
          type: "text",
          pos: [6.5, 4.5],
          text: "$14\\,cm$"
        }
      ]
    }
  },
  {
    id: "32ffdf38-bac1-49aa-9839-ffe1ec61ec07",
    questionText: "In the figure below, two adjacent angles on a straight line are $(3x+10)^\\circ$ and $(2x+20)^\\circ$. Find x.",
    diagram: {
      type: "vector",
      elements: [
        {
          type: "line",
          start: [1, 4],
          end: [9, 4]
        },
        {
          type: "line",
          start: [5, 4],
          end: [5, 8]
        },
        {
          type: "text",
          pos: [3, 5],
          text: "$(3x+10)^\\circ$"
        },
        {
          type: "text",
          pos: [7, 5],
          text: "$(2x+20)^\\circ$"
        }
      ]
    }
  }
];

async function run() {
  console.log('Fixing database questions with correct LaTeX/backslash diagram parameters...');
  
  for (const q of CORRECT_DATA) {
    const { data, error } = await supabase
      .from('questions')
      .update({
        questionText: q.questionText,
        diagram: q.diagram
      })
      .eq('id', q.id)
      .select();

    if (error) {
      console.error(`Error updating question ${q.id}:`, error);
    } else {
      console.log(`Successfully updated question ${q.id}.`);
    }
  }
  
  console.log('Database correction finished!');
}

run();
