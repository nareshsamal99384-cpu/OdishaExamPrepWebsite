import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

console.log("Supabase URL:", supabaseUrl);
console.log("Service Key Length:", supabaseServiceKey.length);

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  try {
    const email = "odishaexamprep365@gmail.com";
    const password = process.env.ADMIN_PASSWORD || "Naresh@9861&48";

    console.log("Listing users...");
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error("List users error:", listError);
      return;
    }
    console.log("Existing users in auth:", users.map(u => u.email));

    const existingAdmin = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!existingAdmin) {
      console.log("Creating admin user...");
      const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'admin' }
      });
      if (createError) {
        console.error("Create user error:", createError);
      } else {
        console.log("Admin user created successfully:", data.user?.id);
      }
    } else {
      console.log("Admin user already exists. ID:", existingAdmin.id);
      console.log("Updating password / metadata...");
      const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingAdmin.id, {
        password,
        user_metadata: { ...existingAdmin.user_metadata, role: 'admin' }
      });
      if (updateError) {
        console.error("Update user error:", updateError);
      } else {
        console.log("Admin user updated successfully!");
      }
    }
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

run();
