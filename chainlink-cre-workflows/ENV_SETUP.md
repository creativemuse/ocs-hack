# Chainlink CRE Environment Setup

## Where the CRE CLI reads `.env`

By default, `cre` loads **`chainlink-cre-workflows/.env`** (project root next to `project.yaml`). If you only have **`weekly-prize-distribution/.env`**, the CLI will **not** see `CRE_ETH_PRIVATE_KEY` and you get:

`failed to parse private key ... invalid length, need 256 bits`

**Fix (pick one):**

1. **Copy or symlink** your key into the project root:
   ```bash
   cd chainlink-cre-workflows
   cp weekly-prize-distribution/.env .env   # or: ln -s weekly-prize-distribution/.env .env
   ```
2. **Pass the env file on every command** (from `chainlink-cre-workflows/`):
   ```bash
   cre workflow activate weekly-prize-distribution -e weekly-prize-distribution/.env --target production-settings --yes
   ```

## .env File Configuration

The `.env` file should contain your private key for signing transactions when the workflow writes to the blockchain (root `.env` or path passed with `-e`).

### Required Environment Variable

```bash
# Private key for CRE workflows (64 characters, no 0x prefix)
# This key is used to sign transactions when the workflow writes to the blockchain
CRE_ETH_PRIVATE_KEY=your_64_character_private_key_without_0x_prefix
```

### Important Notes

1. **Never commit `.env` files to Git** - The `.gitignore` file already excludes `.env` files
2. **Use a dedicated account** - Consider using a separate account for CRE workflows, not your main deployer account
3. **Fund the account** - The account must have ETH (or Base ETH) to pay for gas fees when the workflow executes transactions
4. **No 0x prefix** - The private key should be 64 hexadecimal characters without the `0x` prefix

### Example

```bash
# Good (64 characters, no 0x)
CRE_ETH_PRIVATE_KEY=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Bad (has 0x prefix)
CRE_ETH_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Bad (wrong length)
CRE_ETH_PRIVATE_KEY=1234567890abcdef
```

## Setup Steps

1. **Create the `.env` file** in `chainlink-cre-workflows/`:
   ```bash
   cd chainlink-cre-workflows
   touch .env
   ```

2. **Add your private key**:
   ```bash
   echo "CRE_ETH_PRIVATE_KEY=your_64_character_private_key" >> .env
   ```

3. **Verify it's in `.gitignore`**:
   ```bash
   grep -q "^\.env$" .gitignore && echo "✓ .env is ignored" || echo "✗ Add .env to .gitignore"
   ```

## Security Best Practices

- ✅ Use a dedicated account for CRE workflows
- ✅ Never share your private key
- ✅ Never commit `.env` files to version control
- ✅ Use a secrets manager for production (see CRE documentation)
- ✅ Rotate keys periodically

## Testing

After setting up your `.env` file, test the workflow locally:

```bash
cd chainlink-cre-workflows
bun install --cwd weekly-prize-distribution
cre workflow simulate weekly-prize-distribution -e weekly-prize-distribution/.env --target staging-settings
```

## Next Steps

1. Ensure your contract's `chainlinkOracle` is set to the CRE forwarder address
2. Test the workflow locally with `cre workflow simulate` (use `-e` if `.env` is only under the workflow folder)
3. Deploy: `cre workflow deploy weekly-prize-distribution -e weekly-prize-distribution/.env --target staging-settings`
