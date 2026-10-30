const answerForm = document.querySelector('#answer-form');
const answerInput = document.querySelector('#answer');
const feedbackMessage = document.querySelector('#feedback-message');
const equation = document.querySelector('#equation');
const equationLeft = document.querySelector('#equation-left');
const equationRight = document.querySelector('#equation-right');
const rewardLayer = document.querySelector('#reward-layer');
const rewardStage = document.querySelector('.reward-stage');
const primaryXp = document.querySelector('.xp-pop');
const successToast = document.querySelector('#success-toast');
const progressTrack = document.querySelector('.progress-track');
const progressHoops = [...document.querySelectorAll('.progress-hoop')];
const checkButton = document.querySelector('#check-answer');
const previewButton = document.querySelector('#preview-reward');
const resetButton = document.querySelector('#reset-prototype');
const epicFinale = document.querySelector('#epic-finale');
const freeFormExperience = document.querySelector('#free-form-experience');
const breakIntoStepsButton = document.querySelector('#break-into-steps');
const questionType = document.querySelector('#question-type');
const questionSupport = document.querySelector('#question-support');
const scaffoldCard = document.querySelector('#scaffold-card');
const scaffoldStepOne = document.querySelector('#scaffold-step-one');
const scaffoldStepTwo = document.querySelector('#scaffold-step-two');

const problems = [
  {
    answer: 5,
    ariaLabel: '3 x plus 5 equals 20',
    left: '3<em>x</em> + 5',
    right: '20',
    steps: [
      'Subtract 5 from both sides: 3x = 15',
      'Divide both sides by 3.',
    ],
  },
  {
    answer: 6,
    ariaLabel: '4 x minus 4 equals 20',
    left: '4<em>x</em> − 4',
    right: '20',
    steps: [
      'Add 4 to both sides: 4x = 24',
      'Divide both sides by 4.',
    ],
  },
  {
    answer: 7,
    ariaLabel: '2 x plus 3 equals 17',
    left: '2<em>x</em> + 3',
    right: '17',
    steps: [
      'Subtract 3 from both sides: 2x = 14',
      'Divide both sides by 2.',
    ],
  },
];

const scoringClasses = [
  'is-scoring',
  'is-scoring-second',
  'is-scoring-third',
];
const lateCorrectClasses = [
  'is-late-correct-first',
  'is-late-correct-second',
  'is-late-correct-third',
];
const rewardTargetClasses = [
  'target-first',
  'target-second',
  'target-third',
];

const maxAttemptsPerProblem = 3;
const roundGoalSolveCount = 2;
const maxMissedProblems = 2;
const potentialRevealDelayMs = 900;
const firstRewardDurationMs = 2300;
const missedRewardDurationMs = 2200;
const finalMissFadeDelayMs = 1400;
const problemResults = Array(problems.length).fill(null);
let currentProblemIndex = 0;
let firstTrySolveCount = 0;
let attemptCount = 0;
let awaitingNextProblem = false;
let roundComplete = false;
let rewardTimeout;
let finalMissFadeTimeout;
let potentialRevealTimeout;
let isScaffoldedMode = false;

function hideEpicFinale() {
  epicFinale.classList.remove('is-visible');
  epicFinale.classList.remove('has-spare-ball-bonus');
  progressTrack.classList.remove('is-spare-ball-bonus');
  epicFinale.setAttribute('aria-hidden', 'true');
}

function clearShotTarget() {
  rewardTargetClasses.forEach((className) => rewardLayer.classList.remove(className));
  progressHoops.forEach((hoop) => {
    hoop.classList.remove('is-shot-target');
    hoop.classList.remove('is-shot-miss');
  });
}

function setShotTarget(isMiss = false, animateTarget = true) {
  clearShotTarget();
  rewardLayer.classList.add(rewardTargetClasses[currentProblemIndex]);
  const targetHoop = progressHoops[currentProblemIndex];
  const targetRect = targetHoop.getBoundingClientRect();
  const layerRect = rewardLayer.getBoundingClientRect();
  const stageLeft = (layerRect.width / 2) - 180;
  const stageTop = (layerRect.height * 0.48) - 265;
  const targetLeft = targetRect.left + (targetRect.width / 2) - layerRect.left - stageLeft;
  const targetRimY = targetRect.top + (targetRect.height * 0.66) - layerRect.top;
  const targetTop = targetRimY - stageTop - 84;
  const shotTravelRatio = isScaffoldedMode ? 0.82 : 0.54;
  const midTargetLeft = 180 + ((targetLeft - 180) * shotTravelRatio);
  const targetScreenX = ((targetRect.left + (targetRect.width / 2) - layerRect.left)
    / layerRect.width) * 100;

  rewardStage.style.setProperty('--target-left', `${targetLeft}px`);
  rewardStage.style.setProperty('--mid-target-left', `${midTargetLeft}px`);
  rewardStage.style.setProperty('--target-top', `${targetTop}px`);
  rewardLayer.style.setProperty('--target-screen-x', `${targetScreenX}%`);
  if (animateTarget) {
    targetHoop.classList.add('is-shot-target');
    targetHoop.classList.toggle('is-shot-miss', isMiss);
  }
}

function syncDifficultyMode() {
  freeFormExperience.classList.toggle('is-scaffolded', isScaffoldedMode);
  rewardLayer.classList.toggle('is-scaffolded-shot', isScaffoldedMode);
  questionType.textContent = isScaffoldedMode ? 'Scaffolded' : 'Free Form';
  questionSupport.textContent = isScaffoldedMode
    ? 'Work through this one step at a time.'
    : 'Show what you know.';
  scaffoldCard.setAttribute('aria-hidden', String(!isScaffoldedMode));
  breakIntoStepsButton.setAttribute('aria-pressed', String(isScaffoldedMode));
  breakIntoStepsButton.classList.toggle('is-active', isScaffoldedMode);
  breakIntoStepsButton.innerHTML = isScaffoldedMode
    ? '<span aria-hidden="true">✓</span> Steps enabled'
    : '<span aria-hidden="true">↳</span> Break into steps';
}

function enterScaffoldedMode() {
  if (isScaffoldedMode || awaitingNextProblem || checkButton.disabled) {
    return;
  }

  isScaffoldedMode = true;
  syncDifficultyMode();
}

function showEpicFinale(showSpareBallBonus = false) {
  hideEpicFinale();
  epicFinale.classList.toggle('has-spare-ball-bonus', showSpareBallBonus);
  progressTrack.classList.toggle('is-spare-ball-bonus', showSpareBallBonus);
  void epicFinale.offsetWidth;
  void progressTrack.offsetWidth;
  epicFinale.setAttribute('aria-hidden', 'false');
  epicFinale.classList.add('is-visible');
}

function clearReward() {
  window.clearTimeout(rewardTimeout);
  window.clearTimeout(finalMissFadeTimeout);
  rewardLayer.classList.remove('is-playing');
  rewardLayer.classList.remove('is-missed');
  clearShotTarget();
  checkButton.disabled = false;
}

function setPrimaryXpLabel(label) {
  primaryXp.textContent = label;
  primaryXp.dataset.label = label;
}

function showStandardSuccess() {
  successToast.classList.remove('is-visible');
  void successToast.offsetWidth;
  successToast.classList.add('is-visible');
}

function syncPotentialHoops() {
  progressHoops.forEach((hoop) => hoop.classList.remove('is-potential'));

  const successesNeeded = Math.max(0, roundGoalSolveCount - firstTrySolveCount);
  let potentialCount = 0;

  problemResults.forEach((result, index) => {
    if (result === null && potentialCount < successesNeeded) {
      progressHoops[index].classList.add('is-potential');
      potentialCount += 1;
    }
  });
}

function clearProgressResults() {
  progressHoops.forEach((hoop) => hoop.classList.remove('is-potential'));
  scoringClasses.forEach((className) => progressTrack.classList.remove(className));
  lateCorrectClasses.forEach((className) => progressTrack.classList.remove(className));
  progressTrack.classList.remove('is-spare-ball-bonus');
  clearShotTarget();
}

function hasEarnedRoundGoal() {
  return firstTrySolveCount >= roundGoalSolveCount;
}

function hasFailedRound() {
  return problemResults.filter((result) => result === 'missed').length
    >= maxMissedProblems;
}

function hasSolvedEveryProblem() {
  return problemResults.every((result) => (
    result === 'first-try' || result === 'late-correct'
  ));
}

function finishCurrentProblem() {
  const wonRound = hasEarnedRoundGoal();
  const failedRound = hasFailedRound();
  const usedFinalAttempt = currentProblemIndex === problems.length - 1;

  roundComplete = wonRound || failedRound || usedFinalAttempt;
  if (roundComplete && !wonRound && !hasSolvedEveryProblem()) {
    clearProgressResults();
  }
  awaitingNextProblem = true;
  checkButton.disabled = false;
  checkButton.textContent = roundComplete
    ? 'Replay prototype'
    : 'Next problem';
}

function playCorrectAnswerReward(isFirstTry) {
  const completesRound = hasEarnedRoundGoal();
  const earnedSpareBallBonus = completesRound && currentProblemIndex === 1;
  const milestoneClass = isFirstTry
    ? scoringClasses[currentProblemIndex]
    : lateCorrectClasses[currentProblemIndex];

  clearReward();
  hideEpicFinale();
  successToast.classList.remove('is-visible');
  setPrimaryXpLabel(isFirstTry ? '+10 XP' : '+5 XP');
  checkButton.disabled = true;
  setShotTarget(false);

  progressTrack.classList.remove(milestoneClass);

  // Reflow allows the reward and progress timelines to replay in place.
  void rewardLayer.offsetWidth;
  void progressTrack.offsetWidth;
  rewardLayer.classList.add('is-playing');
  showStandardSuccess();

  progressTrack.classList.add(milestoneClass);

  rewardTimeout = window.setTimeout(() => {
    rewardLayer.classList.remove('is-playing');
    syncPotentialHoops();
    if (completesRound) {
      showEpicFinale(earnedSpareBallBonus);
    }
    finishCurrentProblem();
  }, firstRewardDurationMs);
}

function playWrongAnswerReward(isFinalAttempt) {
  clearReward();
  hideEpicFinale();
  successToast.classList.remove('is-visible');
  checkButton.disabled = true;
  setShotTarget(true, !isFinalAttempt);

  if (isFinalAttempt) {
    finalMissFadeTimeout = window.setTimeout(
      syncPotentialHoops,
      finalMissFadeDelayMs,
    );
  }
  void rewardLayer.offsetWidth;
  rewardLayer.classList.add('is-missed');

  rewardTimeout = window.setTimeout(() => {
    rewardLayer.classList.remove('is-missed');
    if (isFinalAttempt) {
      finishCurrentProblem();
    } else {
      checkButton.disabled = false;
      checkButton.textContent = 'Check answer';
      answerInput.focus();
      answerInput.select();
    }
  }, missedRewardDurationMs);
}

function playMilestoneIntro() {
  window.clearTimeout(potentialRevealTimeout);
  progressHoops.forEach((hoop) => hoop.classList.remove('is-potential'));
  progressTrack.classList.remove('is-entering');
  void progressTrack.offsetWidth;
  progressTrack.classList.add('is-entering');
  potentialRevealTimeout = window.setTimeout(syncPotentialHoops, potentialRevealDelayMs);
}

function loadProblem(index) {
  const problem = problems[index];
  currentProblemIndex = index;
  attemptCount = 0;
  awaitingNextProblem = false;
  answerInput.value = '';
  feedbackMessage.textContent = '';
  successToast.classList.remove('is-visible');
  hideEpicFinale();
  equation.setAttribute('aria-label', problem.ariaLabel);
  equationLeft.innerHTML = problem.left;
  equationRight.textContent = problem.right;
  scaffoldStepOne.textContent = problem.steps[0];
  scaffoldStepTwo.textContent = problem.steps[1];
  syncDifficultyMode();
  checkButton.disabled = false;
  checkButton.textContent = 'Check answer';
  answerInput.focus();

  if (index === 0) {
    playMilestoneIntro();
  }
}

function resetPrototype() {
  clearReward();
  window.clearTimeout(potentialRevealTimeout);
  firstTrySolveCount = 0;
  isScaffoldedMode = false;
  problemResults.fill(null);
  roundComplete = false;
  scoringClasses.forEach((className) => progressTrack.classList.remove(className));
  lateCorrectClasses.forEach((className) => progressTrack.classList.remove(className));
  setPrimaryXpLabel('+10 XP');
  loadProblem(0);
}

answerForm.addEventListener('submit', (event) => {
  event.preventDefault();

  if (awaitingNextProblem) {
    if (!roundComplete && currentProblemIndex < problems.length - 1) {
      loadProblem(currentProblemIndex + 1);
    } else {
      resetPrototype();
    }
    return;
  }

  if (checkButton.disabled) {
    return;
  }

  attemptCount += 1;
  const answer = Number(answerInput.value);
  const isCorrect = answerInput.value.trim() !== ''
    && answer === problems[currentProblemIndex].answer;

  if (!isCorrect) {
    const isFinalAttempt = attemptCount >= maxAttemptsPerProblem;
    const attemptsRemaining = maxAttemptsPerProblem - attemptCount;
    const missedProblemCount = problemResults.filter(
      (result) => result === 'missed',
    ).length;
    const endsRound = isFinalAttempt && (
      missedProblemCount + 1 >= maxMissedProblems
      || currentProblemIndex === problems.length - 1
    );
    successToast.classList.remove('is-visible');
    feedbackMessage.textContent = isFinalAttempt
      ? (endsRound
        ? 'Not quite—that ends this round.'
        : 'Not quite—move on to the next problem.')
      : `Not quite—${attemptsRemaining} ${attemptsRemaining === 1 ? 'attempt' : 'attempts'} left.`;
    if (isFinalAttempt) {
      problemResults[currentProblemIndex] = 'missed';
    }
    playWrongAnswerReward(isFinalAttempt);
    return;
  }

  feedbackMessage.textContent = '';
  const isFirstTry = attemptCount === 1;
  problemResults[currentProblemIndex] = isFirstTry ? 'first-try' : 'late-correct';
  if (isFirstTry) {
    firstTrySolveCount += 1;
  }
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    playCorrectAnswerReward(isFirstTry);
  } else {
    const milestoneClass = isFirstTry
      ? scoringClasses[currentProblemIndex]
      : lateCorrectClasses[currentProblemIndex];
    progressTrack.classList.add(milestoneClass);
    setPrimaryXpLabel(isFirstTry ? '+10 XP' : '+5 XP');
    showStandardSuccess();
    syncPotentialHoops();
    finishCurrentProblem();
  }
});

previewButton.addEventListener('click', () => {
  playCorrectAnswerReward(true);
});
resetButton.addEventListener('click', resetPrototype);
breakIntoStepsButton.addEventListener('click', enterScaffoldedMode);

document.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'r' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    resetPrototype();
  }
});

loadProblem(0);
