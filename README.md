# AutoLedger

A blockchain-powered platform for transparent vehicle provenance and maintenance in the automotive industry, enabling buyers, sellers, insurers, and mechanics to access immutable records — reducing fraud in used car sales and insurance claims — all on-chain using Clarity.

---

## Overview

AutoLedger consists of four main smart contracts that together form a decentralized, transparent, and secure ecosystem for vehicle lifecycle management:

1. **Vehicle NFT Contract** – Issues and manages unique NFTs representing vehicles with embedded metadata.
2. **Ownership Transfer Contract** – Handles secure, verified transfers of vehicle ownership.
3. **Maintenance Log Contract** – Records immutable maintenance and repair events.
4. **Oracle Integration Contract** – Connects with off-chain data sources for real-time verification like mileage and accidents.

---

## Features

- **Vehicle NFTs** with tamper-proof metadata for specs, history, and VIN  
- **Secure ownership transfers** with multi-party verification  
- **Immutable maintenance logs** for service history and repairs  
- **Data integration** via oracles for real-world updates like odometer readings  
- **Fraud reduction** through transparent records for buyers and insurers  

---

## Smart Contracts

### Vehicle NFT Contract
- Mint NFTs for vehicles with initial metadata (VIN, make, model, year)
- Update metadata only through authorized functions (e.g., via oracle)
- Transfer NFTs with ownership contract integration

### Ownership Transfer Contract
- Initiate and confirm ownership transfers between parties
- Require signatures or approvals from buyers, sellers, and optionally authorities
- Log transfer history immutably linked to the vehicle NFT

### Maintenance Log Contract
- Append maintenance events (e.g., oil changes, repairs) with timestamps and details
- Verify entries through mechanic or owner authentication
- Query full history for any vehicle NFT

### Oracle Integration Contract
- Fetch and validate off-chain data (e.g., mileage from sensors, accident reports)
- Trigger updates to vehicle NFTs or logs
- Ensure data integrity with secure oracle providers

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started)
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/autoledger.git
   ```
3. Run tests:
    ```bash
    npm test
    ```
4. Deploy contracts:
    ```bash
    clarinet deploy
    ```

## Usage

Each smart contract operates independently but integrates with others for a complete vehicle provenance system.
Refer to individual contract documentation for function calls, parameters, and usage examples.

## License

MIT License