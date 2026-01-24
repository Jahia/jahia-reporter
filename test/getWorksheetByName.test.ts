import { getWorksheetByName } from '../src/utils/spreadsheet/getWorksheetByName.js';

// Mock google-spreadsheet
const mockLoadInfo = jest.fn();
const mockSheetsByIndex = [
  { title: 'Sheet1' },
  { title: 'Services' },
  { title: 'Data' },
];

jest.mock('google-spreadsheet', () => ({
  GoogleSpreadsheet: jest.fn().mockImplementation(() => ({
    loadInfo: mockLoadInfo,
    sheetCount: 3,
    sheetsByIndex: mockSheetsByIndex,
    title: 'Test Spreadsheet',
  })),
}));

// Mock google-auth-library
jest.mock('google-auth-library', () => ({
  JWT: jest.fn().mockImplementation((options) => ({
    email: options.email,
    key: options.key,
    scopes: options.scopes,
  })),
}));

describe('getWorksheetByName', () => {
  const mockLog = jest.fn();
  const validOptions = {
    googleApiKey: Buffer.from('test-api-key').toString('base64'),
    googleClientEmail: 'test@test-project.iam.gserviceaccount.com',
    googleSpreadsheetId: 'spreadsheet-123',
    googleWorksheetName: 'Services',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadInfo.mockResolvedValue(undefined);
  });

  it('should connect to spreadsheet and find worksheet by name', async () => {
    const result = await getWorksheetByName(validOptions, mockLog);

    expect(result).toEqual({ title: 'Services' });
    expect(mockLog).toHaveBeenCalledWith('Connecting to spreadsheet: 1/3');
    expect(mockLog).toHaveBeenCalledWith(
      'Loaded spreadsheet: Test Spreadsheet',
    );
    expect(mockLog).toHaveBeenCalledWith('Reviewing sheet with title: Sheet1');
    expect(mockLog).toHaveBeenCalledWith(
      'Reviewing sheet with title: Services <- SHEET FOUND',
    );
  });

  it('should return null when worksheet is not found', async () => {
    const options = {
      ...validOptions,
      googleWorksheetName: 'NonExistent',
    };

    const result = await getWorksheetByName(options, mockLog);

    expect(result).toBeNull();
    expect(mockLog).toHaveBeenCalledWith(
      'Worksheet with title "NonExistent" not found in spreadsheet "Test Spreadsheet"',
    );
  });

  it('should find the first sheet in the list', async () => {
    const options = {
      ...validOptions,
      googleWorksheetName: 'Sheet1',
    };

    const result = await getWorksheetByName(options, mockLog);

    expect(result).toEqual({ title: 'Sheet1' });
    expect(mockLog).toHaveBeenCalledWith(
      'Reviewing sheet with title: Sheet1 <- SHEET FOUND',
    );
  });

  it('should find the last sheet in the list', async () => {
    const options = {
      ...validOptions,
      googleWorksheetName: 'Data',
    };

    const result = await getWorksheetByName(options, mockLog);

    expect(result).toEqual({ title: 'Data' });
  });

  it('should retry up to 3 times on connection failure', async () => {
    mockLoadInfo
      .mockRejectedValueOnce(new Error('Connection failed'))
      .mockRejectedValueOnce(new Error('Connection failed'))
      .mockResolvedValueOnce(undefined);

    const result = await getWorksheetByName(validOptions, mockLog);

    expect(result).toEqual({ title: 'Services' });
    expect(mockLog).toHaveBeenCalledWith('Connecting to spreadsheet: 1/3');
    expect(mockLog).toHaveBeenCalledWith('Unable to connect to spreadsheet');
    expect(mockLog).toHaveBeenCalledWith('Connecting to spreadsheet: 2/3');
    expect(mockLog).toHaveBeenCalledWith('Connecting to spreadsheet: 3/3');
  });

  it('should return null after all retries fail', async () => {
    mockLoadInfo.mockRejectedValue(new Error('Connection failed'));

    const result = await getWorksheetByName(validOptions, mockLog);

    expect(result).toBeNull();
    expect(mockLog).toHaveBeenCalledWith('Connecting to spreadsheet: 1/3');
    expect(mockLog).toHaveBeenCalledWith('Connecting to spreadsheet: 2/3');
    expect(mockLog).toHaveBeenCalledWith('Connecting to spreadsheet: 3/3');
    // Should have logged 3 "Unable to connect" messages
    expect(
      mockLog.mock.calls.filter(
        (call) => call[0] === 'Unable to connect to spreadsheet',
      ),
    ).toHaveLength(3);
  });

  it('should not retry once connected successfully', async () => {
    mockLoadInfo.mockResolvedValue(undefined);

    await getWorksheetByName(validOptions, mockLog);

    // Should only connect once since it succeeded first try
    expect(
      mockLog.mock.calls.filter((call) =>
        call[0].startsWith('Connecting to spreadsheet:'),
      ),
    ).toHaveLength(1);
  });

  it('should decode base64 API key correctly', async () => {
    const { JWT } = jest.requireMock('google-auth-library');
    const apiKey = 'my-secret-key';
    const options = {
      ...validOptions,
      googleApiKey: Buffer.from(apiKey).toString('base64'),
    };

    await getWorksheetByName(options, mockLog);

    expect(JWT).toHaveBeenCalledWith({
      email: validOptions.googleClientEmail,
      key: apiKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  });

  it('should use correct spreadsheet ID', async () => {
    const { GoogleSpreadsheet } = jest.requireMock('google-spreadsheet');

    await getWorksheetByName(validOptions, mockLog);

    expect(GoogleSpreadsheet).toHaveBeenCalledWith(
      'spreadsheet-123',
      expect.any(Object),
    );
  });
});
