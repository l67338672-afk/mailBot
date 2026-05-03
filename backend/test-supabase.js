require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function test() {
  const res = await supabase
    .from('customers')
    .select('*');

  console.log("FULL RESPONSE:", res);
}

test();