if output=$(git status --porcelain) && [ -z "$output" ]; then
  npm run build
else 
  echo "Working directory not clean. Commit or discard your changes!"
  exit 1
fi