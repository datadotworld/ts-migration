#!/usr/bin/env node

/**
 * This script runs ts-migration with memory profiling.
 * 
 * Run with:
 * node --max-old-space-size=8192 --expose-gc run-with-memory-profile.js ignore-errors --project "/path/to/project" --removeExisting --includeJSX
 */

const { execSync } = require('child_process');
const { join } = require('path');

// Make global.gc available for manual garbage collection if --expose-gc flag is set
if (global.gc) {
  console.log('Garbage collection is available');
}

// Log initial memory state
console.log(`
Node.js memory settings:
  Max heap size: ${process.argv.includes('--max-old-space-size') ? process.argv[process.argv.indexOf('--max-old-space-size') + 1] : 'default'} MB
  Initial heap used: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB
  Initial heap total: ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB
  Memory limit: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB
`);

// Set up interval to log memory usage during execution
const memoryMonitorInterval = setInterval(() => {
  const memoryUsage = process.memoryUsage();
  console.log(`
Memory usage:
  Heap used: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB
  Heap total: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB 
  External: ${Math.round(memoryUsage.external / 1024 / 1024)} MB
  RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)} MB
`);
}, 10000); // Log every 10 seconds

// Handle process errors and cleanup
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  clearInterval(memoryMonitorInterval);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  clearInterval(memoryMonitorInterval);
  process.exit(1);
});

// Extract the original command-line arguments, removing the Node.js specific flags
const nodeArgs = ['--max-old-space-size', '--expose-gc'];
const filteredArgs = process.argv.slice(2).filter((arg, index, args) => {
  if (nodeArgs.includes(arg)) {
    // Skip this arg and the next one (its value)
    return false;
  }
  const prevArg = index > 0 ? args[index - 1] : null;
  if (prevArg && nodeArgs.includes(prevArg)) {
    // Skip the value after a Node.js flag
    return false;
  }
  return true;
});

// Run ts-migration with the remaining arguments
const cliPath = join(__dirname, 'src/cli.ts');
const startTime = Date.now();

console.log(`Running ts-migration with arguments: ${filteredArgs.join(' ')}`);

try {
  // Import and run the cli directly
  process.argv = [process.argv[0], cliPath, ...filteredArgs];
  
  // Use ts-node to run the TypeScript file
  require('ts-node').register();
  require(cliPath);
  
  // Add a completion handler to clean up the interval
  process.on('exit', () => {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\nCompleted in ${duration}s`);
    
    const finalMemory = process.memoryUsage();
    console.log(`
Final memory state:
  Heap used: ${Math.round(finalMemory.heapUsed / 1024 / 1024)} MB
  Heap total: ${Math.round(finalMemory.heapTotal / 1024 / 1024)} MB
  External: ${Math.round(finalMemory.external / 1024 / 1024)} MB
  RSS: ${Math.round(finalMemory.rss / 1024 / 1024)} MB
`);
    
    clearInterval(memoryMonitorInterval);
  });
} catch (error) {
  console.error('Error running ts-migration:', error);
  clearInterval(memoryMonitorInterval);
  process.exit(1);
}