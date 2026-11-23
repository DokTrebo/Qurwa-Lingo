const QuizEngine = (() => {
    // Vnitřní stav aktuální lekce
    let state = {
        lessonId: null,
        lessonTitle: '',
        terms: [],
        queue: [],          // Fronta úloh (každý výraz projde fázemi učení)
        currentIndex: 0,
        score: 0,
        lives: 5,
        totalTestTasks: 0,
        isFinished: false
    };

    // Pomocná funkce: Fisher-Yates shuffle pro náhodné zamíchání pole
    function shuffleArray(array) {
        const copy = [...array];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    //Načte JSON soubor lekce a sestaví frontu úloh
    async function loadLesson(jsonPath) {
        const response = await fetch(jsonPath);
        if (!response.ok) {
            throw new Error(`Nepodařilo se načíst lekci: ${response.status}`);
        }
        const data = await response.json();

        state.lessonId = data.lesson_id;
        state.lessonTitle = data.lesson_title;
        state.terms = data.terms || [];
        reset();
        return getState();
    }

    // Resetuje stav lekce a vygeneruje posloupnost úloh (Flashcard -> MCQ -> Cloze)
    function reset() {
        state.currentIndex = 0;
        state.score = 0;
        state.lives = 5;
        state.isFinished = false;

        // Sestavení fronty úloh:
        // 1. Fáze: Seznámení s výrazy (Flashcard)
        const flashcards = state.terms.map(term => ({ type: 'flashcard', term }));
        // 2. Fáze: Výběr ze 4 možností (zamíchané)
        const mcqs = shuffleArray(state.terms).map(term => ({ type: 'mcq', term }));
        // 3. Fáze: Doplňování chybějícího slova do věty (zamíchané)
        const clozes = shuffleArray(state.terms)
            .filter(term => term.context && term.hidden)
            .map(term => ({ type: 'cloze', term }));

        state.queue = [...flashcards, ...mcqs, ...clozes];
        state.totalTestTasks = mcqs.length + clozes.length;
    }

    //Vrátí aktuální úlohu včetně připravených dat (např. 4 možností nebo věty s podtržítky)
    function getCurrentTask() {
        if (state.isFinished || state.currentIndex >= state.queue.length) {
            return null;
        }

        const task = state.queue[state.currentIndex];
        const term = task.term;

        if (task.type === 'mcq') {
            // Vylosuje 3 nesprávné překlady z ostatních výrazů v lekci
            const distractors = shuffleArray(
                state.terms.filter(t => t.id !== term.id).map(t => t.cz)
            ).slice(0, 3);

            return {
                type: 'mcq',
                term,
                options: shuffleArray([term.cz, ...distractors])
            };
        }

        if (task.type === 'cloze') {
            // Nahradí hledaný výraz v kontextové větě podtržítky
            const maskedSentence = term.context.replace(term.hidden, '__________');
            return {
                type: 'cloze',
                term,
                maskedSentence
            };
        }

        return {
            type: 'flashcard',
            term
        };
    }

    // Vyhodnotí odpověď uživatele pro MCQ a Cloze úlohy
    function checkAnswer(userAnswer) {
        const task = state.queue[state.currentIndex];
        if (!task || task.type === 'flashcard') return null;

        const normalize = (str) => String(str).trim().toLowerCase();
        const expected = task.type === 'mcq' ? task.term.cz : task.term.hidden;
        const isCorrect = normalize(userAnswer) === normalize(expected);

        if (isCorrect) {
            state.score += 1;
        } else {
            state.lives = Math.max(0, state.lives - 1);
        }

        return {
            isCorrect,
            expected,
            context: task.term.context,
            livesLeft: state.lives
        };
    }

    // Posune index na další kartu; pokud dojdou karty nebo životy, ukončí lekci
    function nextCard() {
        state.currentIndex += 1;

        if (state.lives <= 0 || state.currentIndex >= state.queue.length) {
            state.isFinished = true;
        }

        return getState();
    }

    //Vrátí aktuální statistiky a finální souhrn
    function getState() {
        const accuracy = state.totalTestTasks > 0
            ? Math.round((state.score / state.totalTestTasks) * 100)
            : 0;

        // Výpočet XP: 10 XP za každou správnou odpověď + bonus 20 XP za dokončení se životy
        const xpEarned = (state.score * 10) + (state.lives > 0 && state.isFinished ? 20 : 0);

        return {
            lessonTitle: state.lessonTitle,
            currentStep: Math.min(state.currentIndex + 1, state.queue.length),
            totalSteps: state.queue.length,
            score: state.score,
            totalTestTasks: state.totalTestTasks,
            lives: state.lives,
            accuracy,
            xpEarned,
            isFinished: state.isFinished
        };
    }

    return {
        loadLesson,
        reset,
        getCurrentTask,
        checkAnswer,
        nextCard,
        getState
    };
})();