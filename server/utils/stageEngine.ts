export const STAGE_ORDER = [
  'Submitted',
  'Shortlisted',
  'Interview',
  'Training',
  'Final Decision',
] as const;

export type ApplicationStage = typeof STAGE_ORDER[number];

export const TERMINAL_STATUSES = [
  'Rejected',
  'Interview Failed',
  'Final Hired',
  'Final Rejected',
  'Retreated',
];

export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.includes(status);
}

// Valid transitions encoded as "currentStage:currentStatus:newStage:newStatus"
// 'Retreated' is special — allowed from any non-terminal state (stage stays the same)
const VALID_TRANSITIONS = new Set([
  // Submitted stage
  'Submitted:New:Submitted:In Review',
  'Submitted:In Review:Shortlisted:Qualified',
  'Submitted:In Review:Submitted:Rejected',

  // Shortlisted stage
  'Shortlisted:Qualified:Interview:Interview Scheduled',
  'Shortlisted:Qualified:Shortlisted:Rejected',

  // Interview stage
  'Interview:Interview Scheduled:Interview:Interview Completed',
  'Interview:Interview Completed:Training:Approved',
  'Interview:Interview Completed:Interview:Interview Failed',

  // Training stage transitions are managed exclusively by the training module endpoints.
  // They are intentionally excluded here so the generic stage transition endpoint
  // cannot modify applications in the Training stage.

  // Final Decision stage
  'Final Decision:Passed:Final Decision:Final Rejected',
]);

/**
 * Returns true if the given stage is exclusively managed by the training module.
 * The generic /applications/:id/stage endpoint must reject transitions from this stage.
 */
export function isTrainingManagedStage(stage: string): boolean {
  return stage === 'Training';
}

export interface StageTransitionOptions {
  retrainingCount?: number;
  maxRetrainingCount?: number;
}

/**
 * Validates a stage transition.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateStageTransition(
  currentStage: string,
  currentStatus: string,
  newStage: string,
  newStatus: string,
  options?: StageTransitionOptions
): string | null {
  // Cannot transition from a terminal state
  if (isTerminalStatus(currentStatus)) {
    return `لا يمكن تغيير حالة طلب في حالة نهائية: ${currentStatus}`;
  }

  // 'Retreated' can be set from any non-terminal state (stage must remain the same)
  if (newStatus === 'Retreated') {
    if (newStage !== currentStage) {
      return 'يجب أن تبقى المرحلة كما هي عند تعيين حالة "انسحاب"';
    }
    return null;
  }

  // Check retraining limit
  if (newStatus === 'Retraining' && options) {
    const count = options.retrainingCount ?? 0;
    const max = options.maxRetrainingCount ?? 1;
    if (count >= max) {
      return `تم استنفاد الحد الأقصى لإعادة التدريب (${max})`;
    }
  }

  const key = `${currentStage}:${currentStatus}:${newStage}:${newStatus}`;
  if (!VALID_TRANSITIONS.has(key)) {
    return `انتقال غير صالح: ${currentStage}/${currentStatus} → ${newStage}/${newStatus}`;
  }

  return null;
}
