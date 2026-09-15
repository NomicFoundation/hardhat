# Skill Creation Rules

When creating or updating a skill:

## 1. Be concise and clear

Include only instructions that change the model’s decisions or improve its output. Preserve necessary context; omit generic advice, explanations of tasks the model already understands, and anything the model can reliably infer from the task, the codebase, or the other instructions.

Keep commands separate from rationale and failure handling; use code blocks for command sequences and lists or tables for parallel items.

## 2. Be model and agent independent

Skills MUST be written for use across LLMs and agent platforms, rather than targeting Claude, Codex, or another specific product. Describe required capabilities generically. Document essential tool dependencies without assuming a particular provider or agent runtime.

## 3. Define the scope

State what the skill does and when to use it. Include exclusions only when they prevent likely misuse.

## 4. Define success

Specify required inputs, expected outputs, and observable acceptance criteria. Constrain format and content only where they matter.

## 5. Specify the required consistency

Define what must remain stable and what may vary. Use deterministic code for operations that require exact reproducibility.

## 6. Handle meaningful uncertainty

Define defaults or clarification conditions where missing or ambiguous information could materially change the result. Do not require questions for routine choices.

## 7. Match strictness to necessity

Distinguish requirements from recommendations and defaults. Prescribe exact steps only when deviation causes a concrete problem. Preserve the user’s intended scope.

## 8. Maintain one authoritative definition

Define each rule in one place and reference it elsewhere when needed. Examples may illustrate rules without adding hidden requirements. Move substantial conditional detail into linked references only when that improves usability.

A reference is a plain document (a rule set, a procedure, a design note) that any skill may link, as often as needed. ALL references MUST live in `.agents/references/`: as a single file directly in that folder when it stands alone (for example `.agents/references/git.md`), or inside a topic subfolder when several related files exist or will be added (for example `.agents/references/dev-environment/db.md`). Link a reference by its repo path, never by a bare name. Rule 9 restricts links to other skills only; it does not apply to references.

## 9. Reference other skills only when required

Do NOT mention another skill unless the skill cannot work without it. When a reference is required, point the agent to the skill file with its repo path (for example `.agents/skills/example-skill/SKILL.md`), never with a bare name or slash command alone, so the agent can open and follow it. Tell the user which skill was linked and why when you add such a reference.

## 10. Empirically validate before declaring readiness

Run the newly created or updated skill with the LLMs and tools intended for use on representative tasks, including relevant failure cases. Evaluate actual outputs and actions against predefined acceptance criteria; reading the instructions or checking file structure alone is insufficient.

If a test fails, fix the skill and repeat the affected tests and relevant regression checks until all acceptance criteria pass. Do not weaken the criteria merely to obtain a pass or turn every isolated failure into a universal rule.

Delete all temporary files created for testing, if any, before finishing, including after failed or interrupted test runs.

Report what was tested, with which models, in which environments, and the results. Limit compatibility claims to what was verified. If testing cannot be completed, identify the blocker and mark the skill as unverified rather than ready. Claim “production-tested” only after actual production validation.

## Independent review loop

If sub-agents are unavailable, the main agent performs the review and checklist itself and explicitly reports that no independent review occurred.

When sub-agents are available, the main agent delegates the final review and completion checklist to a fresh reviewer. Each round uses a new agent with no inherited conversation history; do not resume the previous reviewer.

1. Give the reviewer the current skill and its supporting files, the original request and accepted constraints, these rules, the predefined acceptance criteria, and raw verification evidence with the tested models and environments. Do not provide the author's checklist or previous reviewers' conclusions.
2. The reviewer independently assesses the current files and evidence, runs needed checks, and returns the completion checklist below plus concrete rule violations with locations, evidence, and impact. A passing check counts only for the version it verified. The reviewer does not edit the delivered files; any probes it needs go in a temporary location and are deleted afterwards.
3. The main agent fixes confirmed violations, resolving any disputed finding against the rules and evidence, and reruns affected checks. After edits, spawn a fresh reviewer with the updated files and evidence. Keep the acceptance criteria stable unless the user changes the requirements.
4. Finish when the latest reviewer reports no unresolved violations and all required verification passed for the final version. If verification is blocked, or another round cannot make progress on an unresolved finding, report the blocker and unchecked items instead of repeatedly spawning agents or claiming readiness. Share the latest reviewer's checklist with the user.

## Completion checklist

The reviewer produces this checklist in order. Verify each rule using appropriate evidence: documented review for clarity, scope, and necessity; file and link checks for structural requirements; and representative task runs for behavioral claims. Rule 10 requires actual execution with the intended models and tools; reading the skill alone does not satisfy it. Tick a box (`[x]`) only when the applicable checks passed, and briefly identify the evidence. Otherwise leave it unticked (`[ ]`) and explain whether verification failed, was not run, or was not applicable. One check may support several items.

```markdown
- [ ] 1. Be concise and clear
- [ ] 2. Be model and agent independent
- [ ] 3. Define the scope
- [ ] 4. Define success
- [ ] 5. Specify the required consistency
- [ ] 6. Handle meaningful uncertainty
- [ ] 7. Match strictness to necessity
- [ ] 8. Maintain one authoritative definition
- [ ] 9. Reference other skills only when required
- [ ] 10. Empirically validate before declaring readiness
```
