import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runCleanup() {
  console.log("Starting comprehensive cleanup of orphaned data...");
  
  // 1. Get all valid exam IDs
  const { data: exams, error: examsError } = await supabase.from('exams').select('id');
  if (examsError) {
    console.error("Failed to load exams:", examsError);
    return;
  }
  const validExamIds = exams.map((e: any) => e.id);
  console.log(`Found ${validExamIds.length} valid exams.`);

  // Type: { id, examId, [other] }
  const cleanTable = async (tableName: string, examIdField: string = 'examId') => {
    const { data, error } = await supabase.from(tableName).select(`id, ${examIdField}`);
    if (error) {
      console.error(`Failed to load ${tableName}:`, error);
      return;
    }
    
    let orphanedIds = [];
    if (tableName === 'mockTests') {
      // For mockTests, seriesId is a JSON string containing examId
      orphanedIds = data.filter((item: any) => {
        try {
          if (!item.seriesId) return true; // invalid
          const config = JSON.parse(item.seriesId);
          return config.examId && !validExamIds.includes(config.examId);
        } catch (e) {
          return false; // Not a JSON seriesId, maybe valid old data format
        }
      }).map((item: any) => item.id);
    } else {
      orphanedIds = data
        .filter((item: any) => item[examIdField] !== 'generic' && !validExamIds.includes(item[examIdField]))
        .map((item: any) => item.id);
    }

    console.log(`Found ${orphanedIds.length} orphaned ${tableName} to delete.`);

    if (orphanedIds.length > 0) {
      for (const id of orphanedIds) {
        const { error } = await supabase.from(tableName).delete().eq('id', id);
        if (error) {
          console.error(`Failed to delete ${tableName} ${id}:`, error);
        }
      }
      console.log(`Cleaned up ${tableName}!`);
    }
  };

  await cleanTable('questions');
  await cleanTable('questionBanks');
  await cleanTable('testSeries');
  await cleanTable('mockTests', 'seriesId');

  console.log("Comprehensive cleanup completed!");
}

runCleanup();
