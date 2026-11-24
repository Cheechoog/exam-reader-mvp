-- CreateTable
CREATE TABLE "AnswerKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "answersJson" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "answerKeyId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "score" REAL,
    "totalCorrect" INTEGER,
    "totalIncorrect" INTEGER,
    "totalBlank" INTEGER,
    "totalMultiple" INTEGER,
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Submission_answerKeyId_fkey" FOREIGN KEY ("answerKeyId") REFERENCES "AnswerKey" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DetectedAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "detectedOption" TEXT,
    "finalOption" TEXT,
    "status" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "metricsJson" JSONB NOT NULL,
    "isManualOverride" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "DetectedAnswer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DetectedAnswer_submissionId_questionNumber_key" ON "DetectedAnswer"("submissionId", "questionNumber");
