export class InsufficientBalanceError extends Error {
  constructor(participantId: string, requested: number, available: number) {
    super(
      `Participant ${participantId} has insufficient balance: requested ${requested}, available ${available}`,
    );
    this.name = "InsufficientBalanceError";
  }
}

export class CrossAccountTransferError extends Error {
  constructor() {
    super("Transfers are only allowed between participants of the same account");
    this.name = "CrossAccountTransferError";
  }
}

export class InsufficientPointsBalanceError extends Error {
  constructor(participantId: string, requested: number, available: number) {
    super(
      `Participant ${participantId} has insufficient points: requested ${requested}, available ${available}`,
    );
    this.name = "InsufficientPointsBalanceError";
  }
}
