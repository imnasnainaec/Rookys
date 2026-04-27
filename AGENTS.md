# AGENTS.md

This repository uses phase-locked delivery. Agents and contributors must follow this policy.

## 1) Phase-Lock Rule (Hard Stop)

- Work is organized into numbered phases in `PROJECT_PLAN_CHECKLIST.md`.
- No one may start Phase `N+1` until all required items in Phase `N` are completed.
- Advancing to the next phase requires BOTH:
  - explicit user instruction to proceed, and
  - a recorded review outcome for the current phase.
- If either condition is missing, stop and request direction.

## 2) Required Deliverable Format Per Phase

Every phase handoff must include:

- Changed files list.
- Tests run (or reason tests were not run).
- Unresolved risks/issues.
- Review checklist status and gate result.

## 3) Commit Protocol

- Every completed checklist item must be captured in at least one git commit before phase review.
- Do not batch unrelated checklist items into a single untraceable commit.
- Update `PROJECT_PLAN_CHECKLIST.md` at the end of each completed checklist item.
- Include commit hashes in checklist history where practical.

## 4) Canonical Progress Source

- `PROJECT_PLAN_CHECKLIST.md` is the canonical in-repo source of truth for resumability.
- If chat notes and repository checklist diverge, see if user wants to update the checklist.
- Do not change the checklist without permission.

## 5) Stop Conditions

Stop immediately and request user clarification when any of the following occur:

- Ambiguous or conflicting requirement.
- Failing core tests that block phase acceptance.
- Mismatch between implementation behavior and `Rookys-rules.txt`.

## 6) Review Gates

- A review gate exists at the end of each phase (G0, G1, ...).
- Gate status must be explicitly recorded as one of:
  - `Approved`
  - `Approved with follow-ups`
  - `Rejected`
- No phase advancement is allowed before gate status is recorded.

## 7) Scope Order Constraint

- Classic-mode P2P completion (Phase 4) is required before variant implementation work.
- Variant implementation is blocked until G4 is approved.

## 8) Licensing Constraint

- Original game code/content in this repository is proprietary and all rights reserved.
- Third-party dependencies remain under their own licenses.
- Maintain `THIRD_PARTY_LICENSES.md` for attribution workflow and release-time verification.
