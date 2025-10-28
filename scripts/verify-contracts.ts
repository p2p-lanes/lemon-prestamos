import { exec } from 'child_process';
import { promisify } from 'util';
import * as dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

async function verifyContract(address: string, constructorArgs: string[] = []) {
  const argsString = constructorArgs.length > 0 ? constructorArgs.map(arg => `"${arg}"`).join(' ') : '';
  const command = `npx hardhat verify --network baseSepolia ${address} ${argsString}`;

  console.log(`Running: ${command}`);

  try {
    const { stdout, stderr } = await execAsync(command);
    console.log(stdout);
    if (stderr) console.error(stderr);
    return true;
  } catch (error: any) {
    if (error.stdout?.includes('Already Verified')) {
      console.log('✅ Contract already verified!');
      return true;
    }
    console.error('Error:', error.message);
    return false;
  }
}

async function main() {
  const mockUSDT = process.env.MOCK_USDT_ADDRESS!;
  const vault = process.env.VAULT_ADDRESS!;

  console.log('Starting contract verification...\n');

  // Verify MockUSDT
  console.log('1. Verifying MockUSDT at:', mockUSDT);
  const mockVerified = await verifyContract(mockUSDT);

  if (mockVerified) {
    console.log('\n2. Verifying LendingVault at:', vault);
    console.log('   Constructor args: USDT =', mockUSDT);
    await verifyContract(vault, [mockUSDT]);
  }

  console.log('\n✅ Verification complete!');
  console.log('\nView contracts on BaseScan:');
  console.log('MockUSDT:', `https://sepolia.basescan.org/address/${mockUSDT}`);
  console.log('LendingVault:', `https://sepolia.basescan.org/address/${vault}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
