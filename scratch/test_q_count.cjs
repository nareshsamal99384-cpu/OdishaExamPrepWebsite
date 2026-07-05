const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('questionBanks')
    .select('*')
    .limit(5);

  if (error) {
    console.error("Error fetching question banks:", error);
  } else {
    console.log("Fetched banks:", JSON.stringify(data, null, 2));
  }
}

test();
