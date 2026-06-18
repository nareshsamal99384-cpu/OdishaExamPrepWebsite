const { createClient } = require('@supabase/supabase-js');

// Load environment variables for local testing if dotenv is available
try {
  require('dotenv').config();
} catch (e) {
  // Ignore if dotenv is not installed or loaded
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://awnapqzkccsytdpzsbxm.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test query using 'exams' table
supabase
  .from('exams')
  .select('*')
  .limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.error('Supabase connection error:', error.message);
    } else {
      console.log('Supabase connection successful! Exam table test query:', data);
    }
  });

module.exports = { supabase };
