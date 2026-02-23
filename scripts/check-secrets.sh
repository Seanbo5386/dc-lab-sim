#!/usr/bin/env bash
# Pre-commit secret scanner
# Scans staged files for common secret patterns

set -euo pipefail

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

# Patterns that indicate real secrets (not example/template values)
PATTERNS=(
  'AKIA[0-9A-Z]{16}'                    # AWS Access Key ID
  '[Aa][Ww][Ss]_[Ss][Ee][Cc][Rr][Ee][Tt]_[Aa][Cc][Cc][Ee][Ss][Ss]_[Kk][Ee][Yy]\s*=' # AWS Secret Key assignment
  '[Aa][Ww][Ss]_[Ss][Ee][Ss][Ss][Ii][Oo][Nn]_[Tt][Oo][Kk][Ee][Nn]\s*='             # AWS Session Token
  '-----BEGIN (RSA |EC )?PRIVATE KEY'   # Private keys
  '-----BEGIN CERTIFICATE'              # Certificates
  'user_pool_id.*us-[a-z]+-[0-9]_'     # Cognito Pool ID (hardcoded)
  'identity_pool_id.*us-[a-z]+-[0-9]:' # Cognito Identity Pool (hardcoded)
  'appsync-api\.[a-z0-9-]+\.amazonaws' # AppSync endpoint (hardcoded)
)

FOUND=0

for FILE in $STAGED_FILES; do
  # Skip binary files, lock files, and this script itself
  if [[ "$FILE" =~ \.(png|jpg|gif|ico|woff|woff2|ttf|eot|lock)$ ]] || \
     [[ "$FILE" == "scripts/check-secrets.sh" ]] || \
     [[ "$FILE" == "package-lock.json" ]]; then
    continue
  fi

  # Skip files that don't exist (deleted files)
  if [ ! -f "$FILE" ]; then
    continue
  fi

  for PATTERN in "${PATTERNS[@]}"; do
    if git diff --cached -- "$FILE" | grep -qE -- "$PATTERN"; then
      echo "ERROR: Potential secret found in staged file: $FILE"
      echo "  Pattern matched: $PATTERN"
      echo "  Review the file and remove the secret before committing."
      FOUND=1
    fi
  done
done

if [ $FOUND -ne 0 ]; then
  echo ""
  echo "Commit blocked: potential secrets detected in staged changes."
  echo "If this is a false positive (e.g., example/documentation text),"
  echo "you can bypass with: git commit --no-verify"
  exit 1
fi

exit 0
