#!/bin/bash

# Fix Supabase type issues by adding type casts

echo "Fixing Supabase type casts..."

# List of files with type issues
files=(
  "src/app/api/integrations/clockify/mappings/route.ts"
  "src/app/api/integrations/clockify/sync/route.ts"
  "src/app/api/time-entries/[id]/route.ts"
  "src/app/api/time-entries/route.ts"
  "src/app/api/time-entries/stats/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."

    # Add (supabase as any) before .from and .rpc calls for new tables
    sed -i '' 's/await supabase\.from(\x27clockify_/await (supabase as any).from(\x27clockify_/g' "$file"
    sed -i '' 's/await supabase\.from(\x27time_entries/await (supabase as any).from(\x27time_entries/g' "$file"
    sed -i '' 's/await supabase\.rpc(\x27get_time/await (supabase as any).rpc(\x27get_time/g' "$file"
    sed -i '' 's/= await supabase\.from("clockify_/= await (supabase as any).from("clockify_/g' "$file"
    sed -i '' 's/= await supabase\.from("time_entries/= await (supabase as any).from("time_entries/g' "$file"
    sed -i '' 's/= await supabase\.rpc("get_time/= await (supabase as any).rpc("get_time/g' "$file"

    # Fix already fixed ones (remove double cast)
    sed -i '' 's/(supabase as any) as any/(supabase as any)/g' "$file"

    echo "  ✓ Fixed $file"
  fi
done

echo "✅ All files processed!"
