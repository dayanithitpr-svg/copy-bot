const { EXECUTION_STATUS } = require('../../models/ExecutionRecord');
const logger = require('../../utils/logger');

// Explicit state transition map
const VALID_TRANSITIONS = {
  [EXECUTION_STATUS.PENDING_VALIDATION]: [
    EXECUTION_STATUS.VALIDATED,
    EXECUTION_STATUS.REJECTED,
    EXECUTION_STATUS.FAILED,
    EXECUTION_STATUS.DUPLICATE
  ],
  [EXECUTION_STATUS.VALIDATED]: [
    EXECUTION_STATUS.BUILDING,
    EXECUTION_STATUS.REJECTED,
    EXECUTION_STATUS.FAILED
  ],
  [EXECUTION_STATUS.BUILDING]: [
    EXECUTION_STATUS.AWAITING_SIGNATURE,
    EXECUTION_STATUS.SIGNED,
    EXECUTION_STATUS.SUBMITTED,
    EXECUTION_STATUS.REJECTED,
    EXECUTION_STATUS.FAILED
  ],
  [EXECUTION_STATUS.AWAITING_SIGNATURE]: [
    EXECUTION_STATUS.SIGNED,
    EXECUTION_STATUS.FAILED,
    EXECUTION_STATUS.REJECTED,
    EXECUTION_STATUS.EXPIRED
  ],
  [EXECUTION_STATUS.SIGNED]: [
    EXECUTION_STATUS.SUBMITTED,
    EXECUTION_STATUS.FAILED
  ],
  [EXECUTION_STATUS.SUBMITTED]: [
    EXECUTION_STATUS.CONFIRMING,
    EXECUTION_STATUS.CONFIRMED,
    EXECUTION_STATUS.FAILED
  ],
  [EXECUTION_STATUS.CONFIRMING]: [
    EXECUTION_STATUS.CONFIRMED,
    EXECUTION_STATUS.FAILED
  ],
  // Terminal states (normally have no outgoing transitions, unless recovery)
  [EXECUTION_STATUS.CONFIRMED]: [],
  [EXECUTION_STATUS.FAILED]: [],
  [EXECUTION_STATUS.REJECTED]: [],
  [EXECUTION_STATUS.DUPLICATE]: [],
  [EXECUTION_STATUS.EXPIRED]: []
};

class ExecutionStateMachine {
  /**
   * Validates if a state transition is permitted
   * @param {string} fromState 
   * @param {string} toState 
   * @returns {boolean}
   */
  static canTransition(fromState, toState) {
    if (!fromState || !toState) return false;
    if (fromState === toState) return true; // Idempotent no-op

    const allowedNextStates = VALID_TRANSITIONS[fromState];
    if (!allowedNextStates) return false;

    return allowedNextStates.includes(toState);
  }

  /**
   * Asserts valid transition, throwing an error if illegal
   * @param {string} fromState 
   * @param {string} toState 
   * @param {string} [recordId]
   */
  static assertTransition(fromState, toState, recordId = '') {
    if (!this.canTransition(fromState, toState)) {
      const msg = `INVALID_STATE_TRANSITION: Cannot transition execution record ${recordId} from '${fromState}' to '${toState}'`;
      logger.error(msg);
      const err = new Error(msg);
      err.code = 'INVALID_STATE_TRANSITION';
      err.statusCode = 400;
      throw err;
    }
    return true;
  }

  /**
   * Returns complete lifecycle diagram data for UI/Docs
   */
  static getLifecycleMap() {
    return VALID_TRANSITIONS;
  }
}

module.exports = ExecutionStateMachine;
