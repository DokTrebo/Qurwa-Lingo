document.addEventListener('DOMContentLoaded', () => {
    // Odkazy na DOM elementy z index.html
    const els = {
        lessonTitle: document.getElementById('lesson-title'),
        progressText: document.getElementById('progress-text'),
        livesCount: document.getElementById('lives-count'),
        scoreCount: document.getElementById('score-count'),

        quizContainer: document.getElementById('quiz-container'),
        taskFlashcard: document.getElementById('task-flashcard'),
        fcOriginal: document.getElementById('fc-original'),
        btnFcReveal: document.getElementById('btn-fc-reveal'),
        fcBack: document.getElementById('fc-back'),
        fcTranslation: document.getElementById('fc-translation'),
        fcContext: document.getElementById('fc-context'),
        btnFcNext: document.getElementById('btn-fc-next'),

        taskMcq: document.getElementById('task-mcq'),
        mcqOriginal: document.getElementById('mcq-original'),
        mcqOptions: document.getElementById('mcq-options'),

        taskCloze: document.getElementById('task-cloze'),
        clozeHint: document.getElementById('cloze-hint'),
        clozeSentence: document.getElementById('cloze-sentence'),
        clozeForm: document.getElementById('cloze-form'),
        clozeInput: document.getElementById('cloze-input'),
        btnClozeSubmit: document.getElementById('btn-cloze-submit'),

        feedbackBox: document.getElementById('feedback-box'),
        feedbackStatus: document.getElementById('feedback-status'),
        feedbackExplanation: document.getElementById('feedback-explanation'),
        btnNextCard: document.getElementById('btn-next-card'),

        summaryScreen: document.getElementById('summary-screen'),
        summaryHeading: document.getElementById('summary-heading'),
        summaryScore: document.getElementById('summary-score'),
        summaryAccuracy: document.getElementById('summary-accuracy'),
        summaryXp: document.getElementById('summary-xp'),
        btnRestart: document.getElementById('btn-restart')
    };

    /**
     * Aktualizuje horní stavovou lištu
     */
    function updateHeader(state) {
        els.lessonTitle.textContent = state.lessonTitle;
        els.progressText.textContent = `${state.currentStep} / ${state.totalSteps}`;
        els.livesCount.textContent = state.lives;
        els.scoreCount.textContent = state.score;
    }

    /**
     * Skryje všechny sekce úloh a zpětné vazby
     */
    function hideAllSections() {
        els.taskFlashcard.hidden = true;
        els.taskMcq.hidden = true;
        els.taskCloze.hidden = true;
        els.feedbackBox.hidden = true;
        els.summaryScreen.hidden = true;
    }

    /**
     * Vykreslí aktuální kartu nebo finální obrazovku
     */
    function renderCurrentScreen() {
        const state = QuizEngine.getState();
        updateHeader(state);
        hideAllSections();

        if (state.isFinished) {
            els.quizContainer.hidden = true;
            els.summaryScreen.hidden = false;
            els.summaryHeading.textContent = state.lives > 0
                ? 'Lekce dokončena!'
                : 'Došly ti životy! Zkus to znovu.';
            els.summaryScore.textContent = `${state.score} / ${state.totalTestTasks}`;
            els.summaryAccuracy.textContent = `${state.accuracy} %`;
            els.summaryXp.textContent = `+${state.xpEarned} XP`;
            return;
        }

        els.quizContainer.hidden = false;
        const task = QuizEngine.getCurrentTask();

        if (task.type === 'flashcard') {
            els.taskFlashcard.hidden = false;
            els.fcOriginal.textContent = task.term.sk;
            els.fcTranslation.textContent = task.term.cz;
            els.fcContext.textContent = task.term.context;
            els.fcBack.hidden = true;
            els.btnFcReveal.hidden = false;
        } else if (task.type === 'mcq') {
            els.taskMcq.hidden = false;
            els.mcqOriginal.textContent = task.term.sk;
            els.mcqOptions.innerHTML = '';

            task.options.forEach(optionText => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = optionText;
                btn.style.display = 'block';
                btn.style.margin = '6px 0';
                btn.addEventListener('click', () => handleAnswerSubmit(optionText));
                els.mcqOptions.appendChild(btn);
            });
        } else if (task.type === 'cloze') {
            els.taskCloze.hidden = false;
            els.clozeHint.textContent = task.term.cz;
            els.clozeSentence.textContent = task.maskedSentence;
            els.clozeInput.value = '';
            els.clozeInput.disabled = false;
            els.btnClozeSubmit.disabled = false;
            els.clozeInput.focus();
        }
    }

    /**
     * Zpracuje odpověď z MCQ nebo Cloze a zobrazí zpětnou vazbu
     */
    function handleAnswerSubmit(answer) {
        const result = QuizEngine.checkAnswer(answer);
        if (!result) return;

        // Zablokuje další klikání během zobrazení zpětné vazby
        Array.from(els.mcqOptions.querySelectorAll('button')).forEach(b => b.disabled = true);
        els.clozeInput.disabled = true;
        els.btnClozeSubmit.disabled = true;

        updateHeader(QuizEngine.getState());

        els.feedbackBox.hidden = false;
        els.feedbackStatus.textContent = result.isCorrect
            ? 'Správně!'
            : `Špatně! Správná odpověď: ${result.expected}`;
        els.feedbackExplanation.textContent = `Příklad použití: „${result.context}“`;
        els.btnNextCard.focus();
    }

    // --- UDÁLOSTI TLAČÍTEK ---

    // Flashcard: Odhalení překladu a kontextu
    els.btnFcReveal.addEventListener('click', () => {
        els.btnFcReveal.hidden = true;
        els.fcBack.hidden = false;
    });

    // Flashcard: Posun na další kartu
    els.btnFcNext.addEventListener('click', () => {
        QuizEngine.nextCard();
        renderCurrentScreen();
    });

    // Cloze: Odeslání formuláře
    els.clozeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleAnswerSubmit(els.clozeInput.value);
    });

    // Zpětná vazba: Pokračovat na další úlohu
    els.btnNextCard.addEventListener('click', () => {
        QuizEngine.nextCard();
        renderCurrentScreen();
    });

    // Souhrn: Restartovat lekci
    els.btnRestart.addEventListener('click', () => {
        QuizEngine.reset();
        renderCurrentScreen();
    });

    // --- SPUŠTĚNÍ APLIKACE ---
    QuizEngine.loadLesson('./assets/data/lesson_1.json')
        .then(() => renderCurrentScreen())
        .catch(err => {
            els.lessonTitle.textContent = 'Chyba při načítání lekce';
            console.error(err);
        });
});
