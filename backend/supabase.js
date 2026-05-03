// test-supabase.js

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// DEBUG: check if env is loading
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY);

// Create client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Test query
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*');

    if (error) {
      console.error("❌ Error:", error.message);
    } else {
      console.log("✅ Success:", data);
    }
  } catch (err) {
    console.error("❌ Unexpected Error:", err.message);
  }
}

testConnection();