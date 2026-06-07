import { cosmosService } from './cosmosService';
import { StudyStreak } from '../types/study';

const DAY_MS = 86_400_000;

function ymd(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

// Monday (YYYY-MM-DD) of the week containing the given day.
function weekStart(ms: number): string {
  const d = new Date(ms);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // days since Monday
  return ymd(ms - diff * DAY_MS);
}

function defaultStreak(ownerRef: string, nowMs: number): StudyStreak {
  return {
    id: ownerRef,
    ownerRef,
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: '',
    freezesAvailable: 2,
    weeklyGoal: 5,
    weekStartDate: weekStart(nowMs),
    weekReviewCount: 0,
  };
}

// Pure streak transition for one study event "today". Forgiving by design:
// a one-day gap continues the streak, a longer gap spends a freeze if available,
// otherwise the streak resets to 1 (no shame). Exported for unit testing.
export function advanceStreak(prev: StudyStreak, nowMs: number): StudyStreak {
  const today = ymd(nowMs);
  const s: StudyStreak = { ...prev };

  // Weekly goal window: roll over to a new week if needed.
  const thisWeek = weekStart(nowMs);
  if (s.weekStartDate !== thisWeek) {
    s.weekStartDate = thisWeek;
    s.weekReviewCount = 0;
  }

  if (s.lastStudyDate === today) {
    // already counted today; only the weekly tally grows
    s.weekReviewCount += 1;
    return s;
  }

  if (!s.lastStudyDate) {
    s.currentStreak = 1;
  } else {
    const gapDays = Math.round((Date.parse(today) - Date.parse(s.lastStudyDate)) / DAY_MS);
    if (gapDays === 1) {
      s.currentStreak += 1;
    } else if (gapDays > 1) {
      if (s.freezesAvailable > 0) {
        s.freezesAvailable -= 1; // a freeze absorbs the missed day(s)
        s.currentStreak += 1;
      } else {
        s.currentStreak = 1; // gentle reset
      }
    }
  }

  s.lastStudyDate = today;
  s.weekReviewCount += 1;
  s.longestStreak = Math.max(s.longestStreak, s.currentStreak);
  return s;
}

class StudyStreakService {
  async getStreak(ownerRef: string, nowMs: number = Date.now()): Promise<StudyStreak> {
    const container = cosmosService.getContainer('studyStreaks');
    try {
      const { resource } = await container.item(ownerRef, ownerRef).read<StudyStreak>();
      if (resource) return resource;
    } catch {
      // not found
    }
    return defaultStreak(ownerRef, nowMs);
  }

  async recordStudy(ownerRef: string, nowMs: number = Date.now()): Promise<StudyStreak> {
    const prev = await this.getStreak(ownerRef, nowMs);
    const next = advanceStreak(prev, nowMs);
    const container = cosmosService.getContainer('studyStreaks');
    await container.items.upsert(next);
    return next;
  }
}

export const studyStreakService = new StudyStreakService();
