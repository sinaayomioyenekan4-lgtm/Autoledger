import { describe, it, expect, beforeEach } from 'vitest';

// Mock contract state and types
interface VehicleNFT {
  vin: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  owner: string;
  createdAt: number;
  lastUpdated: number;
}

interface Event {
  tokenId: number;
  eventType: string;
  initiator: string;
  timestamp: number;
  details: string;
}

interface MockContract {
  admin: string;
  oracle: string;
  paused: boolean;
  tokenIdCounter: number;
  vehicleNfts: Map<string, VehicleNFT>;
  tokenOwners: Map<string, { owner: string }>;
  approvedOperators: Map<string, { approved: boolean }>;
  events: Map<string, Event>;
  eventCounter: number;
  blockHeight: number;

  setAdmin(caller: string, newAdmin: string): { value: boolean } | { error: number };
  setOracle(caller: string, newOracle: string): { value: boolean } | { error: number };
  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number };
  mintNft(
    caller: string,
    vin: string,
    make: string,
    model: string,
    year: number,
    mileage: number,
    recipient: string
  ): { value: number } | { error: number };
  updateMetadata(
    caller: string,
    tokenId: number,
    mileage: number,
    newVin?: string,
    newMake?: string,
    newModel?: string,
    newYear?: number
  ): { value: boolean } | { error: number };
  transferNft(caller: string, tokenId: number, recipient: string): { value: boolean } | { error: number };
  approveOperator(caller: string, tokenId: number, operator: string): { value: boolean } | { error: number };
  revokeOperator(caller: string, tokenId: number, operator: string): { value: boolean } | { error: number };
}

const mockContract: MockContract = {
  admin: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  oracle: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  paused: false,
  tokenIdCounter: 0,
  vehicleNfts: new Map(),
  tokenOwners: new Map(),
  approvedOperators: new Map(),
  events: new Map(),
  eventCounter: 0,
  blockHeight: 100,

  setAdmin(caller: string, newAdmin: string) {
    if (caller !== this.admin) return { error: 100 };
    if (newAdmin === 'SP000000000000000000002Q6VF78') return { error: 102 };
    this.admin = newAdmin;
    return { value: true };
  },

  setOracle(caller: string, newOracle: string) {
    if (caller !== this.admin) return { error: 100 };
    if (newOracle === 'SP000000000000000000002Q6VF78') return { error: 102 };
    this.oracle = newOracle;
    return { value: true };
  },

  setPaused(caller: string, pause: boolean) {
    if (caller !== this.admin) return { error: 100 };
    this.paused = pause;
    return { value: true };
  },

  mintNft(caller: string, vin: string, make: string, model: string, year: number, mileage: number, recipient: string) {
    if (caller !== this.admin && caller !== this.oracle) return { error: 100 };
    if (this.paused) return { error: 101 };
    if (recipient === 'SP000000000000000000002Q6VF78') return { error: 102 };
    if (vin.length === 0 || make.length === 0 || model.length === 0 || year <= 1900) return { error: 105 };
    const tokenId = this.tokenIdCounter;
    if (this.vehicleNfts.has(String(tokenId))) return { error: 103 };
    this.vehicleNfts.set(String(tokenId), {
      vin,
      make,
      model,
      year,
      mileage,
      owner: recipient,
      createdAt: this.blockHeight,
      lastUpdated: this.blockHeight,
    });
    this.tokenOwners.set(String(tokenId), { owner: recipient });
    this.events.set(String(this.eventCounter), {
      tokenId,
      eventType: 'MINT',
      initiator: caller,
      timestamp: this.blockHeight,
      details: `Minted to ${recipient}`,
    });
    this.eventCounter += 1;
    this.tokenIdCounter += 1;
    return { value: tokenId };
  },

  updateMetadata(caller: string, tokenId: number, mileage: number, newVin?: string, newMake?: string, newModel?: string, newYear?: number) {
    if (caller !== this.admin && caller !== this.oracle) return { error: 100 };
    if (this.paused) return { error: 101 };
    if (mileage < 0) return { error: 107 };
    const nft = this.vehicleNfts.get(String(tokenId));
    if (!nft) return { error: 104 };
    this.vehicleNfts.set(String(tokenId), {
      vin: newVin || nft.vin,
      make: newMake || nft.make,
      model: newModel || nft.model,
      year: newYear || nft.year,
      mileage,
      owner: nft.owner,
      createdAt: nft.createdAt,
      lastUpdated: this.blockHeight,
    });
    this.events.set(String(this.eventCounter), {
      tokenId,
      eventType: 'UPDATE_METADATA',
      initiator: caller,
      timestamp: this.blockHeight,
      details: 'Updated vehicle metadata',
    });
    this.eventCounter += 1;
    return { value: true };
  },

  transferNft(caller: string, tokenId: number, recipient: string) {
    if (this.paused) return { error: 101 };
    if (recipient === 'SP000000000000000000002Q6VF78') return { error: 102 };
    const nft = this.vehicleNfts.get(String(tokenId));
    if (!nft) return { error: 104 };
    const isApproved = this.approvedOperators.get(`${tokenId}-${caller}`)?.approved || false;
    if (caller !== nft.owner && !isApproved) return { error: 100 };
    this.vehicleNfts.set(String(tokenId), { ...nft, owner: recipient, lastUpdated: this.blockHeight });
    this.tokenOwners.set(String(tokenId), { owner: recipient });
    this.approvedOperators.delete(`${tokenId}-${caller}`);
    this.events.set(String(this.eventCounter), {
      tokenId,
      eventType: 'TRANSFER',
      initiator: caller,
      timestamp: this.blockHeight,
      details: `Transferred to ${recipient}`,
    });
    this.eventCounter += 1;
    return { value: true };
  },

  approveOperator(caller: string, tokenId: number, operator: string) {
    if (this.paused) return { error: 101 };
    if (operator === 'SP000000000000000000002Q6VF78') return { error: 102 };
    const nft = this.vehicleNfts.get(String(tokenId));
    if (!nft) return { error: 104 };
    if (caller !== nft.owner) return { error: 100 };
    this.approvedOperators.set(`${tokenId}-${operator}`, { approved: true });
    this.events.set(String(this.eventCounter), {
      tokenId,
      eventType: 'APPROVE',
      initiator: caller,
      timestamp: this.blockHeight,
      details: `Approved operator ${operator}`,
    });
    this.eventCounter += 1;
    return { value: true };
  },

  revokeOperator(caller: string, tokenId: number, operator: string) {
    if (this.paused) return { error: 101 };
    const nft = this.vehicleNfts.get(String(tokenId));
    if (!nft) return { error: 104 };
    if (caller !== nft.owner) return { error: 100 };
    this.approvedOperators.delete(`${tokenId}-${operator}`);
    this.events.set(String(this.eventCounter), {
      tokenId,
      eventType: 'REVOKE',
      initiator: caller,
      timestamp: this.blockHeight,
      details: `Revoked operator ${operator}`,
    });
    this.eventCounter += 1;
    return { value: true };
  },
};

describe('Vehicle NFT Contract', () => {
  beforeEach(() => {
    mockContract.admin = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    mockContract.oracle = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    mockContract.paused = false;
    mockContract.tokenIdCounter = 0;
    mockContract.vehicleNfts = new Map();
    mockContract.tokenOwners = new Map();
    mockContract.approvedOperators = new Map();
    mockContract.events = new Map();
    mockContract.eventCounter = 0;
    mockContract.blockHeight = 100;
  });

  it('should mint a new vehicle NFT', () => {
    const result = mockContract.mintNft(
      mockContract.admin,
      '1HGCM82633A123456',
      'Honda',
      'Civic',
      2020,
      50000,
      'ST2CY5...'
    );
    expect(result).toEqual({ value: 0 });
    expect(mockContract.vehicleNfts.get('0')).toEqual({
      vin: '1HGCM82633A123456',
      make: 'Honda',
      model: 'Civic',
      year: 2020,
      mileage: 50000,
      owner: 'ST2CY5...',
      createdAt: 100,
      lastUpdated: 100,
    });
    expect(mockContract.tokenOwners.get('0')).toEqual({ owner: 'ST2CY5...' });
    expect(mockContract.events.get('0')).toEqual({
      tokenId: 0,
      eventType: 'MINT',
      initiator: mockContract.admin,
      timestamp: 100,
      details: 'Minted to ST2CY5...',
    });
  });

  it('should prevent minting by non-admin or non-oracle', () => {
    const result = mockContract.mintNft(
      'ST3NB...',
      '1HGCM82633A123456',
      'Honda',
      'Civic',
      2020,
      50000,
      'ST2CY5...'
    );
    expect(result).toEqual({ error: 100 });
  });

  it('should prevent minting with invalid metadata', () => {
    const result = mockContract.mintNft(mockContract.admin, '', 'Honda', 'Civic', 2020, 50000, 'ST2CY5...');
    expect(result).toEqual({ error: 105 });
  });

  it('should update metadata by oracle', () => {
    mockContract.mintNft(mockContract.admin, '1HGCM82633A123456', 'Honda', 'Civic', 2020, 50000, 'ST2CY5...');
    const result = mockContract.updateMetadata(mockContract.oracle, 0, 60000, '2HGCM82633A123457', 'Toyota', 'Corolla', 2021);
    expect(result).toEqual({ value: true });
    expect(mockContract.vehicleNfts.get('0')).toEqual({
      vin: '2HGCM82633A123457',
      make: 'Toyota',
      model: 'Corolla',
      year: 2021,
      mileage: 60000,
      owner: 'ST2CY5...',
      createdAt: 100,
      lastUpdated: 100,
    });
  });

  it('should transfer NFT by owner', () => {
    mockContract.mintNft(mockContract.admin, '1HGCM82633A123456', 'Honda', 'Civic', 2020, 50000, 'ST2CY5...');
    const result = mockContract.transferNft('ST2CY5...', 0, 'ST3NB...');
    expect(result).toEqual({ value: true });
    expect(mockContract.vehicleNfts.get('0')?.owner).toBe('ST3NB...');
    expect(mockContract.tokenOwners.get('0')).toEqual({ owner: 'ST3NB...' });
  });

  it('should transfer NFT by approved operator', () => {
    mockContract.mintNft(mockContract.admin, '1HGCM82633A123456', 'Honda', 'Civic', 2020, 50000, 'ST2CY5...');
    mockContract.approveOperator('ST2CY5...', 0, 'ST4RE...');
    const result = mockContract.transferNft('ST4RE...', 0, 'ST3NB...');
    expect(result).toEqual({ value: true });
    expect(mockContract.vehicleNfts.get('0')?.owner).toBe('ST3NB...');
  });

  it('should prevent transfer by unauthorized caller', () => {
    mockContract.mintNft(mockContract.admin, '1HGCM82633A123456', 'Honda', 'Civic', 2020, 50000, 'ST2CY5...');
    const result = mockContract.transferNft('ST3NB...', 0, 'ST4RE...');
    expect(result).toEqual({ error: 100 });
  });

  it('should prevent actions when paused', () => {
    mockContract.setPaused(mockContract.admin, true);
    const mintResult = mockContract.mintNft(
      mockContract.admin,
      '1HGCM82633A123456',
      'Honda',
      'Civic',
      2020,
      50000,
      'ST2CY5...'
    );
    expect(mintResult).toEqual({ error: 101 });
    const transferResult = mockContract.transferNft('ST2CY5...', 0, 'ST3NB...');
    expect(transferResult).toEqual({ error: 101 });
  });

  it('should approve and revoke operator', () => {
    mockContract.mintNft(mockContract.admin, '1HGCM82633A123456', 'Honda', 'Civic', 2020, 50000, 'ST2CY5...');
    const approveResult = mockContract.approveOperator('ST2CY5...', 0, 'ST4RE...');
    expect(approveResult).toEqual({ value: true });
    expect(mockContract.approvedOperators.get('0-ST4RE...')).toEqual({ approved: true });
    const revokeResult = mockContract.revokeOperator('ST2CY5...', 0, 'ST4RE...');
    expect(revokeResult).toEqual({ value: true });
    expect(mockContract.approvedOperators.get('0-ST4RE...')).toBeUndefined();
  });
});