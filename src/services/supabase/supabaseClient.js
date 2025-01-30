
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xqeimsncmnqsiowftdmz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZWltc25jbW5xc2lvd2Z0ZG16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgwNDExOTYsImV4cCI6MjA1MzYxNzE5Nn0.B8mZGxtUDp5jC-SwqBj1G5BjZE_A6RC-ZeJtmkq76iY'

export const supabase = createClient(supabaseUrl, supabaseKey);
