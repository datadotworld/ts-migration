#! /usr/bin/env node

/**
 * ts-migration with memory instrumentation
 */

// Set up memory monitoring
const memoryMonitorInterval = setInterval(() => {
  const memoryUsage = process.memoryUsage();
  console.log(`
~~~ Memory usage:
  Heap used: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB
  Heap total: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB 
  External: ${Math.round(memoryUsage.external / 1024 / 1024)} MB
  RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)} MB
`);
}, 10000); // Log every 10 seconds

// Log initial memory state
console.log(`
~~~ Node.js memory information:
  Initial heap used: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB
  Initial heap total: ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB
  Memory limit: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB
`);

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

// Add a completion handler to clean up the interval
process.on('exit', () => {
  const finalMemory = process.memoryUsage();
  console.log(`
~~~ Final memory state:
  Heap used: ${Math.round(finalMemory.heapUsed / 1024 / 1024)} MB
  Heap total: ${Math.round(finalMemory.heapTotal / 1024 / 1024)} MB
  External: ${Math.round(finalMemory.external / 1024 / 1024)} MB
  RSS: ${Math.round(finalMemory.rss / 1024 / 1024)} MB
`);
  
  clearInterval(memoryMonitorInterval);
});

// Run the CLI
const startTime = Date.now();
require("./dist/cli.js");

// The exit handler above will log the final memory state
