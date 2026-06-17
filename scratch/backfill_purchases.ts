import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: Supabase environment variables are missing in .env.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function backfill() {
  console.log("Starting Entitlements Backfill Script...\n");

  try {
    // 1. Fetch all users from Supabase Auth
    let page = 1;
    const perPage = 1000;
    let hasMore = true;
    let totalUsersScanned = 0;
    let totalEntitlementsCreated = 0;

    while (hasMore) {
      console.log(`Scanning page ${page}...`);
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage
      });

      if (listError) {
        throw listError;
      }

      if (!users || users.length === 0) {
        hasMore = false;
        break;
      }

      totalUsersScanned += users.length;

      for (const u of users) {
        const metadata = u.user_metadata || {};
        const purchased = metadata.purchasedSeries || [];

        if (Array.isArray(purchased) && purchased.length > 0) {
          console.log(`User ${u.email} (${u.id}) has ${purchased.length} active entitlements in metadata.`);

          for (const productId of purchased) {
            // Determine product type
            let productType = 'unknown';
            if (productId.startsWith('exam_bundle_')) {
              productType = 'exam_bundle';
            } else if (productId.startsWith('series_')) {
              productType = 'test_series';
            } else if (productId === 'full_access') {
              productType = 'full_access';
            }

            // Check if already exists in the ledger
            const { data: existing, error: checkErr } = await supabaseAdmin
              .from('user_purchases')
              .select('id')
              .eq('user_id', u.id)
              .eq('product_id', productId)
              .maybeSingle();

            if (checkErr) {
              console.error(`Error checking ledger for user ${u.id}, product ${productId}:`, checkErr);
              continue;
            }

            if (!existing) {
              // Insert into ledger
              console.log(`-> Backfilling ledger entry for product: ${productId}`);
              const { error: insertErr } = await supabaseAdmin
                .from('user_purchases')
                .insert([{
                  user_id: u.id,
                  product_id: productId,
                  product_type: productType,
                  price_paid: 0.00,
                  razorpay_order_id: 'BACKFILL_MIGRATION',
                  razorpay_payment_id: 'BACKFILL_MIGRATION',
                  snapshot: { migrated_from_metadata: true },
                  status: 'active'
                }]);

              if (insertErr) {
                console.error(`Failed to insert ledger entry:`, insertErr);
              } else {
                totalEntitlementsCreated++;
              }
            } else {
              console.log(`-> Ledger entry already exists for product: ${productId}. Skipping.`);
            }
          }
        }
      }

      page++;
      // If we got less than perPage, we're done
      if (users.length < perPage) {
        hasMore = false;
      }
    }

    console.log("\n=============================================");
    console.log("Entitlements Backfill Script Completed Successfully!");
    console.log(`Total Auth Users Scanned: ${totalUsersScanned}`);
    console.log(`Total New Ledger Entries Created: ${totalEntitlementsCreated}`);
    console.log("=============================================");

  } catch (error) {
    console.error("Backfill execution encountered an error:", error);
    process.exit(1);
  }
}

backfill();
