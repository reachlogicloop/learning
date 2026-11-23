
/*
  MY LEARNING CENTER
  Shared progress tracking for Math and Reading
  Storage: Browser LocalStorage
*/

const MLCProgress = {

    STORAGE_KEY: "mlc_student_progress_v1",

    // Read all saved progress
    getAll() {
        try {
            return JSON.parse(
                localStorage.getItem(this.STORAGE_KEY)
            ) || { math: {}, reading: {} };
        } catch (error) {
            return { math: {}, reading: {} };
        }
    },

    // Save all progress
    saveAll(data) {
        localStorage.setItem(
            this.STORAGE_KEY,
            JSON.stringify(data)
        );
    },

    // Save or update an individual lesson
    saveLesson(moduleName, lessonId, updates) {

        const data = this.getAll();

        if (!data[moduleName]) {
            data[moduleName] = {};
        }

        const existing = data[moduleName][lessonId] || {};

        data[moduleName][lessonId] = {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        this.saveAll(data);

        return data[moduleName][lessonId];
    },

    // Get an individual lesson
    getLesson(moduleName, lessonId) {

        const data = this.getAll();

        return data[moduleName]?.[lessonId] || {
            status: "Not Started",
            score: null,
            total: null,
            stars: 0,
            timeSeconds: 0
        };
    },

    // Calculate stars based on quiz percentage
    calculateStars(score, total) {

        if (!total || score === null || score === undefined) {
            return 0;
        }

        const percentage = (score / total) * 100;

        if (percentage >= 90) return 5;
        if (percentage >= 80) return 4;
        if (percentage >= 70) return 3;
        if (percentage >= 60) return 2;
        if (percentage > 0) return 1;

        return 0;
    },

    // Mark lesson as started
    startLesson(moduleName, lessonId) {

        this.saveLesson(moduleName, lessonId, {
            status: "In Progress"
        });

        this._timers = this._timers || {};

        if (!this._timers[`${moduleName}_${lessonId}`]) {
            this._timers[`${moduleName}_${lessonId}`] = Date.now();
        }
    },

    // Save quiz score
    saveScore(moduleName, lessonId, score, total) {

        const stars = this.calculateStars(score, total);

        this.saveLesson(moduleName, lessonId, {
            score: score,
            total: total,
            stars: stars
        });

        return stars;
    },

    // Stop timer and add elapsed time
    stopTimer(moduleName, lessonId) {

        const key = `${moduleName}_${lessonId}`;

        this._timers = this._timers || {};

        const startTime = this._timers[key];

        if (!startTime) return 0;

        const elapsed = Math.max(
            0,
            Math.round((Date.now() - startTime) / 1000)
        );

        const lesson = this.getLesson(moduleName, lessonId);

        this.saveLesson(moduleName, lessonId, {
            timeSeconds: (lesson.timeSeconds || 0) + elapsed
        });

        delete this._timers[key];

        return elapsed;
    },

    // Mark lesson completed
    completeLesson(moduleName, lessonId) {

        this.stopTimer(moduleName, lessonId);

        this.saveLesson(moduleName, lessonId, {
            status: "Completed"
        });
    },

    // Get summary for a module
    getModuleSummary(moduleName) {

        const data = this.getAll();
        const lessons = Object.values(data[moduleName] || {});

        return {
            totalLessons: lessons.length,

            completed: lessons.filter(
                l => l.status === "Completed"
            ).length,

            inProgress: lessons.filter(
                l => l.status === "In Progress"
            ).length,

            totalTimeSeconds: lessons.reduce(
                (sum, l) => sum + (l.timeSeconds || 0), 0
            ),

            averageScore: (() => {
                const scored = lessons.filter(
                    l => l.score !== null &&
                         l.score !== undefined &&
                         l.total > 0
                );

                if (!scored.length) return null;

                const totalPercentage = scored.reduce(
                    (sum, l) => sum + (l.score / l.total * 100), 0
                );

                return Math.round(totalPercentage / scored.length);
            })()
        };
    },

    // Get all module summaries
    getDashboard() {

        return {
            math: this.getModuleSummary("math"),
            reading: this.getModuleSummary("reading")
        };
    },

    // Format seconds as hours/minutes
    formatTime(seconds) {

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }

        return `${minutes}m`;
    }
};
