// Suppress console.log output during tests to keep test output clean
// Console.error and console.warn are preserved for important messages

const originalLog = console.log;

beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalLog;
});
