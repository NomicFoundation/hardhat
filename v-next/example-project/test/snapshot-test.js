import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const GAS_STATS_SNAPSHOT_FILE = 'gas-stats';

function getSnapshotPath(snapshotFile) {
  return path.resolve(process.cwd(), ".snapshots", snapshotFile);
}

function runTests() {
  return new Promise((resolve, reject) => {
    console.log('Running tests...');
    
    const child = spawn('pnpm', [
      'hardhat', 'test', "nodejs",
      '--gas-stats'
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: import.meta.dirname
    });
    
    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Tests failed with code ${code}`));
      }
    });
  });
}

function extractGasTable(output) {
  const lines = output.split('\n');
  const start = lines.findIndex(line => line.includes('Gas Usage Statistics'));

  if (start === -1) {
    return '';
  }

  const end = lines.findIndex((line, i) => i > start && !line.startsWith('|'));
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
}

function showColorizedDiff(expected, actual) {
  const expectedLines = expected.split('\n');
  const actualLines = actual.split('\n');
  
  console.log('\nSnapshot differs:');
  console.log('\n\x1b[32m+ Expected (snapshot)\x1b[0m');
  console.log('\x1b[31m- Actual (current)\x1b[0m\n');
  
  const maxLines = Math.max(expectedLines.length, actualLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const expectedLine = expectedLines[i] ?? '';
    const actualLine = actualLines[i] ?? '';
    
    if (expectedLine === actualLine) {
      console.log(`  ${expectedLine}`);
    } else {
      if (expectedLine) {
        console.log(`\x1b[32m+ ${expectedLine}\x1b[0m`);
      }
      if (actualLine) {
        console.log(`\x1b[31m- ${actualLine}\x1b[0m`);
      }
    }
  }
  console.log();
}

async function main() {
  const updateMode = process.argv.includes('--update');
  
  try {
    const output = await runTests();
    const gasTable = extractGasTable(output);
    const gasStatsSnapshotPath = getSnapshotPath(GAS_STATS_SNAPSHOT_FILE);
    
    if (updateMode) {
      writeFileSync(gasStatsSnapshotPath, gasTable);
      console.log('Snapshot updated');
      return;
    }
    
    if (!existsSync(gasStatsSnapshotPath)) {
      writeFileSync(gasStatsSnapshotPath, gasTable);
      console.log('Initial snapshot created');
      return;
    }
    
    const saved = readFileSync(gasStatsSnapshotPath, 'utf8');
    if (gasTable === saved) {
      console.log('Snapshot matches');
    } else {
      showColorizedDiff(saved, gasTable);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();