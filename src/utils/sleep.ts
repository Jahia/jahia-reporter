// Small utility to pause execution for a given number of milliseconds
export const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
