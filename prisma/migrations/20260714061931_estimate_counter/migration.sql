-- CreateTable
CREATE TABLE "EstimateCounter" (
    "year" INTEGER NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstimateCounter_pkey" PRIMARY KEY ("year")
);
