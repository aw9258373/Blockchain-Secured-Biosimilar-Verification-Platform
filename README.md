# 🧬 Biosimilar Verification Platform

Welcome to the Biosimilar Verification Platform, a decentralized solution built on the Stacks blockchain using Clarity smart contracts. This platform ensures transparent, secure, and immutable verification of biosimilars by comparing hashed molecular data against reference drugs, fostering trust among pharmaceutical companies, regulators, and healthcare providers.

## ✨ Features

🔐 **Secure Drug Registration**: Register reference drugs and biosimilars with hashed molecular data.  
✅ **Equivalence Verification**: Compare biosimilars to reference drugs to confirm molecular similarity.  
📝 **Immutable Audit Trail**: Track registration, verification, and updates on the blockchain.  
🛡️ **Role-Based Access**: Restrict actions to authorized manufacturers, regulators, and auditors.  
🔍 **Public Verification**: Allow stakeholders to verify drug authenticity and equivalence.  
🚫 **Fraud Prevention**: Prevent duplicate registrations or unauthorized modifications.  

## 🛠 How It Works

### For Pharmaceutical Companies
1. **Register Reference Drug**:
   - Generate a SHA-256 hash of the reference drug’s molecular data.
   - Call the `register-reference-drug` function with the hash, drug name, and metadata.
   - Store the registration on the blockchain with a timestamp.
2. **Register Biosimilar**:
   - Generate a SHA-256 hash of the biosimilar’s molecular data.
   - Call the `register-biosimilar` function, linking it to a reference drug.
   - Submit metadata (e.g., manufacturing details).

### For Regulators
1. **Verify Equivalence**:
   - Use `verify-biosimilar` to compare the biosimilar’s hash against the reference drug’s hash.
   - Confirm equivalence based on predefined criteria (e.g., hash similarity).
2. **Audit Records**:
   - Access immutable records via `get-drug-details` or `get-audit-trail` to review registration history.

### For Healthcare Providers
1. **Check Authenticity**:
   - Use `verify-drug` to confirm a drug’s registration and equivalence status.
   - Access public metadata for transparency.

### For Auditors
1. **Monitor Compliance**:
   - Use `get-audit-trail` to track all actions (registrations, verifications, updates).
   - Ensure regulatory compliance with immutable records.