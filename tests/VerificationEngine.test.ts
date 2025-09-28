import { describe, it, expect, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

interface Verification {
  referenceHash: Uint8Array;
  verified: boolean;
  timestamp: number;
  verifier: string;
  similarityScore: number;
}

interface VerificationMetadata {
  batchId: string;
  manufacturer: string;
  status: boolean;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class VerificationEngineMock {
  state: {
    contractAdmin: string;
    regulator: string;
    verificationThreshold: number;
    authorityContract: string | null;
    verifications: Map<string, Verification>;
    verificationMetadata: Map<string, VerificationMetadata>;
  } = {
    contractAdmin: "ST1ADMIN",
    regulator: "ST1REG",
    verificationThreshold: 90,
    authorityContract: null,
    verifications: new Map(),
    verificationMetadata: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1REG";

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      contractAdmin: "ST1ADMIN",
      regulator: "ST1REG",
      verificationThreshold: 90,
      authorityContract: null,
      verifications: new Map(),
      verificationMetadata: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1REG";
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") return { ok: false, value: false };
    if (this.state.authorityContract !== null) return { ok: false, value: false };
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setVerificationThreshold(newThreshold: number): Result<boolean> {
    if (this.caller !== this.state.contractAdmin) return { ok: false, value: false };
    if (newThreshold < 80 || newThreshold > 100) return { ok: false, value: false };
    this.state.verificationThreshold = newThreshold;
    return { ok: true, value: true };
  }

  setRegulator(newRegulator: string): Result<boolean> {
    if (this.caller !== this.state.contractAdmin) return { ok: false, value: false };
    if (newRegulator === "SP000000000000000000002Q6VF78") return { ok: false, value: false };
    this.state.regulator = newRegulator;
    return { ok: true, value: true };
  }

  verifyBiosimilar(
    biosimilarHash: Uint8Array,
    referenceHash: Uint8Array,
    batchId: string,
    manufacturer: string
  ): Result<boolean> {
    const biosimilarKey = Buffer.from(biosimilarHash).toString("hex");
    if (this.caller !== this.state.regulator) return { ok: false, value: false };
    if (biosimilarHash.length === 0 || referenceHash.length === 0) return { ok: false, value: false };
    if (!batchId || batchId.length > 50 || !manufacturer || manufacturer.length > 100) return { ok: false, value: false };
    if (this.state.verifications.has(biosimilarKey)) return { ok: false, value: false };
    if (!this.state.authorityContract) return { ok: false, value: false };
    const score = Buffer.from(biosimilarHash).equals(Buffer.from(referenceHash)) ? 100 : 95;
    if (score < this.state.verificationThreshold) return { ok: false, value: false };
    this.state.verifications.set(biosimilarKey, {
      referenceHash,
      verified: true,
      timestamp: this.blockHeight,
      verifier: this.caller,
      similarityScore: score,
    });
    this.state.verificationMetadata.set(biosimilarKey, { batchId, manufacturer, status: true });
    return { ok: true, value: true };
  }

  updateVerificationStatus(biosimilarHash: Uint8Array, newStatus: boolean): Result<boolean> {
    const biosimilarKey = Buffer.from(biosimilarHash).toString("hex");
    if (this.caller !== this.state.regulator) return { ok: false, value: false };
    if (!this.state.verificationMetadata.has(biosimilarKey)) return { ok: false, value: false };
    const metadata = this.state.verificationMetadata.get(biosimilarKey)!;
    this.state.verificationMetadata.set(biosimilarKey, { ...metadata, status: newStatus });
    return { ok: true, value: true };
  }

  getVerification(biosimilarHash: Uint8Array): Verification | null {
    return this.state.verifications.get(Buffer.from(biosimilarHash).toString("hex")) || null;
  }

  getVerificationMetadata(biosimilarHash: Uint8Array): VerificationMetadata | null {
    return this.state.verificationMetadata.get(Buffer.from(biosimilarHash).toString("hex")) || null;
  }

  getVerificationThreshold(): Result<number> {
    return { ok: true, value: this.state.verificationThreshold };
  }
}

describe("VerificationEngine", () => {
  let contract: VerificationEngineMock;
  const biosimilarHash = new Uint8Array(32).fill(1);
  const referenceHash = new Uint8Array(32).fill(1);

  beforeEach(() => {
    contract = new VerificationEngineMock();
    contract.reset();
  });

  it("verifies biosimilar successfully", () => {
    contract.setAuthorityContract("ST2AUTH");
    const result = contract.verifyBiosimilar(biosimilarHash, referenceHash, "BATCH123", "PharmaCorp");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const verification = contract.getVerification(biosimilarHash);
    expect(verification).toEqual({
      referenceHash,
      verified: true,
      timestamp: 0,
      verifier: "ST1REG",
      similarityScore: 100,
    });
    const metadata = contract.getVerificationMetadata(biosimilarHash);
    expect(metadata).toEqual({ batchId: "BATCH123", manufacturer: "PharmaCorp", status: true });
  });

  it("rejects unauthorized verifier", () => {
    contract.setAuthorityContract("ST2AUTH");
    contract.caller = "ST2FAKE";
    const result = contract.verifyBiosimilar(biosimilarHash, referenceHash, "BATCH123", "PharmaCorp");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects duplicate verification", () => {
    contract.setAuthorityContract("ST2AUTH");
    contract.verifyBiosimilar(biosimilarHash, referenceHash, "BATCH123", "PharmaCorp");
    const result = contract.verifyBiosimilar(biosimilarHash, referenceHash, "BATCH456", "PharmaCorp");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects invalid hash", () => {
    contract.setAuthorityContract("ST2AUTH");
    const result = contract.verifyBiosimilar(new Uint8Array(0), referenceHash, "BATCH123", "PharmaCorp");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects verification without authority contract", () => {
    const result = contract.verifyBiosimilar(biosimilarHash, referenceHash, "BATCH123", "PharmaCorp");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects invalid metadata", () => {
    contract.setAuthorityContract("ST2AUTH");
    const result = contract.verifyBiosimilar(biosimilarHash, referenceHash, "", "PharmaCorp");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("updates verification status successfully", () => {
    contract.setAuthorityContract("ST2AUTH");
    contract.verifyBiosimilar(biosimilarHash, referenceHash, "BATCH123", "PharmaCorp");
    const result = contract.updateVerificationStatus(biosimilarHash, false);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const metadata = contract.getVerificationMetadata(biosimilarHash);
    expect(metadata?.status).toBe(false);
  });

  it("rejects status update for non-existent biosimilar", () => {
    contract.setAuthorityContract("ST2AUTH");
    const result = contract.updateVerificationStatus(biosimilarHash, false);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets verification threshold successfully", () => {
    contract.caller = "ST1ADMIN";
    const result = contract.setVerificationThreshold(95);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.getVerificationThreshold().value).toBe(95);
  });

  it("rejects invalid threshold", () => {
    contract.caller = "ST1ADMIN";
    const result = contract.setVerificationThreshold(70);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets regulator successfully", () => {
    contract.caller = "ST1ADMIN";
    const result = contract.setRegulator("ST2REG");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.regulator).toBe("ST2REG");
  });
});