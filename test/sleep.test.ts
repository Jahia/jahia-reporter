import { sleep } from '../src/utils/sleep.js';

describe('sleep', () => {
  beforeEach(() => {
    // Clear any timer mocks before each test
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  afterEach(() => {
    // Restore timers after each test
    jest.useRealTimers();
  });

  it('should be a function that accepts a number parameter', () => {
    expect(typeof sleep).toBe('function');
    expect(sleep.length).toBe(1);
  });

  it('should return a Promise', () => {
    const result = sleep(100);
    expect(result).toBeInstanceOf(Promise);

    // Clean up the promise
    return result;
  });

  it('should resolve after the specified number of milliseconds', async () => {
    jest.useFakeTimers();

    const sleepPromise = sleep(100);

    // Fast-forward time by 100ms
    jest.advanceTimersByTime(100);

    await sleepPromise;

    // Verify that the promise resolves
    expect(sleepPromise).resolves.toBeUndefined();

    jest.useRealTimers();
  });

  it('should resolve immediately when called with 0 milliseconds', async () => {
    jest.useFakeTimers();

    const sleepPromise = sleep(0);

    // Advance timers by 0 should resolve immediately
    jest.advanceTimersByTime(0);

    await sleepPromise;

    expect(sleepPromise).resolves.toBeUndefined();

    jest.useRealTimers();
  });

  it('should handle negative values gracefully', async () => {
    jest.useFakeTimers();

    const sleepPromise = sleep(-100);

    // setTimeout typically treats negative values as 0 or immediate
    jest.advanceTimersByTime(0);

    await sleepPromise;

    expect(sleepPromise).resolves.toBeUndefined();

    jest.useRealTimers();
  });

  it('should resolve with undefined', async () => {
    jest.useFakeTimers();

    const sleepPromise = sleep(50);
    jest.advanceTimersByTime(50);

    const result = await sleepPromise;

    expect(result).toBeUndefined();

    jest.useRealTimers();
  });

  it('should work with multiple concurrent sleep calls', async () => {
    jest.useFakeTimers();

    const sleep1 = sleep(100);
    const sleep2 = sleep(200);
    const sleep3 = sleep(50);

    // Advance by 50ms - only sleep3 should resolve
    jest.advanceTimersByTime(50);

    await expect(sleep3).resolves.toBeUndefined();

    // Advance by another 50ms (total 100ms) - sleep1 should resolve
    jest.advanceTimersByTime(50);

    await expect(sleep1).resolves.toBeUndefined();

    // Advance by another 100ms (total 200ms) - sleep2 should resolve
    jest.advanceTimersByTime(100);

    await expect(sleep2).resolves.toBeUndefined();

    jest.useRealTimers();
  });

  it('should work with very small delay values', async () => {
    jest.useFakeTimers();

    const sleepPromise = sleep(1);
    jest.advanceTimersByTime(1);

    await sleepPromise;

    expect(sleepPromise).resolves.toBeUndefined();

    jest.useRealTimers();
  });

  it('should work with large delay values', async () => {
    jest.useFakeTimers();

    const largeDelay = 1_000_000; // 1 million milliseconds
    const sleepPromise = sleep(largeDelay);

    jest.advanceTimersByTime(largeDelay);

    await sleepPromise;

    expect(sleepPromise).resolves.toBeUndefined();

    jest.useRealTimers();
  });

  it('should handle decimal values', async () => {
    jest.useFakeTimers();

    const sleepPromise = sleep(100.5);
    jest.advanceTimersByTime(100.5);

    await sleepPromise;

    expect(sleepPromise).resolves.toBeUndefined();

    jest.useRealTimers();
  });

  it('should be usable in async/await context', async () => {
    jest.useFakeTimers();

    const testAsyncFunction = async () => {
      await sleep(100);
      return 'completed';
    };

    const resultPromise = testAsyncFunction();
    jest.advanceTimersByTime(100);

    const result = await resultPromise;
    expect(result).toBe('completed');

    jest.useRealTimers();
  });

  it('should be usable in Promise.then() context', async () => {
    jest.useFakeTimers();

    let resolved = false;
    const promise = sleep(100).then(() => {
      resolved = true;
      return 'done';
    });

    expect(resolved).toBe(false);

    jest.advanceTimersByTime(100);

    const result = await promise;
    expect(resolved).toBe(true);
    expect(result).toBe('done');

    jest.useRealTimers();
  });

  it('should handle edge case with Infinity', async () => {
    jest.useFakeTimers();

    const sleepPromise = sleep(Number.POSITIVE_INFINITY);

    // setTimeout with Infinity typically behaves as immediate execution
    jest.advanceTimersByTime(0);

    await sleepPromise;

    expect(sleepPromise).resolves.toBeUndefined();

    jest.useRealTimers();
  });

  it('should work correctly with real timers for a quick integration test', async () => {
    // Using real timers with a very small delay to ensure the function works
    jest.useRealTimers();

    const start = performance.now();
    await sleep(10); // Very small delay for real test
    const end = performance.now();

    // Should have taken at least 10ms (allowing for some variance)
    expect(end - start).toBeGreaterThanOrEqual(8);
  });
});
