/**
 * PoRP Layer 4 - Advanced Reputation Service
 * 
 * This service manages dynamic reputation scoring, streaks, achievements,
 * and advanced anti-cheat mechanisms for the PoRP ecosystem.
 */

class AdvancedReputationService {
  constructor() {
    this.scoringWeights = {
      // Reading quality factors
      timeOnPage: { weight: 0.3, optimal: 300, max: 1800 }, // 5 min optimal, 30 min max
      scrollEngagement: { weight: 0.2, optimal: 50, max: 200 }, // scroll events
      interactionEvents: { weight: 0.15, optimal: 20, max: 100 }, // clicks, highlights
      entropyScore: { weight: 0.25, optimal: 0.7, max: 1.0 }, // behavioral entropy
      comprehensionScore: { weight: 0.1, optimal: 0.8, max: 1.0 }, // challenge accuracy
      
      // Streak bonuses
      dailyStreak: { multiplier: 1.0, maxBonus: 2.0 }, // up to 2x multiplier
      weeklyStreak: { multiplier: 0.5, maxBonus: 1.5 }, // up to 1.5x multiplier
      monthlyStreak: { multiplier: 0.3, maxBonus: 1.2 }, // up to 1.2x multiplier
    };

    this.achievementThresholds = {
      firstRead: { points: 10, description: "First chapter read" },
      streak7: { points: 50, description: "7-day reading streak" },
      streak30: { points: 200, description: "30-day reading streak" },
      speedReader: { points: 100, description: "Read 10 chapters in one day" },
      scholar: { points: 500, description: "Complete 100 challenges with 80%+ accuracy" },
      master: { points: 1000, description: "Reach Master reputation tier" },
      dedicated: { points: 300, description: "Read for 100 total hours" },
      explorer: { points: 150, description: "Read 50 different novels" }
    };

    this.decayRates = {
      daily: 0.98, // 2% decay per day inactive
      weekly: 0.9, // 10% decay per week inactive
      monthly: 0.7 // 30% decay per month inactive
    };
  }

  /**
   * Calculate dynamic reputation score based on reading quality
   */
  async calculateDynamicScore(sessionData, userHistory = {}) {
    try {
      console.log('[AdvancedReputation] Calculating dynamic score for session:', sessionData.sessionId);
      
      let baseScore = 0;
      const factors = {};

      // Time on page scoring
      const timeScore = this.calculateTimeScore(sessionData.timeOnPage);
      factors.timeOnPage = timeScore;
      baseScore += timeScore.score * this.scoringWeights.timeOnPage.weight;

      // Scroll engagement scoring
      const scrollScore = this.calculateScrollScore(sessionData.scrollEvents);
      factors.scrollEngagement = scrollScore;
      baseScore += scrollScore.score * this.scoringWeights.scrollEngagement.weight;

      // Interaction events scoring
      const interactionScore = this.calculateInteractionScore(sessionData.interactionEvents);
      factors.interactionEvents = interactionScore;
      baseScore += interactionScore.score * this.scoringWeights.interactionEvents.weight;

      // Entropy scoring
      const entropyScore = this.calculateEntropyScore(sessionData.entropyScore);
      factors.entropyScore = entropyScore;
      baseScore += entropyScore.score * this.scoringWeights.entropyScore.weight;

      // Comprehension scoring (if available)
      if (sessionData.comprehensionScore) {
        const comprehensionScore = this.calculateComprehensionScore(sessionData.comprehensionScore);
        factors.comprehensionScore = comprehensionScore;
        baseScore += comprehensionScore.score * this.scoringWeights.comprehensionScore.weight;
      }

      // Apply streak bonuses
      const streakBonus = await this.calculateStreakBonus(userHistory);
      factors.streakBonus = streakBonus;
      baseScore *= streakBonus.multiplier;

      // Apply anti-cheat penalties
      const cheatPenalty = this.detectCheating(sessionData, userHistory);
      factors.cheatPenalty = cheatPenalty;
      baseScore *= (1 - cheatPenalty.penalty);

      // Ensure minimum score
      baseScore = Math.max(baseScore, 1);

      const result = {
        baseScore: Math.round(baseScore),
        factors,
        breakdown: this.generateScoreBreakdown(factors),
        qualityRating: this.getQualityRating(baseScore)
      };

      console.log('[AdvancedReputation] Dynamic score calculated:', result);
      return result;

    } catch (error) {
      console.error('[AdvancedReputation] Error calculating dynamic score:', error);
      return { baseScore: 10, factors: {}, breakdown: [], qualityRating: 'C' };
    }
  }

  /**
   * Calculate streak bonuses for consecutive reading
   */
  async calculateStreakBonus(userHistory) {
    try {
      const now = new Date();
      const today = now.toDateString();
      
      // Get user's reading history
      const readingDays = userHistory.readingDays || [];
      const lastReadDate = userHistory.lastReadDate ? new Date(userHistory.lastReadDate) : null;

      // Calculate daily streak
      let dailyStreak = 0;
      if (lastReadDate) {
        const daysDiff = Math.floor((now - lastReadDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 0) {
          // Read today, continue streak
          dailyStreak = readingDays.length;
        } else if (daysDiff === 1) {
          // Read yesterday, start new streak
          dailyStreak = 1;
        } else {
          // Streak broken
          dailyStreak = 0;
        }
      }

      // Calculate weekly and monthly streaks
      const weeklyStreak = Math.floor(dailyStreak / 7);
      const monthlyStreak = Math.floor(dailyStreak / 30);

      // Calculate multipliers
      const dailyMultiplier = Math.min(
        dailyStreak * this.scoringWeights.dailyStreak.multiplier,
        this.scoringWeights.dailyStreak.maxBonus
      );
      
      const weeklyMultiplier = Math.min(
        weeklyStreak * this.scoringWeights.weeklyStreak.multiplier,
        this.scoringWeights.weeklyStreak.maxBonus
      );
      
      const monthlyMultiplier = Math.min(
        monthlyStreak * this.scoringWeights.monthlyStreak.multiplier,
        this.scoringWeights.monthlyStreak.maxBonus
      );

      const totalMultiplier = 1 + dailyMultiplier + weeklyMultiplier + monthlyMultiplier;

      return {
        dailyStreak,
        weeklyStreak,
        monthlyStreak,
        multiplier: totalMultiplier,
        breakdown: {
          daily: dailyMultiplier,
          weekly: weeklyMultiplier,
          monthly: monthlyMultiplier
        }
      };

    } catch (error) {
      console.error('[AdvancedReputation] Error calculating streak bonus:', error);
      return { dailyStreak: 0, weeklyStreak: 0, monthlyStreak: 0, multiplier: 1 };
    }
  }

  /**
   * Apply reputation decay for inactive users
   */
  async applyReputationDecay(userReputation, lastActivityDate) {
    try {
      if (!lastActivityDate) return userReputation;

      const now = new Date();
      const lastActivity = new Date(lastActivityDate);
      const daysInactive = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));

      if (daysInactive < 1) return userReputation; // No decay for active users

      let decayMultiplier = 1;

      // Apply decay based on inactivity duration
      if (daysInactive >= 30) {
        decayMultiplier *= this.decayRates.monthly;
      } else if (daysInactive >= 7) {
        decayMultiplier *= this.decayRates.weekly;
      } else {
        decayMultiplier *= Math.pow(this.decayRates.daily, daysInactive);
      }

      const newScore = Math.floor(userReputation.score * decayMultiplier);
      const decayAmount = userReputation.score - newScore;

      console.log('[AdvancedReputation] Applied decay:', {
        daysInactive,
        originalScore: userReputation.score,
        newScore,
        decayAmount,
        multiplier: decayMultiplier
      });

      return {
        ...userReputation,
        score: newScore,
        lastDecayApplied: now.toISOString(),
        decayHistory: [...(userReputation.decayHistory || []), {
          date: now.toISOString(),
          daysInactive,
          decayAmount,
          remainingScore: newScore
        }]
      };

    } catch (error) {
      console.error('[AdvancedReputation] Error applying reputation decay:', error);
      return userReputation;
    }
  }

  /**
   * Check and award achievements
   */
  async checkAchievements(userStats, sessionResult) {
    try {
      const newAchievements = [];
      const userAchievements = userStats.achievements || [];

      for (const [achievementId, achievement] of Object.entries(this.achievementThresholds)) {
        if (userAchievements.includes(achievementId)) continue; // Already earned

        const earned = await this.evaluateAchievement(achievementId, achievement, userStats, sessionResult);
        if (earned) {
          newAchievements.push({
            id: achievementId,
            ...achievement,
            earnedAt: new Date().toISOString(),
            pointsAwarded: achievement.points
          });
        }
      }

      return newAchievements;

    } catch (error) {
      console.error('[AdvancedReputation] Error checking achievements:', error);
      return [];
    }
  }

  /**
   * Adaptive difficulty for comprehension challenges
   */
  async getAdaptiveDifficulty(userHistory, recentPerformance) {
    try {
      const baseDifficulty = 0.5; // Medium difficulty
      let adjustment = 0;

      // Adjust based on recent performance
      if (recentPerformance && recentPerformance.length >= 3) {
        const avgScore = recentPerformance.slice(-3).reduce((sum, p) => sum + p.score, 0) / 3;
        
        if (avgScore > 0.85) {
          adjustment += 0.2; // Increase difficulty
        } else if (avgScore < 0.6) {
          adjustment -= 0.2; // Decrease difficulty
        }
      }

      // Adjust based on user's reputation tier
      const reputationScore = userHistory.reputationScore || 0;
      if (reputationScore > 1000) {
        adjustment += 0.15; // Master tier gets harder questions
      } else if (reputationScore < 100) {
        adjustment -= 0.15; // Seed tier gets easier questions
      }

      // Ensure difficulty stays within bounds
      const adaptiveDifficulty = Math.max(0.1, Math.min(0.9, baseDifficulty + adjustment));

      console.log('[AdvancedReputation] Adaptive difficulty calculated:', {
        baseDifficulty,
        adjustment,
        finalDifficulty: adaptiveDifficulty,
        reputationScore
      });

      return {
        difficulty: adaptiveDifficulty,
        questionComplexity: this.getQuestionComplexity(adaptiveDifficulty),
        timeLimit: this.getAdaptiveTimeLimit(adaptiveDifficulty),
        hintLevel: this.getHintLevel(adaptiveDifficulty)
      };

    } catch (error) {
      console.error('[AdvancedReputation] Error calculating adaptive difficulty:', error);
      return { difficulty: 0.5, questionComplexity: 'medium', timeLimit: 60, hintLevel: 1 };
    }
  }

  // Private helper methods

  calculateTimeScore(timeOnPage) {
    const optimal = this.scoringWeights.timeOnPage.optimal;
    const max = this.scoringWeights.timeOnPage.max;
    
    if (timeOnPage < optimal) {
      // Under optimal time - scale linearly
      return { score: (timeOnPage / optimal) * 100, rating: 'Below Optimal' };
    } else if (timeOnPage <= max) {
      // Within optimal range - full score
      return { score: 100, rating: 'Optimal' };
    } else {
      // Over max time - diminishing returns
      const excess = timeOnPage - max;
      const penalty = Math.min(excess / max, 0.5); // Max 50% penalty
      return { score: 100 * (1 - penalty), rating: 'Diminishing Returns' };
    }
  }

  calculateScrollScore(scrollEvents) {
    const optimal = this.scoringWeights.scrollEngagement.optimal;
    const max = this.scoringWeights.scrollEngagement.max;
    
    if (scrollEvents < optimal) {
      return { score: (scrollEvents / optimal) * 100, rating: 'Low Engagement' };
    } else if (scrollEvents <= max) {
      return { score: 100, rating: 'Good Engagement' };
    } else {
      // Too many scrolls might indicate bot behavior
      const excess = scrollEvents - max;
      const penalty = Math.min(excess / max, 0.3);
      return { score: 100 * (1 - penalty), rating: 'Excessive Scrolling' };
    }
  }

  calculateInteractionScore(interactionEvents) {
    const optimal = this.scoringWeights.interactionEvents.optimal;
    const max = this.scoringWeights.interactionEvents.max;
    
    if (interactionEvents < optimal) {
      return { score: (interactionEvents / optimal) * 100, rating: 'Low Interaction' };
    } else if (interactionEvents <= max) {
      return { score: 100, rating: 'Good Interaction' };
    } else {
      return { score: 100, rating: 'High Interaction' };
    }
  }

  calculateEntropyScore(entropyScore) {
    const optimal = this.scoringWeights.entropyScore.optimal;
    const max = this.scoringWeights.entropyScore.max;
    
    if (entropyScore < optimal) {
      return { score: (entropyScore / optimal) * 100, rating: 'Low Entropy' };
    } else {
      return { score: 100, rating: 'Good Entropy' };
    }
  }

  calculateComprehensionScore(comprehensionScore) {
    if (comprehensionScore >= 0.9) {
      return { score: 100, rating: 'Excellent' };
    } else if (comprehensionScore >= 0.8) {
      return { score: 85, rating: 'Good' };
    } else if (comprehensionScore >= 0.6) {
      return { score: 70, rating: 'Fair' };
    } else {
      return { score: 50, rating: 'Poor' };
    }
  }

  detectCheating(sessionData, userHistory) {
    let penalty = 0;
    const reasons = [];

    // Check for impossible reading speeds
    if (sessionData.timeOnPage < 10000 && sessionData.wordsRead > 500) {
      penalty += 0.5;
      reasons.push('Impossible reading speed detected');
    }

    // Check for repetitive patterns
    if (sessionData.scrollEvents > 500) {
      penalty += 0.3;
      reasons.push('Excessive scrolling behavior');
    }

    // Check for session timing anomalies
    if (sessionData.entropyScore < 0.3) {
      penalty += 0.4;
      reasons.push('Low behavioral entropy');
    }

    // Check for rapid session completion
    const avgSessionTime = userHistory.avgSessionTime || 300000; // 5 minutes default
    if (sessionData.timeOnPage < avgSessionTime * 0.2) {
      penalty += 0.2;
      reasons.push('Unusually fast session completion');
    }

    return { penalty: Math.min(penalty, 0.8), reasons };
  }

  getQualityRating(baseScore) {
    if (baseScore >= 90) return 'S';
    if (baseScore >= 80) return 'A';
    if (baseScore >= 70) return 'B';
    if (baseScore >= 60) return 'C';
    if (baseScore >= 50) return 'D';
    return 'F';
  }

  generateScoreBreakdown(factors) {
    return Object.entries(factors).map(([key, value]) => ({
      factor: key,
      score: value.score || 0,
      rating: value.rating || 'N/A',
      weight: this.scoringWeights[key]?.weight || 0
    }));
  }

  async evaluateAchievement(achievementId, achievement, userStats, sessionResult) {
    switch (achievementId) {
      case 'firstRead':
        return userStats.totalChaptersRead === 1;
      
      case 'streak7':
        return userStats.currentStreak >= 7;
      
      case 'streak30':
        return userStats.currentStreak >= 30;
      
      case 'speedReader':
        return userStats.chaptersReadToday >= 10;
      
      case 'scholar':
        return userStats.totalChallengesCompleted >= 100 && 
               userStats.averageComprehensionScore >= 0.8;
      
      case 'master':
        return userStats.reputationScore >= 1000;
      
      case 'dedicated':
        return userStats.totalReadingTime >= 360000000; // 100 hours in ms
      
      case 'explorer':
        return userStats.uniqueNovelsRead >= 50;
      
      default:
        return false;
    }
  }

  getQuestionComplexity(difficulty) {
    if (difficulty < 0.3) return 'basic';
    if (difficulty < 0.6) return 'intermediate';
    if (difficulty < 0.8) return 'advanced';
    return 'expert';
  }

  getAdaptiveTimeLimit(difficulty) {
    if (difficulty < 0.3) return 90; // More time for easier questions
    if (difficulty < 0.6) return 60;
    if (difficulty < 0.8) return 45;
    return 30; // Less time for harder questions
  }

  getHintLevel(difficulty) {
    if (difficulty < 0.3) return 3; // More hints for easier questions
    if (difficulty < 0.6) return 2;
    if (difficulty < 0.8) return 1;
    return 0; // No hints for expert questions
  }
}

export default AdvancedReputationService;
